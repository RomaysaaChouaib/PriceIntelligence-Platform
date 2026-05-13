from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from celery.result import AsyncResult
from django.core.cache import cache
from django.db.models import Avg, Count, Min, Max
from django.utils import timezone
from django.contrib.auth import get_user_model, authenticate
from datetime import timedelta
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from .models import SearchHistory, Product, PriceRecord, AnalysisResult, PriceAlert
from .serializers import *

# Import des tâches Celery
from .tasks import (
    scrape_jumia_task, scrape_all_task, scrape_all_mouse_task,
    scrape_all_sac_task, scrape_all_laptop_stand_task,
    scrape_all_cooling_pad_task, scrape_all_usb_task
)

User = get_user_model()

# Mapping Catégorie -> Task Celery
CATEGORY_TASK_MAP = {
    'laptop': scrape_all_task,
    'souris': scrape_all_mouse_task,
    'sac': scrape_all_sac_task,
    'laptop_stand': scrape_all_laptop_stand_task,
    'cooling_pad': scrape_all_cooling_pad_task,
    'usb': scrape_all_usb_task,
}

# ================= AUTH =================
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """Endpoint /api/auth/me/ pour voir/modifier son profil"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

# ================= SCRAPING CONTROL =================
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_scraping(request):
    query = request.data.get('query', '').strip()
    category = request.data.get('category', 'laptop').lower()
    
    if not query:
        return Response({'error': 'Le champ "query" est requis'}, status=400)

    task_func = CATEGORY_TASK_MAP.get(category, scrape_jumia_task)
    
    search = SearchHistory.objects.create(
        user=request.user,
        query=query,
        category=category,
        status='running'
    )
    
    task = task_func.delay(query)
    search.task_id = task.id
    search.save()
    
    return Response({
        'message': 'Scraping démarré en arrière-plan',
        'task_id': task.id,
        'search_id': search.id,
        'category': category
    }, status=202)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_task_status(request, task_id):
    result = AsyncResult(task_id)
    search = SearchHistory.objects.filter(task_id=task_id, user=request.user).first()
    
    response_data = {'task_id': task_id, 'state': result.state}
    
    if result.ready():
        if result.successful():
            res = result.result
            response_data.update(res)
            if search:
                search.status = 'success' if res.get('status') == 'success' else 'stopped'
                search.total_results = res.get('inserted', 0)
                search.save()
        else:
            response_data['error'] = str(result.result)
            if search: search.status = 'error'
            if search: search.save()
            
    return Response(response_data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def stop_scraping(request):
    cache.set("STOP_SCRAPING", True, timeout=300)
    return Response({'message': 'Signal d\'arrêt envoyé. Les tâches en cours vont s\'interrompre.'})

# ================= HISTORY & PRODUCTS =================
class SearchHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = SearchHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SearchHistory.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        week_ago = timezone.now() - timedelta(days=7)
        recent = SearchHistory.objects.filter(
            user=request.user, created_at__gte=week_ago
        ).order_by('-created_at')[:15]
        return Response(self.get_serializer(recent, many=True).data)

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = Product.objects.all()
        category = self.request.query_params.get('category')
        platform = self.request.query_params.get('platform')
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if category: qs = qs.filter(category=category)
        if platform: qs = qs.filter(platform=platform)
        if min_price: qs = qs.filter(price_history__price__gte=min_price)
        if max_price: qs = qs.filter(price_history__price__lte=max_price)
        
        return qs.distinct()

# ================= DATA MINING & ANALYTICS =================
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def run_analytics(request):
    search_id = request.query_params.get('search_id')
    query = request.query_params.get('query')
    category = request.query_params.get('category')
    
    if search_id:
        try:
            search = SearchHistory.objects.get(id=search_id, user=request.user)
        except SearchHistory.DoesNotExist:
            return Response({'error': 'Recherche non trouvée'}, status=404)
    elif query:
        search, _ = SearchHistory.objects.get_or_create(
            user=request.user, query=query, category=category or 'laptop',
            defaults={'status': 'success'}
        )
    else:
        return Response({'error': 'search_id ou query requis'}, status=400)

    if hasattr(search, 'analysis'):
        return Response(AnalysisResultSerializer(search.analysis).data)

    prices_qs = PriceRecord.objects.filter(search_history=search).select_related('product')
    if not prices_qs.exists():
        return Response({'error': 'Aucune donnée disponible. Lancez un scraping d\'abord.'}, status=404)
        
    df = pd.DataFrame(list(prices_qs.values(
        'price', 'product__platform', 'rating', 'seller', 'product__title'
    )))
    df.rename(columns={'product__platform': 'platform', 'product__title': 'title'}, inplace=True)
    
    if df.empty or len(df) < 2:
        return Response({'error': 'Données insuffisantes pour l\'analyse'}, status=400)

    stats = {
        'min_price': float(df['price'].min()),
        'max_price': float(df['price'].max()),
        'mean_price': float(df['price'].mean()),
        'median_price': float(df['price'].median()),
        'std_price': float(df['price'].std()),
        'q1': float(df['price'].quantile(0.25)),
        'q3': float(df['price'].quantile(0.75)),
        'count': len(df)
    }
    
    clustering = {}
    if len(df) >= 3:
        X = df[['price']].values
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X_scaled)
        df['cluster'] = labels
        clustering = {
            'labels': labels.tolist(),
            'centers': [float(c[0]) for c in kmeans.cluster_centers_],
            'cluster_names': ['Économique', 'Intermédiaire', 'Premium']
        }
        
    anomalies = {}
    if len(df) >= 5:
        X = df[['price']].values
        iso = IsolationForest(contamination=0.05, random_state=42)
        preds = iso.fit_predict(X)
        anomalies = {
            'predictions': preds.tolist(),
            'anomaly_count': int(np.sum(preds == -1)),
            'flagged_indices': np.where(preds == -1)[0].tolist(),
            'flagged_products': df[preds == -1]['title'].tolist()
        }
        
    platform_dist = df.groupby('platform')['price'].agg(['count', 'mean', 'min', 'max']).to_dict('index')
    
    analysis, created = AnalysisResult.objects.update_or_create(
        search_history=search,
        defaults={
            'statistics': stats,
            'clustering': clustering,
            'anomalies': anomalies,
            'platform_distribution': platform_dist
        }
    )
    
    return Response(AnalysisResultSerializer(analysis).data)

# ================= ALERTS =================
class PriceAlertViewSet(viewsets.ModelViewSet):
    serializer_class = PriceAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PriceAlert.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# ================= AUTH FUNCTIONS (SIGNUP / LOGIN) =================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def signup(request):
    """Inscription d'un nouvel utilisateur"""
    print("📥 Requête signup reçue:", request.data)  # 🔍 DEBUG
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not username or not email or not password:
        return Response({'error': 'Tous les champs sont requis'}, status=status.HTTP_400_BAD_REQUEST)
    
    if password != confirm_password:
        return Response({'error': 'Les mots de passe ne correspondent pas'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(password) < 8:
        return Response({'error': 'Le mot de passe doit contenir au moins 8 caractères'}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Ce nom d\'utilisateur existe déjà'}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Cet email est déjà utilisé'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.create_user(username=username, email=email, password=password)
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Compte créé avec succès',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name or user.username  # ✅ AJOUTÉ pour le dashboard
            },
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    """Connexion d'un utilisateur"""
    print("📥 Requête login reçue:", request.data)  # 🔍 DEBUG
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response({'error': 'Identifiants incorrects'}, status=status.HTTP_401_UNAUTHORIZED)
    
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'message': 'Connexion réussie',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name or user.username  # ✅ AJOUTÉ
        },
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }
    }, status=status.HTTP_200_OK)
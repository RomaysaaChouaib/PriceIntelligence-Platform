from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import *
from . import views

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'history', SearchHistoryViewSet, basename='history')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'alerts', PriceAlertViewSet, basename='alert')

urlpatterns = [
    path('', include(router.urls)),
    
    # Auth
    # ⚠️ MODIFIÉ : Changé de path pour éviter le conflit avec views.login ci-dessous
    path('auth/login-jwt/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Scraping
    path('scrape/start/', start_scraping, name='start_scraping'),
    path('scrape/status/<str:task_id>/', get_task_status, name='task_status'),
    path('scrape/stop/', stop_scraping, name='stop_scraping'),
    
    # Data Mining
    path('analytics/', run_analytics, name='run_analytics'),

    # ✅ Ces routes seront maintenant correctement exécutées par Django
    path('auth/signup/', views.signup, name='signup'),
    path('auth/login/', views.login, name='login'),
]
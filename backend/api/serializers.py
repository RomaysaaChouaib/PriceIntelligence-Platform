from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import SearchHistory, Product, PriceRecord, AnalysisResult, PriceAlert

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Ajoute les infos utilisateur dans la réponse JWT"""
    def validate(self, attrs):
        data = super().validate(attrs)
        data.update({
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'email': self.user.email,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name,
            }
        })
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class PriceRecordSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    
    class Meta:
        model = PriceRecord
        fields = ['id', 'product_title', 'price', 'currency', 'seller', 'rating', 'url', 'scraped_at']

class ProductSerializer(serializers.ModelSerializer):
    latest_price = serializers.SerializerMethodField()
    platforms = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'title', 'category', 'platform', 'image_url', 'latest_price', 'platforms', 'price_range']
    
    def get_latest_price(self, obj):
        latest = obj.price_history.order_by('-scraped_at').first()
        return float(latest.price) if latest else None
    
    def get_platforms(self, obj):
        return list(obj.price_history.values_list('platform', flat=True).distinct())
    
    def get_price_range(self, obj):
        prices = obj.price_history.values_list('price', flat=True)
        if not prices:
            return {'min': 0, 'max': 0, 'avg': 0}
        return {
            'min': float(min(prices)),
            'max': float(max(prices)),
            'avg': float(sum(prices) / len(prices))
        }

class SearchHistorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    has_analysis = serializers.SerializerMethodField()
    
    class Meta:
        model = SearchHistory
        fields = ['id', 'query', 'category', 'status', 'task_id', 'total_results', 'product_count', 'has_analysis', 'created_at']
    
    def get_product_count(self, obj):
        return obj.prices.count() if hasattr(obj, 'prices') else 0
    
    def get_has_analysis(self, obj):
        return hasattr(obj, 'analysis')

class AnalysisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisResult
        fields = '__all__'

class PriceAlertSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    
    class Meta:
        model = PriceAlert
        fields = ['id', 'product', 'product_title', 'target_price', 'is_active', 'created_at', 'notified_at']
        read_only_fields = ['id', 'created_at', 'notified_at']
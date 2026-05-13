from django.contrib import admin
from .models import CustomUser, SearchHistory, Product, PriceRecord, AnalysisResult, PriceAlert

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'phone', 'date_joined']
    search_fields = ['username', 'email']

@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'query', 'category', 'status', 'total_results', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['query', 'user__username']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'platform', 'created_at']
    list_filter = ['category', 'platform']
    search_fields = ['title']

@admin.register(PriceRecord)
class PriceRecordAdmin(admin.ModelAdmin):
    # Remplacement de 'platform' par une méthode custom
    list_display = ['product', 'price', 'currency', 'get_platform', 'scraped_at']
    list_filter = ['currency', 'scraped_at']
    search_fields = ['product__title']

    @admin.display(description='Platform')
    def get_platform(self, obj):
        return obj.product.platform if obj.product else '-'

@admin.register(AnalysisResult)
class AnalysisResultAdmin(admin.ModelAdmin):
    list_display = ['search_history', 'created_at']
    readonly_fields = ['statistics', 'clustering', 'anomalies', 'platform_distribution']

@admin.register(PriceAlert)
class PriceAlertAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'target_price', 'is_active', 'notified_at']
    list_filter = ['is_active', 'notified_at']
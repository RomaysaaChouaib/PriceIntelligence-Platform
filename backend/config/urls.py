# backend/config/urls.py

from django.contrib import admin
from django.urls import path
from . import views
from api.views import CustomTokenObtainPairView, UserProfileView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/scrape/amazon/", views.scrap_amazon),
    path("api/scrape/jumia/", views.scrape_jumia),
    path("api/scrape/aliexpress/", views.scrap_aliexpress),
    path("api/scrape/All/", views.scrape_all),
    path("api/scrape/Stop/", views.stop_scraping_action),
    path('api/search/', views.search_view),
    # Accessoire :
    path('api/search/Accessoire/', views.search_accessoire_view),
    path('api/scrape/souris/', views.scrape_all_souris),
    path('api/scrape/laptop_stand/', views.scrape_all_laptop_stand),
    path('api/scrape/cooling_pad/', views.scrape_all_cooling_pad),
    path('api/scrape/sac_laptop/', views.scrape_all_sac),
    path('api/scrape/usb/', views.scrape_all_usb),

    # views for products, stats, clustering, anomalies, and association
    path('api/products/', views.products_view),
    path('api/stats/', views.stats_view),
    path('api/clustering/', views.clustering_view),
    path('api/anomalies/', views.anomalies_view),
    path('api/association/', views.association_view),
    path('api/auth/login/', CustomTokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/', UserProfileView.as_view()),
]
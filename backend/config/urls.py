# backend/config/urls.py

from django.contrib import admin
from django.urls import path
from .views import (
    scrap_aliexpress,
    scrap_amazon,
    scrape_jumia,
    scrape_all,
    search_view,
    products_view,
    stats_view,
    clustering_view,
    anomalies_view,
    association_view,
)
from api.views import CustomTokenObtainPairView, UserProfileView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/scrape/amazon/", scrap_amazon),
    path("api/scrape/jumia/", scrape_jumia),
    path("api/scrape/aliexpress/", scrap_aliexpress),
    path("api/scrape/All/", scrape_all),
    path('api/search/', search_view),
    path('api/products/', products_view),
    path('api/stats/', stats_view),
    path('api/clustering/', clustering_view),
    path('api/anomalies/', anomalies_view),
    path('api/association/', association_view),
    path('api/auth/login/', CustomTokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/', UserProfileView.as_view()),
]
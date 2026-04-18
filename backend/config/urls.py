# backend/config/urls.py

from django.contrib import admin
from django.urls import path
from .views import (
    search_view,
    products_view,
    stats_view,
    clustering_view,
    anomalies_view,
    association_view,
)

urlpatterns = [
    path('admin/',            admin.site.urls),
    path('api/search/',       search_view),
    path('api/products/',     products_view),
    path('api/stats/',        stats_view),
    path('api/clustering/',   clustering_view),
    path('api/anomalies/',    anomalies_view),
    path('api/association/',  association_view),
]

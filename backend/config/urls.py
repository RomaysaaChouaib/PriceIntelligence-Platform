# backend/config/urls.py  — Fichier de routage principal Django
from django.contrib import admin
from django.urls import path, include
from config.views import (
    scrape_jumia, scrap_amazon, scrap_aliexpress, scrape_all,
    stop_scraping_action, check_status,
    search_view, search_accessoire_view,
    products_view, stats_view,
    clustering_view, anomalies_view,
    association_view, association_accessories_view,
    pca_view, export_csv_view, search_history_view,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── Scraping ──────────────────────────────────────────────────────────
    path('api/scrape/jumia/',      scrape_jumia,          name='scrape_jumia'),
    path('api/scrape/amazon/',     scrap_amazon,          name='scrape_amazon'),
    path('api/scrape/aliexpress/', scrap_aliexpress,      name='scrape_aliexpress'),
    path('api/scrape/all/',        scrape_all,            name='scrape_all'),
    path('api/scrape/stop/',       stop_scraping_action,  name='stop_scraping'),
    path('api/status/<str:task_id>/', check_status,       name='check_status'),

    # ── Produits & Recherche ──────────────────────────────────────────────
    path('api/products/',           products_view,          name='products'),
    path('api/search/',             search_view,            name='search'),
    path('api/search/Accessoire/', search_accessoire_view, name='search_accessories'),

    # ── Data Mining ───────────────────────────────────────────────────────
    path('api/stats/',                       stats_view,                    name='stats'),
    path('api/clustering/',                  clustering_view,               name='clustering'),
    path('api/anomalies/',                   anomalies_view,                name='anomalies'),
    path('api/association/',                 association_view,              name='association'),
    path('api/association/accessories/', association_accessories_view, name='association_accessories'),

    path('api/pca/',                         pca_view,                      name='pca'),

    # ── Export & Historique ───────────────────────────────────────────────
    path('api/export/csv/',   export_csv_view,    name='export_csv'),
    path('api/history/',      search_history_view, name='search_history'),

    # ── Auth JWT (via api app) ────────────────────────────────────────────
    path('api/', include('api.urls')),
]

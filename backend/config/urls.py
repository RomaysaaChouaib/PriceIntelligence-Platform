from django.contrib import admin
from django.urls import path, include
from config import views  # Import global pour simplifier l'appel via views.nom_fonction
from django.urls import path, include 
from . import views
from django.conf import settings
from api.views import CustomTokenObtainPairView, UserProfileView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── Scraping Général ──────────────────────────────────────────────────
    path('api/scrape/jumia/',      views.scrape_jumia,          name='scrape_jumia'),
    path('api/scrape/amazon/',     views.scrap_amazon,          name='scrape_amazon'),
    path('api/scrape/aliexpress/', views.scrap_aliexpress,      name='scrape_aliexpress'),
    path('api/scrape/all/',        views.scrape_all,            name='scrape_all'),
    path('api/scrape/stop/',       views.stop_scraping_action,  name='stop_scraping'),
    path('api/status/<str:task_id>/', views.check_status,       name='check_status'),

    # ── Scraping Spécifique (Accessoires) ─────────────────────────────────
    path('api/scrape/souris/',       views.scrape_all_souris,       name='scrape_souris'),
    path('api/scrape/laptop_stand/', views.scrape_all_laptop_stand, name='scrape_laptop_stand'),
    path('api/scrape/cooling_pad/',  views.scrape_all_cooling_pad,  name='scrape_cooling_pad'),
    path('api/scrape/sac_laptop/',   views.scrape_all_sac,          name='scrape_sac'),
    path('api/scrape/usb/',          views.scrape_all_usb,          name='scrape_usb'),

    # ── Produits & Recherche ──────────────────────────────────────────────
    path('api/products/',           views.products_view,           name='products'),
    path('api/search/',             views.search_view,             name='search'),
    path('api/search/Accessoire/',  views.search_accessoire_view,  name='search_accessories'),

    # ── Data Mining & Analyses ────────────────────────────────────────────
    path('api/stats/',        views.stats_view,        name='stats'),
    path('api/clustering/',   views.clustering_view,   name='clustering'),
    path('api/anomalies/',    views.anomalies_view,    name='anomalies'),
    path('api/pca/',          views.pca_view,          name='pca'),
    path('api/association/',  views.association_view,  name='association'),
    path('api/association/accessories/', views.association_accessories_view, name='association_accessories'),

    # ── Export & Historique ───────────────────────────────────────────────
    path('api/export/csv/',   views.export_csv_view,    name='export_csv'),
    path('api/history/',      views.search_history_view, name='search_history'),

    # ── Auth JWT (via api app) ────────────────────────────────────────────
    path('api/', include('api.urls')),

    # views for products, stats, clustering, anomalies, and association
    path('api/products/', views.products_view),
    path('api/stats/', views.stats_view),
    path('api/clustering/', views.clustering_view),
    path('api/anomalies/', views.anomalies_view),
    path('api/association/', views.association_view),
    path('api/auth/login/', CustomTokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/', UserProfileView.as_view()),
     # API principale
    path('api/', include('api.urls')),
    
    # Django REST Framework auth (optionnel)
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    
    # Celery monitoring (optionnel, pour voir les tâches)
    path('celery-progress/', include('celery_progress.urls')),

        # ================= HISTORIQUE UTILISATEUR =================
    # Correspond à : "Historique des recherches effectuées"
    path('api/history/', views.get_user_history),
    
    # ================= SUIVI DU SCRAPING =================
    # Correspond à : "Affichage d'une barre de progression pendant la collecte"
    path('api/scrape/status/<str:task_id>/', views.get_scrape_status),
    
    # ================= ALERTES PRIX =================
    # Correspond à : "Notification si le prix d'un produit surveillé baisse"
    path('api/alerts/', views.manage_alerts),
    
    # ================= EXPORT DES RÉSULTATS =================
    # Correspond à : "Sauvegarde et export des résultats en CSV ou PDF"
    path('api/export/csv/', views.export_csv),
    path('api/export/pdf/', views.export_pdf),
    
    # ================= DÉTAIL PRODUIT =================
    # Utile pour le dashboard React
    path('api/products/<int:product_id>/', views.get_product_detail),
]



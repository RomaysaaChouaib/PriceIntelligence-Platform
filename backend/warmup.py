import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from config.views import clustering_view, stats_view, anomalies_view, association_view
from django.test import RequestFactory

r = RequestFactory()

print("Calcul stats...")
stats_view(r.get('/api/stats/'))
print("Stats sauvegardées")

print("Calcul clustering (peut prendre quelques minutes)...")
clustering_view(r.get('/api/clustering/'))
print("Clustering sauvegardé")

print("Calcul anomalies...")
anomalies_view(r.get('/api/anomalies/'))
print("Anomalies sauvegardées")

print("Calcul association...")
association_view(r.get('/api/association/'))
print("Association sauvegardée")

print("\nTout le cache est prêt — le frontend ne freezera plus !")
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class CustomUser(AbstractUser):
    """Extension du modèle User Django"""
    phone = models.CharField(max_length=15, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

class SearchHistory(models.Model):
    """Historique des recherches lancées par l'utilisateur"""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('running', 'En cours'),
        ('success', 'Terminé'),
        ('stopped', 'Interrompu'),
        ('error', 'Erreur'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='searches')
    query = models.CharField(max_length=255, db_index=True)
    category = models.CharField(max_length=50, default='laptop')
    task_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_results = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Historique de recherche'
        verbose_name_plural = 'Historiques de recherche'

    def __str__(self):
        return f"{self.query} ({self.category}) - {self.status}"

class Product(models.Model):
    """Produit unique identifié par son titre + plateforme"""
    title = models.CharField(max_length=300)
    category = models.CharField(max_length=50)
    platform = models.CharField(max_length=20)  # jumia, amazon, aliexpress
    image_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['title', 'platform', 'category']
        indexes = [models.Index(fields=['category', 'platform'])]
        verbose_name = 'Produit'
        verbose_name_plural = 'Produits'

    def __str__(self):
        return f"{self.title} [{self.platform}]"

class PriceRecord(models.Model):
    """Historique des prix scrapés (1 enregistrement = 1 offre à un instant T)"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_history')
    search_history = models.ForeignKey(SearchHistory, on_delete=models.SET_NULL, null=True, related_name='prices')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=5, default='MAD')
    seller = models.CharField(max_length=200, blank=True)
    rating = models.FloatField(null=True, blank=True)
    url = models.URLField()
    scraped_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scraped_at']
        verbose_name = 'Enregistrement de prix'
        verbose_name_plural = 'Enregistrements de prix'

class AnalysisResult(models.Model):
    """Résultats du pipeline Data Mining sauvegardés pour éviter recalcul"""
    search_history = models.OneToOneField(SearchHistory, on_delete=models.CASCADE, related_name='analysis')
    statistics = models.JSONField(default=dict)
    clustering = models.JSONField(default=dict)
    anomalies = models.JSONField(default=dict)
    platform_distribution = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Résultat d\'analyse'
        verbose_name_plural = 'Résultats d\'analyse'

class PriceAlert(models.Model):
    """Alerte de baisse de prix"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='alerts')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    target_price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Alerte prix'
        verbose_name_plural = 'Alertes prix'
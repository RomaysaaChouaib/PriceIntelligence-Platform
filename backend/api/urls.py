# backend/api/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, UserProfileView

urlpatterns = [
    # Auth JWT
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', UserProfileView.as_view(), name='user_profile'),
    
    # ... vos autres URLs existantes
]
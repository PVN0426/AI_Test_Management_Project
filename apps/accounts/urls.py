from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import LoginAPIView, UserProfileAPIView, LogoutAPIView

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='api_login'),
    path('refresh/', TokenRefreshView.as_view(), name='api_token_refresh'),
    path('me/', UserProfileAPIView.as_view(), name='api_user_me'),
    path('logout/', LogoutAPIView.as_view(), name='api_logout'),
]

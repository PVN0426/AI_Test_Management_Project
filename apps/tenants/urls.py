from rest_framework.routers import DefaultRouter
from apps.tenants.api_views import TenantViewSet

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')

urlpatterns = router.urls

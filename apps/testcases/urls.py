from rest_framework.routers import DefaultRouter
from apps.testcases.api_views import ProjectViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')

urlpatterns = router.urls

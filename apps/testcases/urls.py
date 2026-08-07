from rest_framework.routers import DefaultRouter
from apps.testcases.api_views import ProjectViewSet
from apps.testcases.api_views import RequirementViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'requirements', RequirementViewSet, basename='requirement')

urlpatterns = router.urls

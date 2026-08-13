from rest_framework.routers import DefaultRouter

from apps.bugs.api_views import BugViewSet

router = DefaultRouter()
router.register(r"bugs", BugViewSet, basename="bug")

urlpatterns = router.urls

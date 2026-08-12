from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.testcases.api_views import ProjectViewSet
from apps.testcases.api_views import RequirementViewSet
from apps.testcases.api_views import TestSuiteViewSet
from apps.testcases.api_views import TestCaseViewSet
from apps.testcases.api_views import GenerateTestCaseFromRequirementAPIView

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'requirements', RequirementViewSet, basename='requirement')
router.register(r'suites', TestSuiteViewSet, basename='suite')
router.register(r'testcases', TestCaseViewSet, basename='testcase')

urlpatterns = [
    path(
        'requirements/generate-testcases/', 
        GenerateTestCaseFromRequirementAPIView.as_view(), 
        name='api_generate_testcases'
    ),
] + router.urls
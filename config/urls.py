"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from django.urls import include
from rest_framework.routers import DefaultRouter
from django.views.generic import TemplateView
from apps.accounts.views import UserManagementViewSet
from django.views.generic import RedirectView


router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='user-management')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),

    # Resource Endpoints
    path('api/', include(router.urls)),
    path('api/', include('apps.testcases.urls')),
    path('api/', include('apps.tenants.urls')),
    path('api/', include('apps.bugs.urls')),
    path('api/', include('apps.reports.urls')),

    #frontend
    path('', TemplateView.as_view(template_name='accounts/login.html'), name='login'),
    path('dashboard/', RedirectView.as_view(url='/projects/', permanent=False)),
    path('projects/', TemplateView.as_view(template_name='projects/project_list.html'), name='project_list'),
    path('projects/<int:project_id>/requirements/', TemplateView.as_view(template_name='requirements/requirements_list.html'), name='project_requirements'),
    path('projects/<int:project_id>/test-cases/', TemplateView.as_view(template_name='testcases/testcase_list.html'),name='project_test_cases'),
    path('projects/<int:project_id>/reports/', TemplateView.as_view(template_name='reports/reports_list.html'), name='project_reports'),
    path(
        'projects/<int:project_id>/test-suites/',
        TemplateView.as_view(
            template_name='testsuites/testsuite_list.html'
        ),
        name='project_test_suites'
    ),
    path('projects/<int:project_id>/bugs/', TemplateView.as_view(template_name='bugs/bug_list.html'), name='project_bugs'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

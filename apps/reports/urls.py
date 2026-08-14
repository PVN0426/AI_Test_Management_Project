from django.urls import path

from apps.reports.views import ReportProjectsAPIView, ReportSummaryAPIView


urlpatterns = [
    path("reports/projects/", ReportProjectsAPIView.as_view(), name="report-projects"),
    path("reports/summary/", ReportSummaryAPIView.as_view(), name="report-summary"),
]

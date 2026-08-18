from django.urls import path

from apps.reports.views import ReportProjectsAPIView, ReportSummaryAPIView, ReportExportCSVView


urlpatterns = [
    path("reports/projects/", ReportProjectsAPIView.as_view(), name="report-projects"),
    path("reports/summary/", ReportSummaryAPIView.as_view(), name="report-summary"),
    path("reports/export/csv/", ReportExportCSVView.as_view(), name="export-report-csv"),
]

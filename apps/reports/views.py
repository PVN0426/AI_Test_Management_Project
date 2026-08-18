import csv
from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bugs.models import Bug
from apps.testcases.models import Project, TestCase


class ReportBaseAPIView(APIView):

    permission_classes = [IsAuthenticated]

    PERIODS = {"last_7_days", "last_14_days", "this_month", "last_month"}

    def _projects_for_user(self):
        user = self.request.user
        projects = Project.objects.all()
        if user.is_superuser or user.is_staff:
            return projects

        tenant = getattr(self.request, "tenant", None) or getattr(user, "tenant", None)
        return projects.filter(tenant=tenant) if tenant else projects.none()

    def _filters(self):
        project_id = self.request.query_params.get("project_id")
        period = self.request.query_params.get("period", "this_month")
        if period not in self.PERIODS:
            return None, None, Response(
                {"detail": "period must be one of: last_7_days, last_14_days, this_month, last_month."},
                status=400,
            )

        projects = self._projects_for_user()
        if project_id:
            try:
                project_id = int(project_id)
            except (TypeError, ValueError):
                return None, None, Response({"detail": "project_id must be an integer."}, status=400)
            projects = projects.filter(id=project_id)
            if not projects.exists():
                return None, None, Response({"detail": "Project not found."}, status=404)

        today = timezone.localdate()
        if period == "last_7_days":
            start_date = today - timedelta(days=6)
            end_date = today
        elif period == "last_14_days":
            start_date = today - timedelta(days=13)
            end_date = today
        elif period == "this_month":
            start_date = today.replace(day=1)
            end_date = today
        else:
            first_this_month = today.replace(day=1)
            end_date = first_this_month - timedelta(days=1)
            start_date = end_date.replace(day=1)

        return projects, (start_date, end_date), None


class ReportProjectsAPIView(ReportBaseAPIView):
    """Projects available to the current user, for the report dropdown."""

    def get(self, request):
        projects = self._projects_for_user().order_by("name", "id")
        return Response({
            "projects": [
                {"id": project.id, "name": project.name, "key": project.key}
                for project in projects
            ]
        })


class ReportSummaryAPIView(ReportBaseAPIView):
    """Aggregate test execution and bug metrics for one project or all projects."""

    def get(self, request):
        projects, date_range, error = self._filters()
        if error:
            return error
        start_date, end_date = date_range
        project_ids = projects.values("id")

        test_cases = TestCase.objects.filter(
            suite__project__in=project_ids,
            updated_at__date__range=date_range,
        )
        test_counts = test_cases.aggregate(
            total=Count("id"),
            passed=Count("id", filter=Q(test_result="passed")),
            failed=Count("id", filter=Q(test_result="failed")),
            not_run=Count("id", filter=Q(test_result="not_run")),
        )
        test_counts["untested"] = test_counts["not_run"]

        bugs = Bug.objects.filter(project__in=project_ids, updated_at__date__range=date_range)
        bug_status = bugs.aggregate(
            open=Count("id", filter=Q(status="open")),
            resolved=Count("id", filter=Q(status="resolved")),
        )
        bug_status["resolve"] = bug_status["resolved"]
        severity = bugs.aggregate(
            critical=Count("id", filter=Q(severity="critical")),
            high=Count("id", filter=Q(severity="high")),
            medium=Count("id", filter=Q(severity="medium")),
            low=Count("id", filter=Q(severity="low")),
        )

        trend_by_day = {
            item["day"].isoformat(): {"open": item["open"], "resolved": item["resolved"]}
            for item in bugs.annotate(day=TruncDate("updated_at"))
            .values("day")
            .annotate(
                open=Count("id", filter=Q(status="open")),
                resolved=Count("id", filter=Q(status="resolved")),
            )
        }
        defect_trend = []
        current_day = start_date
        while current_day <= end_date:
            day = current_day.isoformat()
            defect_trend.append({"date": day, **trend_by_day.get(day, {"open": 0, "resolved": 0})})
            current_day += timedelta(days=1)

        selected_project = request.query_params.get("project_id")
        return Response({
            "filters": {
                "project_id": int(selected_project) if selected_project else None,
                "period": request.query_params.get("period", "this_month"),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            "test_execution": test_counts,
            "bug_status": bug_status,
            "defect_severity": severity,
            "defect_trend": defect_trend,
        })


class ReportExportCSVView(ReportBaseAPIView):
    """Export summary metrics as a CSV file."""

    def get(self, request):
        projects, date_range, error = self._filters()
        if error:
            return error
        start_date, end_date = date_range
        project_ids = projects.values("id")

        # Determine the project name
        project_name = "All Projects"
        if len(projects) == 1:
            project_name = projects[0].name

        # Query summary metrics
        test_cases = TestCase.objects.filter(
            suite__project__in=project_ids,
            updated_at__date__range=date_range,
        )
        test_counts = test_cases.aggregate(
            total=Count("id"),
            passed=Count("id", filter=Q(test_result="passed")),
            failed=Count("id", filter=Q(test_result="failed")),
            not_run=Count("id", filter=Q(test_result="not_run")),
        )
        untested = test_counts["not_run"] or 0
        total_tests = test_counts["total"] or 0
        passed = test_counts["passed"] or 0
        failed = test_counts["failed"] or 0

        bugs = Bug.objects.filter(project__in=project_ids, updated_at__date__range=date_range)
        bug_status = bugs.aggregate(
            open=Count("id", filter=Q(status="open")),
            resolved=Count("id", filter=Q(status="resolved")),
        )
        open_bugs = bug_status["open"] or 0
        resolved_bugs = bug_status["resolved"] or 0

        severity = bugs.aggregate(
            critical=Count("id", filter=Q(severity="critical")),
            high=Count("id", filter=Q(severity="high")),
            medium=Count("id", filter=Q(severity="medium")),
            low=Count("id", filter=Q(severity="low")),
        )

        trend_by_day = {
            item["day"].isoformat(): {"open": item["open"], "resolved": item["resolved"]}
            for item in bugs.annotate(day=TruncDate("updated_at"))
            .values("day")
            .annotate(
                open=Count("id", filter=Q(status="open")),
                resolved=Count("id", filter=Q(status="resolved")),
            )
        }

        # Create the CSV response
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        filename = f'report_{project_name.lower().replace(" ", "_")}.csv'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        
        # Metadata
        writer.writerow(["PROJECT REPORT & ANALYTICS"])
        writer.writerow(["Project Name", project_name])
        writer.writerow(["Period", request.query_params.get("period", "this_month")])
        writer.writerow(["Start Date", start_date.isoformat()])
        writer.writerow(["End Date", end_date.isoformat()])
        writer.writerow([])

        # Test Execution Summary
        writer.writerow(["TEST EXECUTION SUMMARY"])
        writer.writerow(["Metric", "Count"])
        writer.writerow(["Total Test Cases", total_tests])
        writer.writerow(["Passed", passed])
        writer.writerow(["Failed", failed])
        writer.writerow(["Untested", untested])
        writer.writerow([])

        # Bug Status Summary
        writer.writerow(["BUG STATUS SUMMARY"])
        writer.writerow(["Metric", "Count"])
        writer.writerow(["Open Bugs", open_bugs])
        writer.writerow(["Resolved Bugs", resolved_bugs])
        writer.writerow([])

        # Defect Severity Breakdown
        writer.writerow(["DEFECT SEVERITY BREAKDOWN"])
        writer.writerow(["Severity", "Count"])
        writer.writerow(["Critical", severity["critical"] or 0])
        writer.writerow(["High", severity["high"] or 0])
        writer.writerow(["Medium", severity["medium"] or 0])
        writer.writerow(["Low", severity["low"] or 0])
        writer.writerow([])

        # Daily Trend Table
        writer.writerow(["DAILY DEFECT TREND"])
        writer.writerow(["Date", "Opened Bugs", "Resolved Bugs"])
        current_day = start_date
        while current_day <= end_date:
            day = current_day.isoformat()
            trend = trend_by_day.get(day, {"open": 0, "resolved": 0})
            writer.writerow([day, trend["open"], trend["resolved"]])
            current_day += timedelta(days=1)

        return response


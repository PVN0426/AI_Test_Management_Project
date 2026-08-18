from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bugs.models import Bug
from apps.tenants.models import Tenant
from apps.testcases.models import Project, TestCase, TestSuite


class ReportApiTests(APITestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        self.other_tenant = Tenant.objects.create(name="Other", slug="other")
        self.user = User.objects.create_user(username="reporter", password="test-pass", tenant=self.tenant)
        self.project = Project.objects.create(tenant=self.tenant, name="Portal", key="PORTAL")
        self.other_project = Project.objects.create(tenant=self.other_tenant, name="Private", key="PRIVATE")
        suite = TestSuite.objects.create(project=self.project, name="Main")
        for result in ("passed", "failed", "not_run"):
            TestCase.objects.create(suite=suite, title=result, test_result=result)
        Bug.objects.create(project=self.project, bug_id="BUG-1", title="Open", platform="web", environment="staging", severity="critical", status="open")
        Bug.objects.create(project=self.project, bug_id="BUG-2", title="Fixed", platform="web", environment="staging", severity="low", status="resolved")
        self.client.force_authenticate(self.user)

    def test_summary_returns_three_dashboards_for_selected_project(self):
        response = self.client.get(f"/api/reports/summary/?project_id={self.project.id}&period=last_7_days")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["test_execution"], {"total": 3, "passed": 1, "failed": 1, "not_run": 1, "untested": 1})
        self.assertEqual(response.data["bug_status"], {"open": 1, "resolved": 1, "resolve": 1})
        self.assertEqual(response.data["defect_severity"], {"critical": 1, "high": 0, "medium": 0, "low": 1})
        self.assertEqual(len(response.data["defect_trend"]), 7)

    def test_dropdown_excludes_projects_from_another_tenant(self):
        response = self.client.get("/api/reports/projects/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["projects"], [{"id": self.project.id, "name": "Portal", "key": "PORTAL"}])

    def test_user_cannot_request_project_from_another_tenant(self):
        response = self.client.get(f"/api/reports/summary/?project_id={self.other_project.id}")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_summary_default_period_is_this_month(self):
        response = self.client.get(f"/api/reports/summary/?project_id={self.project.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["filters"]["period"], "this_month")

    def test_export_csv_returns_content_disposition_and_ok(self):
        response = self.client.get(f"/api/reports/export/csv/?project_id={self.project.id}&period=last_7_days")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8-sig")
        self.assertTrue(response["Content-Disposition"].startswith('attachment; filename="report_portal.csv"'))
        content = response.content.decode('utf-8-sig')
        self.assertIn("PROJECT REPORT & ANALYTICS", content)
        self.assertIn("TEST EXECUTION SUMMARY", content)
        self.assertIn("BUG STATUS SUMMARY", content)
        self.assertIn("DEFECT SEVERITY BREAKDOWN", content)
        self.assertIn("DAILY DEFECT TREND", content)


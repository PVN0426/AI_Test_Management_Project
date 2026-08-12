from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.ai.models import AIJob
from apps.tenants.models import Tenant
from apps.testcases.models import Project, Requirement, TestCase


class AIGeneratedTestCaseReviewTests(APITestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="QC Tenant", slug="qc-tenant")
        self.user = User.objects.create_user(
            username="qc-user",
            password="safe-password-123",
            role="qc",
            tenant=self.tenant,
        )
        self.project = Project.objects.create(tenant=self.tenant, name="Portal", key="PORTAL")
        self.requirement = Requirement.objects.create(
            project=self.project,
            ref="REQ-1",
            title="Login",
            text="A valid user can sign in.",
            status="active",
        )
        self.client.force_authenticate(self.user)

    def _create_ai_job(self):
        output = {
            "test_cases": [
                {
                    "case_id": "TC_LOGIN_001",
                    "title": "Login succeeds with valid credentials",
                    "precondition": "An active user exists",
                    "priority": "high",
                    "steps": [
                        {"order": 1, "action": "Enter valid credentials", "expected": "Credentials are accepted"},
                        {"order": 2, "action": "Submit login", "expected": "Dashboard is displayed"},
                    ],
                }
            ]
        }
        return AIJob.objects.create(
            tenant=self.tenant,
            kind="generate_tc",
            status="SUCCESS",
            output_json=output,
        ), output

    @patch("apps.testcases.api_views.AIService.generate_test_cases")
    def test_generation_is_preview_until_qc_commits_it(self, generate_test_cases):
        job, output = self._create_ai_job()
        generate_test_cases.return_value = job, output

        response = self.client.post(
            "/api/requirements/generate-testcases/",
            {"requirement_ids": [self.requirement.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["requires_qc_confirmation"])
        self.assertEqual(TestCase.objects.count(), 0)

        job.refresh_from_db()
        self.assertEqual(job.request_context["project_id"], self.project.id)
        self.assertEqual(job.request_context["requirement_ids"], [self.requirement.id])

    def test_qc_can_commit_preview_as_approved_only_once(self):
        job, _ = self._create_ai_job()
        job.request_context = {
            "project_id": self.project.id,
            "requirement_ids": [self.requirement.id],
        }
        job.save(update_fields=["request_context"])

        response = self.client.post(
            "/api/testcases/commit-ai-generation/",
            {"job_id": job.id, "decision": "approved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        test_case = TestCase.objects.get()
        self.assertEqual(test_case.status, "approved")
        self.assertEqual(test_case.source, "ai")
        self.assertEqual(test_case.steps.count(), 2)

        repeated_response = self.client.post(
            "/api/testcases/commit-ai-generation/",
            {"job_id": job.id, "decision": "approved"},
            format="json",
        )
        self.assertEqual(repeated_response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(TestCase.objects.count(), 1)

# Create your tests here.

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bugs.models import Bug, BugHistory
from apps.tenants.models import Tenant
from apps.testcases.models import Project


class BugApiTests(APITestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        self.project = Project.objects.create(tenant=self.tenant, name="Portal", key="PORTAL")
        self.qc = User.objects.create_user(username="qc", password="test-pass", role="qc", tenant=self.tenant)
        self.developer = User.objects.create_user(username="dev", password="test-pass", role="dev", tenant=self.tenant)

    def test_qc_can_create_bug_with_multiple_attachments(self):
        self.client.force_authenticate(self.qc)
        payload = {
            "bug_id": "BUG-101",
            "project": self.project.id,
            "title": "Login button does not respond",
            "platform": "mobile",
            "environment": "staging",
            "attachments": [
                SimpleUploadedFile("proof.png", b"image", content_type="image/png"),
                SimpleUploadedFile("recording.mp4", b"video", content_type="video/mp4"),
            ],
        }
        response = self.client.post("/api/bugs/", payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["bug_id"], "BUG-101")
        self.assertEqual(len(response.data["attachment_items"]), 2)
        self.assertEqual(Bug.objects.get().reporter, self.qc)
        self.assertIsNone(Bug.objects.get().assignee)

    def test_developer_can_claim_and_change_status_but_not_title(self):
        bug = Bug.objects.create(
            project=self.project,
            bug_id="BUG-102",
            title="Invalid amount accepted",
            platform="web",
            environment="production",
        )
        self.client.force_authenticate(self.developer)

        response = self.client.post(f"/api/bugs/{bug.id}/claim/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.patch(f"/api/bugs/{bug.id}/", {"status": "in_progress"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bug.refresh_from_db()
        self.assertEqual(bug.assignee, self.developer)
        self.assertTrue(BugHistory.objects.filter(bug=bug, to_status="in_progress", by_user=self.developer).exists())

        response = self.client.patch(f"/api/bugs/{bug.id}/", {"title": "Changed title"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_developer_can_update_only_status_with_put(self):
        bug = Bug.objects.create(
            project=self.project,
            bug_id="BUG-103",
            title="Checkout error",
            platform="web",
            environment="staging",
        )
        self.client.force_authenticate(self.developer)

        response = self.client.put(f"/api/bugs/{bug.id}/", {"status": "resolved"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bug.refresh_from_db()
        self.assertEqual(bug.status, "resolved")

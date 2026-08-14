from django.db import models
from apps.accounts.models import User
from apps.testcases.models import Project

class Bug(models.Model):
    PLATFORM_CHOICES = (("mobile", "Mobile"), ("web", "Web"))
    ENVIRONMENT_CHOICES = (("production", "Production"), ("staging", "Staging"))
    SEVERITY_CHOICES = (("critical", "Critical"), ("high", "High"), ("medium", "Medium"), ("low", "Low"))
    STATUS_CHOICES = (
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("reopened", "Reopened"),
        ("closed", "Closed"),
        ("rejected", "Rejected"),
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE, verbose_name="Project")
    bug_id = models.CharField(max_length=50, verbose_name="Bug ID")
    title = models.CharField(max_length=255, verbose_name="Bug Title")
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, verbose_name="Platform")
    environment = models.CharField(max_length=20, choices=ENVIRONMENT_CHOICES, verbose_name="Test Environment")
    steps_to_reproduce = models.TextField(blank=True, default="", verbose_name="Steps to Reproduce")
    expected_result = models.TextField(blank=True, default="", verbose_name="Expected Result")
    actual_result = models.TextField(blank=True, default="", verbose_name="Actual Result")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="medium", verbose_name="Severity")
    priority = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="medium", verbose_name="Priority")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open", verbose_name="Status")
    assignee = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, 
        related_name="assigned_bugs", verbose_name="Assignee")
    reporter = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, 
        related_name="reported_bugs", verbose_name="Reporter")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bug"
        constraints = [
            models.UniqueConstraint(fields=["project", "bug_id"], name="unique_bug_id_per_project"),
        ]
        verbose_name = "Bug"
        verbose_name_plural = "Bugs"

    def __str__(self):
        return f"{self.bug_id}: {self.title}"


class BugAttachment(models.Model):
    bug = models.ForeignKey(Bug, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="bug_attachments/%Y/%m/%d/")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bug_attachment"
        verbose_name = "Bug attachment"
        verbose_name_plural = "Bug attachments"

    def __str__(self):
        return self.file.name


class BugHistory(models.Model):
    bug = models.ForeignKey(Bug, on_delete=models.CASCADE, related_name="history", verbose_name="Bug")
    from_status = models.CharField(max_length=20, verbose_name="From Status")
    to_status = models.CharField(max_length=20, verbose_name="To Status")
    by_user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Changed By")
    at = models.DateTimeField(auto_now_add=True, verbose_name="Changed At")

    class Meta:
        db_table = "bug_history"
        verbose_name = "Bug History"
        verbose_name_plural = "Bug Histories"

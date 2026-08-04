from django.db import models
from apps.accounts.models import User
from apps.testcases.models import Project, TestCase
from apps.scripts.models import TestRun

class Bug(models.Model):
    SEVERITY_CHOICES = (("critical", "Critical"), ("high", "High"), ("medium", "Medium"), ("low", "Low"))
    STATUS_CHOICES = (
        ("new", "New"), 
        ("in_progress", "In Progress"), 
        ("resolved", "Resolved"), 
        ("verified", "Verified"), 
        ("closed", "Closed")
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE, verbose_name="Project")
    run = models.ForeignKey(TestRun, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Source Test Run")
    case = models.ForeignKey(TestCase, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Source Test Case")
    title = models.CharField(max_length=255, verbose_name="Bug Title")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="medium", verbose_name="Severity")
    priority = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="medium", verbose_name="Priority")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new", verbose_name="Status")
    assignee = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, 
        related_name="assigned_bugs", verbose_name="Assignee")
    reporter = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, 
        related_name="reported_bugs", verbose_name="Reporter")

    class Meta:
        db_table = "bug"
        verbose_name = "Bug"
        verbose_name_plural = "Bugs"

    def __str__(self):
        return f"BUG#{self.id}: {self.title}"


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
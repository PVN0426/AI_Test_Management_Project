from django.db import models
from django.conf import settings
from apps.tenants.models import Tenant

class Project(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, verbose_name="Tenant")
    name = models.CharField(max_length=255, verbose_name="Project Name")
    key = models.CharField(max_length=20, verbose_name="Project Key")
    description = models.TextField(blank=True, default="", verbose_name="Project Description")

    class Meta:
        db_table = "project"
        unique_together = ("tenant", "key")
        verbose_name = "Project"
        verbose_name_plural = "Projects"

    def __str__(self):
        return f"[{self.key}] {self.name}"

class Requirement(models.Model):
    PRIORITY_CHOICES = (("critical", "Critical"), ("high", "High"), ("medium", "Medium"), ("low", "Low"),)

    STATUS_CHOICES = (("draft", "Draft"), ("active", "Active"), ("done", "Done"),)

    SOURCE_TYPE_CHOICES = (("manual", "Manual"), ("document", "Document"),)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="requirements", verbose_name="Project")
    ref = models.CharField(max_length=100, verbose_name="Requirement ID")
    title = models.CharField(max_length=255, verbose_name="Requirement Title")
    text = models.TextField(blank=True, default="", verbose_name="Requirement Description")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default="manual")
    file = models.FileField(upload_to="requirements/", null=True, blank=True, verbose_name="Requirement Document")

    class Meta:
        db_table = "requirement"
        unique_together = ("project", "ref")
        verbose_name = "Requirement"
        verbose_name_plural = "Requirements"

    def __str__(self):
        return self.ref

class TestSuite(models.Model):
    PRIORITY_CHOICES = (
        ("p1", "P1 - Critical"),
        ("p2", "P2 - High"),
        ("p3", "P3 - Medium"),
        ("p4", "P4 - Low"),
    )

    TEST_TYPE_CHOICES = (
        ("manual", "Manual"),
        ("automated", "Automated"),
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="test_suites"
    )

    name = models.CharField(max_length=255)

    precondition = models.TextField(
    blank=True,
    default="",
    verbose_name="Preconditions"
    )

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default="p3"
    )

    test_type = models.CharField(
        max_length=20,
        choices=TEST_TYPE_CHOICES,
        default="manual"
    )

    estimate_time = models.CharField(
        max_length=50,
        blank=True,
        default=""
    )

    requirement_ref = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Requirement ID, ví dụ REQ-101"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "test_suite"
        unique_together = ("project", "name")

    assigned_test_cases = models.ManyToManyField(
        'TestCase',
        related_name="assigned_suites",
        blank=True,
        verbose_name="Test Cases"
    )

class TestCase(models.Model):
    PRIORITY_CHOICES = (("critical", "Critical"), ("high", "High"), ("medium", "Medium"), ("low", "Low"),)
    REVIEW_STATUS_CHOICES = (("draft", "Draft"), ("approved", "Approved"),)
    TEST_RESULT_CHOICES = (("not_run", "Not Run"), ("passed", "Passed"), ("failed", "Failed"), ("skipped", "Skipped"), ("blocked", "Blocked"),)
    SOURCE_CHOICES = (("manual", "Manual"), ("ai", "AI"),)
    suite = models.ForeignKey(TestSuite, on_delete=models.CASCADE, related_name="test_cases", verbose_name="Test Suite")
    requirements = models.ManyToManyField(Requirement, related_name="test_cases", blank=True, verbose_name="Linked Requirements")
    title = models.CharField(max_length=255, verbose_name="Test Case Title")
    precondition = models.TextField(blank=True, default="", verbose_name="Precondition")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium", verbose_name="Priority")
    review_status = models.CharField(max_length=20, choices=REVIEW_STATUS_CHOICES, default="draft", verbose_name="Review Status")
    test_result = models.CharField(max_length=20, choices=TEST_RESULT_CHOICES, default="not_run", verbose_name="Test Result")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual", verbose_name="Source")
    technique = models.CharField(max_length=20, null=True, blank=True, verbose_name="Design Technique")
    version = models.IntegerField(default=1, verbose_name="Version")
    estimate_time = models.CharField(max_length=50, blank=True, default="", verbose_name="Estimate Time")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "test_case"
        verbose_name = "Test Case"
        verbose_name_plural = "Test Cases"

    def __str__(self):
        return f"TC#{self.id}: {self.title}"
     
class TestStep(models.Model):
    case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name="steps", verbose_name="Test Case")
    order = models.IntegerField(verbose_name="Step Order")
    action = models.TextField(verbose_name="Action")
    expected = models.TextField(verbose_name="Expected Result")

    class Meta:
        db_table = "test_step"
        ordering = ["order"]
        verbose_name = "Test Step"
        verbose_name_plural = "Test Steps"
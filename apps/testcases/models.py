from django.db import models
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


# class Requirement(models.Model):
#     project = models.ForeignKey(Project, on_delete=models.CASCADE, verbose_name="Project")
#     ref = models.CharField(max_length=100, verbose_name="Requirement Ref")
#     text = models.TextField(verbose_name="Requirement Description")

#     class Meta:
#         db_table = "requirement"
#         unique_together = ("project", "ref")
#         verbose_name = "Requirement"
#         verbose_name_plural = "Requirements"

#     def __str__(self):
#         return f"{self.ref}"

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
    project = models.ForeignKey(Project, on_delete=models.CASCADE, verbose_name="Project")
    name = models.CharField(max_length=255, verbose_name="Suite Name")
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, 
        related_name="subsuites", verbose_name="Parent Suite"
    )

    class Meta:
        db_table = "test_suite"
        verbose_name = "Test Suite"
        verbose_name_plural = "Test Suites"

    def __str__(self):
        return self.name


class TestCase(models.Model):
    PRIORITY_CHOICES = (("critical", "Critical"), ("high", "High"), ("medium", "Medium"), ("low", "Low"))
    STATUS_CHOICES = (("draft", "Draft"), ("approved", "Approved"))
    SOURCE_CHOICES = (("manual", "Manual"), ("ai", "AI"))

    suite = models.ForeignKey(TestSuite, on_delete=models.CASCADE, verbose_name="Test Suite")
    requirements = models.ManyToManyField(Requirement, related_name="test_cases", blank=True, verbose_name="Linked Requirements")
    title = models.CharField(max_length=255, verbose_name="Test Case Title")
    precondition = models.TextField(blank=True, default="", verbose_name="Precondition")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium", verbose_name="Priority")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", verbose_name="Status")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual", verbose_name="Source")
    technique = models.CharField(max_length=20, null=True, blank=True, verbose_name="Design Technique")
    version = models.IntegerField(default=1, verbose_name="Version")

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
from django.db import models
from apps.testcases.models import Project, TestCase

class TestScript(models.Model):
    case = models.ForeignKey(TestCase, on_delete=models.CASCADE, verbose_name="Test Case")
    framework = models.CharField(max_length=50, verbose_name="Framework")
    code_content = models.TextField(blank=True, default="", verbose_name="Script Code Content")
    git_path = models.CharField(max_length=255, blank=True, default="", verbose_name="Git Path")
    is_verified = models.BooleanField(default=False, verbose_name="Is Verified")

    class Meta:
        db_table = "test_script"
        verbose_name = "Test Script"
        verbose_name_plural = "Test Scripts"


class TestScenario(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, verbose_name="Project")
    name = models.CharField(max_length=255, verbose_name="Scenario Name")

    class Meta:
        db_table = "test_scenario"
        verbose_name = "Test Scenario"
        verbose_name_plural = "Test Scenarios"


class TestRun(models.Model):
    STATUS_CHOICES = (("pending", "Pending"), ("running", "Running"), ("completed", "Completed"))

    scenario = models.ForeignKey(TestScenario, on_delete=models.CASCADE, verbose_name="Test Scenario")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Status")
    started_at = models.DateTimeField(auto_now_add=True, verbose_name="Started At")

    class Meta:
        db_table = "test_run"
        verbose_name = "Test Run"
        verbose_name_plural = "Test Runs"


class TestResult(models.Model):
    run = models.ForeignKey(TestRun, on_delete=models.CASCADE, related_name="results", verbose_name="Test Run")
    case = models.ForeignKey(TestCase, on_delete=models.CASCADE, verbose_name="Test Case")
    passed = models.BooleanField(verbose_name="Passed")
    duration = models.FloatField(default=0.0, verbose_name="Duration (s)")

    class Meta:
        db_table = "test_result"
        verbose_name = "Test Result"
        verbose_name_plural = "Test Results"
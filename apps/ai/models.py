from django.db import models
from apps.tenants.models import Tenant

class AIJob(models.Model):
    KIND_CHOICES = (
        ("generate_tc", "Generate Test Cases"), 
        ("generate_script", "Generate Test Script"), 
        ("classify_bug", "Classify Bug Severity")
    )
    STATUS_CHOICES = (("SUCCESS", "Success"), ("FAILED", "Failed"))

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, verbose_name="Tenant")
    kind = models.CharField(max_length=30, choices=KIND_CHOICES, verbose_name="Job Kind")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, verbose_name="Status")
    tokens = models.IntegerField(default=0, verbose_name="Tokens Used")
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0.000000, verbose_name="Cost ($)")
    output_json = models.JSONField(null=True, blank=True, verbose_name="Output JSON")
    raw_output = models.TextField(null=True, blank=True, verbose_name="Raw Output")

    class Meta:
        db_table = "ai_job"
        verbose_name = "AI Job"
        verbose_name_plural = "AI Jobs"
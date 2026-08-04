from django.db import models

class Tenant(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Organization Name")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug")
    plan = models.CharField(max_length=50, default="free", verbose_name="Plan")
    ai_monthly_quota_usd = models.DecimalField(
        max_digits=10, decimal_places=4, default=10.0000, verbose_name="Monthly AI Quota ($)"
    )
    is_active = models.BooleanField(default=True, verbose_name="Is Active")

    class Meta:
        db_table = "tenant"
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"

    def __str__(self):
        return f"{self.name} (${self.ai_monthly_quota_usd}/month)"


class Document(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, verbose_name="Tenant")
    project = models.ForeignKey("testcases.Project", on_delete=models.CASCADE, verbose_name="Project")
    file = models.CharField(max_length=500, verbose_name="File Path")
    extracted_text = models.TextField(verbose_name="Extracted Text")

    class Meta:
        db_table = "document"
        verbose_name = "Context Document"
        verbose_name_plural = "Context Documents"
# Generated manually for the QC approval workflow.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="aijob",
            name="request_context",
            field=models.JSONField(blank=True, default=dict, verbose_name="Request Context"),
        ),
        migrations.AddField(
            model_name="aijob",
            name="review_decision",
            field=models.CharField(
                blank=True,
                choices=[("draft", "Draft"), ("approved", "Approved")],
                max_length=20,
                null=True,
                verbose_name="QC Decision",
            ),
        ),
        migrations.AddField(
            model_name="aijob",
            name="reviewed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reviewed_ai_jobs",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Reviewed By",
            ),
        ),
        migrations.AddField(
            model_name="aijob",
            name="committed_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Committed At"),
        ),
    ]

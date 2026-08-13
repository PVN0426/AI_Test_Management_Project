from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


def set_existing_bug_ids(apps, schema_editor):
    Bug = apps.get_model("bugs", "Bug")
    for bug in Bug.objects.filter(bug_id__isnull=True).iterator():
        bug.bug_id = f"BUG-{bug.pk}"
        bug.created_at = timezone.now()
        bug.updated_at = bug.created_at
        bug.save(update_fields=["bug_id", "created_at", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("bugs", "0002_initial"),
    ]

    operations = [
        migrations.RemoveField(model_name="bug", name="case"),
        migrations.RemoveField(model_name="bug", name="run"),
        migrations.AddField(model_name="bug", name="actual_result", field=models.TextField(blank=True, default="", verbose_name="Actual Result")),
        migrations.AddField(model_name="bug", name="bug_id", field=models.CharField(blank=True, max_length=50, null=True, verbose_name="Bug ID")),
        migrations.AddField(model_name="bug", name="environment", field=models.CharField(choices=[("production", "Production"), ("staging", "Staging")], default="staging", max_length=20, verbose_name="Test Environment")),
        migrations.AddField(model_name="bug", name="expected_result", field=models.TextField(blank=True, default="", verbose_name="Expected Result")),
        migrations.AddField(model_name="bug", name="platform", field=models.CharField(choices=[("mobile", "Mobile"), ("web", "Web")], default="web", max_length=20, verbose_name="Platform")),
        migrations.AddField(model_name="bug", name="steps_to_reproduce", field=models.TextField(blank=True, default="", verbose_name="Steps to Reproduce")),
        migrations.AddField(model_name="bug", name="created_at", field=models.DateTimeField(auto_now_add=True, null=True)),
        migrations.AddField(model_name="bug", name="updated_at", field=models.DateTimeField(auto_now=True, null=True)),
        migrations.RunPython(set_existing_bug_ids, migrations.RunPython.noop),
        migrations.AlterField(model_name="bug", name="bug_id", field=models.CharField(max_length=50, verbose_name="Bug ID")),
        migrations.AlterField(model_name="bug", name="created_at", field=models.DateTimeField(auto_now_add=True)),
        migrations.AlterField(model_name="bug", name="updated_at", field=models.DateTimeField(auto_now=True)),
        migrations.CreateModel(
            name="BugAttachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file", models.FileField(upload_to="bug_attachments/%Y/%m/%d/")),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("bug", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="bugs.bug")),
                ("uploaded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="accounts.user")),
            ],
            options={"verbose_name": "Bug attachment", "verbose_name_plural": "Bug attachments", "db_table": "bug_attachment"},
        ),
        migrations.AddConstraint(model_name="bug", constraint=models.UniqueConstraint(fields=("project", "bug_id"), name="unique_bug_id_per_project")),
    ]

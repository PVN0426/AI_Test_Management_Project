from django.db import migrations, models


def migrate_legacy_statuses(apps, schema_editor):
    Bug = apps.get_model("bugs", "Bug")
    Bug.objects.filter(status="new").update(status="open")
    Bug.objects.filter(status="verified").update(status="closed")


class Migration(migrations.Migration):
    dependencies = [
        ("bugs", "0003_bug_report_fields_and_attachments"),
    ]

    operations = [
        migrations.RunPython(migrate_legacy_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="bug",
            name="status",
            field=models.CharField(
                choices=[
                    ("open", "Open"),
                    ("in_progress", "In Progress"),
                    ("resolved", "Resolved"),
                    ("reopened", "Reopened"),
                    ("closed", "Closed"),
                    ("rejected", "Rejected"),
                ],
                default="open",
                max_length=20,
                verbose_name="Status",
            ),
        ),
    ]

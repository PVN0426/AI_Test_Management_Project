# Generated manually to align the database schema with TestCase model fields.

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("testcases", "0003_requirement_file_requirement_priority_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="testcase",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now, verbose_name="Created At"),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="testcase",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now, verbose_name="Updated At"),
            preserve_default=False,
        ),
    ]

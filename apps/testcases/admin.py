from django.contrib import admin
from .models import Project, Requirement, TestSuite, TestCase, TestStep

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "key", "name", "tenant")

@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = ("id", "ref", "project", "text")

@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "suite", "priority", "review_status", "test_result", "source",)
    list_filter = ("review_status",)
    search_fields = ("title",)

admin.site.register(TestSuite)
admin.site.register(TestStep)
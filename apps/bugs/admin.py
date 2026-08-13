from django.contrib import admin
from .models import Bug, BugAttachment, BugHistory

@admin.register(Bug)
class BugAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "project", "severity", "status", "assignee", "reporter")
    list_filter = ("status", "severity", "project")

admin.site.register(BugHistory)
admin.site.register(BugAttachment)

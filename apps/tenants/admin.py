from django.contrib import admin
from .models import Tenant, Document

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "plan", "ai_monthly_quota_usd", "is_active")
    search_fields = ("name", "slug")

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "tenant", "project", "file")
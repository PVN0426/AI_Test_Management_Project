from django.contrib import admin
from .models import AIJob

@admin.register(AIJob)
class AIJobAdmin(admin.ModelAdmin):
    list_display = ("id", "tenant", "kind", "status", "review_decision", "reviewed_by", "committed_at", "tokens", "cost_usd")
    list_filter = ("kind", "status", "review_decision", "tenant")

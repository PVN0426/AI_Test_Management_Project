from django.contrib import admin
from .models import AIJob

@admin.register(AIJob)
class AIJobAdmin(admin.ModelAdmin):
    list_display = ("id", "tenant", "kind", "status", "tokens", "cost_usd")
    list_filter = ("kind", "status", "tenant")
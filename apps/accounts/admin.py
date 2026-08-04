from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "tenant", "role", "is_active", "is_staff")
    list_filter = ("role", "tenant", "is_active")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Tenant & Role Info", {"fields": ("tenant", "role")}),
    )
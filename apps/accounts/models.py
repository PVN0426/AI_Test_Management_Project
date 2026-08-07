from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from apps.tenants.models import Tenant


class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'org_admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('role') != 'org_admin':
            raise ValueError('Superuser must have role=org_admin.')

        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = (
        ("org_admin", "Org Admin"),
        ("qc", "QC / Test Lead / Tester"),
        ("dev", "Developer"),
    )

    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, null=True, blank=True, 
        related_name="users", verbose_name="Tenant"
    )
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default="qc", verbose_name="Role"
    )

    objects = CustomUserManager()

    class Meta:
        db_table = "user"
        verbose_name = "User"
        verbose_name_plural = "Users"

    @property
    def is_admin_role(self):
        return self.role == "org_admin" or self.is_superuser

    @property
    def is_qc_role(self):
        return self.role in ["qc", "org_admin"] or self.is_superuser

    @property
    def is_dev_role(self):
        return self.role in ["dev", "org_admin"] or self.is_superuser

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"
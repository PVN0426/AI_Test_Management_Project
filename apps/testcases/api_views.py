from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAuthenticated

from apps.testcases.models import Project, Requirement
from apps.testcases.serializers import (ProjectSerializer, RequirementSerializer)

# Khai báo Permission Class ngay tại file này
class IsQCForWriteOrReadOnlyInline(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(request.user, "role", None) == "qc"


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsQCForWriteOrReadOnlyInline]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser or user.is_staff:
            return Project.objects.all()

        tenant = getattr(self.request, "tenant", None) or getattr(user, "tenant", None)

        if tenant is None:
            tenant_id = self.request.query_params.get("tenant_id")
            if tenant_id:
                return Project.objects.filter(tenant_id=tenant_id)
            return Project.objects.none()

        return Project.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = None
        if hasattr(serializer, "validated_data"):
            tenant = serializer.validated_data.get("tenant")

        if tenant is None:
            tenant = getattr(self.request, "tenant", None) or getattr(self.request.user, "tenant", None)

        serializer.save(tenant=tenant)


class RequirementViewSet(viewsets.ModelViewSet):
    queryset = Requirement.objects.all()
    serializer_class = RequirementSerializer
    permission_classes = [
        IsAuthenticated,
        IsQCForWriteOrReadOnlyInline
    ]
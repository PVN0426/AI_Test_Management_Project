from django.db import transaction
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.bugs.models import Bug, BugHistory
from apps.bugs.serializers import BugSerializer


class BugPermission(permissions.BasePermission):
    """QC/admin manage bugs; developers can read, update status, and claim themselves."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_superuser or request.user.is_staff or request.user.role == "qc":
            return True
        return request.user.role == "dev" and (
            request.method in {"PATCH", "PUT"} or getattr(view, "action", None) == "claim"
        )


class BugViewSet(viewsets.ModelViewSet):
    serializer_class = BugSerializer
    permission_classes = [BugPermission]

    def get_queryset(self):
        queryset = Bug.objects.select_related("project", "assignee", "reporter").prefetch_related("attachments")
        user = self.request.user
        if not (user.is_superuser or user.is_staff):
            tenant = getattr(self.request, "tenant", None) or getattr(user, "tenant", None)
            if not tenant:
                return queryset.none()
            queryset = queryset.filter(project__tenant=tenant)
        filters = {
            "project_id": "project_id",
            "status": "status",
            "priority": "priority",
            "severity": "severity",
            "platform": "platform",
            "environment": "environment",
            "assignee": "assignee_id",
        }
        for parameter, field in filters.items():
            if value := self.request.query_params.get(parameter):
                queryset = queryset.filter(**{field: value})
        if search := self.request.query_params.get("search"):
            queryset = queryset.filter(title__icontains=search) | queryset.filter(bug_id__icontains=search)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        """Allow a developer to submit only `status` with either PUT or PATCH."""
        if request.user.role == "dev" and not (request.user.is_superuser or request.user.is_staff):
            kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        bug = serializer.save()
        if previous_status != bug.status:
            BugHistory.objects.create(
                bug=bug,
                from_status=previous_status,
                to_status=bug.status,
                by_user=self.request.user,
            )

    @action(detail=True, methods=["post"], url_path="claim")
    def claim(self, request, pk=None):
        bug = self.get_object()
        if request.user.role != "dev" and not (request.user.is_superuser or request.user.is_staff):
            raise PermissionDenied("Chỉ developer mới có thể nhận bug.")
        bug.assignee = request.user
        bug.save(update_fields=["assignee", "updated_at"])
        return Response(self.get_serializer(bug).data)

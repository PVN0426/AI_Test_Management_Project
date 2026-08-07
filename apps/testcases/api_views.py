from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.testcases.models import Project
from apps.testcases.serializers import ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Nếu user là Superuser / Admin hệ thống -> Lấy tất cả Project
        if user.is_staff or user.is_superuser:
            return Project.objects.all()

        # Lấy tenant từ request middleware hoặc từ user profile
        tenant = getattr(self.request, "tenant", None) or getattr(user, "tenant", None)
        
        if tenant is None:
            return Project.objects.none()
            
        return Project.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        # Ưu tiên lấy tenant từ payload, nếu không có mới lấy tenant của User/Request
        tenant = None
        if hasattr(serializer, "validated_data"):
            tenant = serializer.validated_data.get("tenant")
            
        if tenant is None:
            tenant = getattr(self.request, "tenant", None) or getattr(self.request.user, "tenant", None)
            
        serializer.save(tenant=tenant)
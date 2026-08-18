from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import filters, viewsets
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404


from apps.testcases.models import Project, Requirement, TestSuite, TestCase, TestStep
from apps.testcases.serializers import (ProjectSerializer, RequirementSerializer, TestSuiteCreateSerializer, TestSuiteListSerializer, TestSuiteDetailSerializer, TestCaseSerializer, CommitAIGenerationSerializer)
from apps.ai.models import AIJob
from apps.ai.services import AIService

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
    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')

        if not project_id:
            return Requirement.objects.none()
        return Requirement.objects.filter(project_id=project_id)

class TestSuiteViewSet(viewsets.ModelViewSet):
    queryset = TestSuite.objects.all()
    permission_classes = [IsAuthenticated, IsQCForWriteOrReadOnlyInline]

    def get_serializer_class(self):
        if self.action == "create":
            return TestSuiteCreateSerializer
        elif self.action == "retrieve":
            return TestSuiteDetailSerializer
        return TestSuiteListSerializer

    def get_queryset(self):
        queryset = TestSuite.objects.select_related("project").all()
        user = self.request.user

        if not user.is_superuser:
            tenant = getattr(self.request, "tenant", None) or getattr(user, "tenant", None)
            if tenant:
                queryset = queryset.filter(project__tenant=tenant)
            elif getattr(user, "tenant_id", None):
                queryset = queryset.filter(project__tenant_id=user.tenant_id)

        project_id = self.kwargs.get("project_id") or self.request.query_params.get("project_id")

        if project_id:
            return queryset.filter(project_id=project_id)

        return queryset

    def perform_create(self, serializer):
        project = get_object_or_404(Project, pk=self.kwargs["project_id"])

        name = serializer.validated_data["name"]

        if TestSuite.objects.filter(project=project, name=name).exists():
            raise ValidationError({
                "name": "Suite name already exists in this project."
            })

        serializer.save(
            project=project,
            created_by=self.request.user
        )

class TestCaseViewSet(viewsets.ModelViewSet):
    queryset = TestCase.objects.all()
    serializer_class = TestCaseSerializer
    permission_classes = [IsAuthenticated, IsQCForWriteOrReadOnlyInline]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter,]
    filterset_fields = ["review_status",]
    search_fields = ["title", "precondition",]
    ordering_fields = ["id", "title", "review_status",]
    ordering = ["id",]

    def get_queryset(self):
        queryset = TestCase.objects.select_related(
            "suite__project"
        ).prefetch_related("steps")

        user = self.request.user
        if not user.is_superuser:
            if not user.tenant_id:
                return TestCase.objects.none()

            queryset = queryset.filter(
                suite__project__tenant_id=user.tenant_id
            )
        project_id = self.request.query_params.get("project_id")
        if project_id:
            queryset = queryset.filter(
                suite__project_id=project_id
            )

        return queryset
    def perform_create(self, serializer):
        project_id = self.request.data.get("project_id")

        if not project_id:
            raise serializers.ValidationError({
                "project_id": "Project là bắt buộc."
            })

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            raise serializers.ValidationError({
                "project_id": "Project không tồn tại."
            })

        user = self.request.user

        # Kiểm tra tenant
        if not user.is_superuser:
            tenant = (
                getattr(self.request, "tenant", None)
                or getattr(user, "tenant", None)
            )
            if tenant is None:
                raise permissions.PermissionDenied(
                    "User chưa được gán tenant."
                )
            if project.tenant_id != tenant.id:
                raise permissions.PermissionDenied(
                    "Bạn không có quyền tạo Test Case cho project này."
                )
        default_suite, _ = TestSuite.objects.get_or_create(
            project=project,
            name="Unassigned"
        )

        serializer.save(suite=default_suite)
    # Thêm action này vàoViewSet đang kích hoạt
    @action(detail=False, methods=["post"], url_path="commit-ai-generation")
    def commit_ai_generation(self, request):
        """Persist a reviewed AI preview as draft or approved test cases."""
        serializer = CommitAIGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            try:
                job = AIJob.objects.select_for_update().get(
                    id=serializer.validated_data["job_id"],
                    kind="generate_tc",
                    status="SUCCESS",
                )
            except AIJob.DoesNotExist:
                return Response({"error": "AI generation không tồn tại hoặc không hợp lệ."}, status=status.HTTP_404_NOT_FOUND)

            tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
            if not request.user.is_superuser and (tenant is None or job.tenant_id != tenant.id):
                return Response({"error": "Bạn không có quyền xác nhận AI generation này."}, status=status.HTTP_403_FORBIDDEN)

            if job.committed_at:
                return Response(
                    {"error": "AI generation này đã được xác nhận và lưu vào database.", "job_id": job.id},
                    status=status.HTTP_409_CONFLICT,
                )

            context = job.request_context or {}
            requirement_ids = context.get("requirement_ids", [])
            project_id = context.get("project_id")
            if not project_id or not requirement_ids:
                return Response({"error": "AI generation thiếu context Requirement/Project."}, status=status.HTTP_400_BAD_REQUEST)

            requirements = list(Requirement.objects.filter(id__in=requirement_ids, project_id=project_id))
            if len(requirements) != len(requirement_ids):
                return Response({"error": "Requirement nguồn không còn tồn tại hoặc đã thay đổi."}, status=status.HTTP_409_CONFLICT)

            try:
                project = Project.objects.get(id=project_id)
            except Project.DoesNotExist:
                return Response({"error": "Project nguồn không còn tồn tại."}, status=status.HTTP_409_CONFLICT)

            if not request.user.is_superuser and project.tenant_id != tenant.id:
                return Response({"error": "Project không thuộc tenant hiện tại."}, status=status.HTTP_403_FORBIDDEN)

            ai_test_cases = (job.output_json or {}).get("test_cases", [])
            if not isinstance(ai_test_cases, list) or not ai_test_cases:
                return Response({"error": "AI generation không có Test Case hợp lệ để lưu."}, status=status.HTTP_400_BAD_REQUEST)

            default_suite, _ = TestSuite.objects.get_or_create(project=project, name="Unassigned")
            decision = serializer.validated_data["decision"]
            created_test_cases = []
            valid_priorities = {value for value, _ in TestCase.PRIORITY_CHOICES}

            for index, tc_data in enumerate(ai_test_cases, start=1):
                if not isinstance(tc_data, dict):
                    continue

                priority = str(tc_data.get("priority", "medium")).lower()
                test_case = TestCase.objects.create(
                    suite=default_suite,
                    title=tc_data.get("title", "AI Generated Test Case"),
                    precondition=tc_data.get("precondition", ""),
                    priority=priority if priority in valid_priorities else "medium",
                    review_status=decision,
                    source="ai",
                )
                test_case.requirements.set(requirements)

                steps_data = tc_data.get("steps", [])
                if not isinstance(steps_data, list):
                    steps_data = []
                for step_index, step_data in enumerate(steps_data, start=1):
                    if not isinstance(step_data, dict):
                        continue
                    TestStep.objects.create(
                        case=test_case,
                        order=step_data.get("order", step_index),
                        action=step_data.get("action", ""),
                        expected=step_data.get("expected", ""),
                    )

                created_test_cases.append({
                    "test_id": test_case.id,
                    "case_id": f"TC_{index:03d}",
                    "title": test_case.title,
                    "status": test_case.review_status,
                    "suite_id": default_suite.id,
                    "suite_name": default_suite.name,
                    "steps_count": test_case.steps.count(),
                })

            if not created_test_cases:
                return Response({"error": "AI generation không chứa Test Case có thể lưu."}, status=status.HTTP_400_BAD_REQUEST)

            job.review_decision = decision
            job.reviewed_by = request.user
            job.committed_at = timezone.now()
            job.save(update_fields=["review_decision", "reviewed_by", "committed_at"])

        return Response({
            "message": f"QC đã xác nhận và lưu {len(created_test_cases)} Test Case với trạng thái '{decision}'.",
            "job_id": job.id,
            "decision": decision,
            "test_cases": created_test_cases,
        }, status=status.HTTP_201_CREATED)
    

class GenerateTestCaseFromRequirementAPIView(APIView):
    permission_classes = [IsAuthenticated, IsQCForWriteOrReadOnlyInline]

    def post(self, request):
        requirement_ids = request.data.get("requirement_ids", [])

        if not isinstance(requirement_ids, list) or not requirement_ids:
            return Response({"error": "Vui lòng chọn ít nhất 1 Requirement."}, status=status.HTTP_400_BAD_REQUEST)

        requirement_ids = list(dict.fromkeys(requirement_ids))
        requirements = list(Requirement.objects.select_related("project").filter(id__in=requirement_ids))
        if len(requirements) != len(requirement_ids):
            return Response({"error": "Không tìm thấy Requirement tương ứng."}, status=status.HTTP_404_NOT_FOUND)

        project = requirements[0].project
        if any(req.project_id != project.id for req in requirements):
            return Response({"error": "Các Requirement phải thuộc cùng một Project."}, status=status.HTTP_400_BAD_REQUEST)

        tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
        if not request.user.is_superuser and (tenant is None or project.tenant_id != tenant.id):
            return Response({"error": "Bạn không có quyền dùng các Requirement này."}, status=status.HTTP_403_FORBIDDEN)

        combined_text = ""
        for req in requirements:
            combined_text += f"\n[Requirement Ref: {req.ref}] - Tiêu đề: {req.title}\nNội dung: {req.text}\n"

        try:
            job, ai_result = AIService.generate_test_cases(combined_text, tenant=tenant)
        except Exception as e:
            return Response({"error": f"Lỗi xử lý AI: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        tc_list = ai_result.get("test_cases", [])
        if not isinstance(tc_list, list) or not tc_list:
            return Response({"error": "AI không sinh được Test Case hợp lệ."}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        job.request_context = {
            "project_id": project.id,
            "requirement_ids": requirement_ids,
        }
        job.save(update_fields=["request_context"])

        return Response({
            "message": f"AI đã sinh {len(tc_list)} Test Case. Vui lòng xác nhận trạng thái trước khi lưu.",
            "job_id": job.id,
            "requires_qc_confirmation": True,
            "test_cases": tc_list,
        }, status=status.HTTP_200_OK)

from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Project, Requirement, TestCase, TestSuite
from .serializers import RequirementSerializer, TestCaseSerializer, TestSuiteSerializer
from django.shortcuts import get_object_or_404


class ProjectRequirementListCreateAPIView(
    generics.ListCreateAPIView
):

    serializer_class = RequirementSerializer
    permission_classes = [
        IsAuthenticated
    ]

    def get_queryset(self):

        project_id = self.kwargs["project_id"]

        return Requirement.objects.filter(
            project_id=project_id
        )


    def perform_create(self, serializer):

        serializer.save(
            project_id=self.kwargs["project_id"]
        )



class RequirementDetailAPIView(
    generics.RetrieveUpdateDestroyAPIView
):

    queryset = Requirement.objects.all()

    serializer_class = RequirementSerializer

    permission_classes = [
        IsAuthenticated
    ]



class RequirementUploadAPIView(APIView):

    permission_classes = [
        IsAuthenticated
    ]


    def post(self, request):

        project_id = request.data.get(
            "project_id"
        )

        file = request.FILES.get(
            "file"
        )


        if not file:

            return Response(
                {
                    "message": "File is required"
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        requirement = Requirement.objects.create(
            project_id=project_id,
            ref=file.name,
            title=file.name,
            source_type="document",
            file=file
        )


        serializer = RequirementSerializer(
            requirement
        )


        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    
class TestSuiteViewSet(viewsets.ModelViewSet):
    serializer_class = TestSuiteSerializer
    queryset = TestSuite.objects.all()

    def get_queryset(self):
        queryset = TestSuite.objects.all()
        project_id = self.request.query_params.get("project_id")

        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset

    def perform_create(self, serializer):
        project = get_object_or_404(
            Project,
            pk=self.kwargs["project_id"]
        )

        serializer.save(
            project=project,
            created_by=self.request.user
        )

    @action(detail=True, methods=["get"])
    def cases(self, request, pk=None):
        suite = self.get_object()
        serializer = TestCaseSerializer(suite.test_cases.all(), many=True)
        return Response(serializer.data)
    
class TestCaseListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = TestCaseSerializer

    def get_queryset(self):
        queryset = TestCase.objects.all()

        # SEARCH
        search = self.request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(id__icontains=search)
            )

        # FILTER BY REVIEW STATUS
        review_status = self.request.query_params.get(
            "review_status"
        )

        if review_status:
            queryset = queryset.filter(
                review_status=review_status
            )

        return queryset


class TestCaseDetailAPIView(
    generics.RetrieveUpdateDestroyAPIView
):
    queryset = TestCase.objects.all()
    serializer_class = TestCaseSerializer
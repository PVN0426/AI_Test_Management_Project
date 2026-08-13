from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Requirement, TestCase
from .serializers import RequirementSerializer, TestCaseSerializer


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
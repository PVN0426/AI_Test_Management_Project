from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Requirement
from .serializers import RequirementSerializer


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
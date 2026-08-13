from pathlib import Path

from rest_framework import serializers

from apps.bugs.models import Bug, BugAttachment


class BugAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()

    class Meta:
        model = BugAttachment
        fields = ["id", "file", "url", "filename", "uploaded_by", "uploaded_at"]
        read_only_fields = ["id", "url", "filename", "uploaded_by", "uploaded_at"]

    def get_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url

    def get_filename(self, obj):
        return Path(obj.file.name).name


class BugSerializer(serializers.ModelSerializer):
    attachments = serializers.ListField(
        child=serializers.FileField(), write_only=True, required=False
    )
    attachment_items = BugAttachmentSerializer(source="attachments", many=True, read_only=True)
    assignee_name = serializers.CharField(source="assignee.username", read_only=True)
    reporter_name = serializers.CharField(source="reporter.username", read_only=True)

    class Meta:
        model = Bug
        fields = [
            "id", "bug_id", "project", "title", "platform", "environment",
            "steps_to_reproduce", "expected_result", "actual_result", "severity",
            "priority", "status", "assignee", "assignee_name", "reporter",
            "reporter_name", "attachments", "attachment_items", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "assignee", "assignee_name", "reporter", "reporter_name",
            "attachment_items", "created_at", "updated_at",
        ]

    def validate_project(self, project):
        request = self.context["request"]
        user = request.user
        tenant = getattr(request, "tenant", None) or getattr(user, "tenant", None)
        if not (user.is_superuser or user.is_staff) and (tenant is None or project.tenant_id != tenant.id):
            raise serializers.ValidationError("Project không thuộc tenant hiện tại.")
        return project

    def validate_attachments(self, files):
        allowed_extensions = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mov", ".webm", ".avi"}
        max_size = 50 * 1024 * 1024
        for file in files:
            if Path(file.name).suffix.lower() not in allowed_extensions:
                raise serializers.ValidationError("Chỉ hỗ trợ ảnh hoặc video (PNG, JPG, GIF, WEBP, MP4, MOV, WEBM, AVI).")
            if file.size > max_size:
                raise serializers.ValidationError(f"Tệp '{file.name}' vượt quá giới hạn 10 MB.")
        return files

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        if self.instance and user.role == "dev" and not user.is_superuser:
            editable_fields = {"status"}
            attempted_fields = set(attrs)
            if not attempted_fields.issubset(editable_fields):
                raise serializers.ValidationError("Developer chỉ được cập nhật trạng thái. Hãy nhận bug qua endpoint claim.")
        return attrs

    def create(self, validated_data):
        files = validated_data.pop("attachments", [])
        bug = Bug.objects.create(reporter=self.context["request"].user, **validated_data)
        self._create_attachments(bug, files)
        return bug

    def update(self, instance, validated_data):
        files = validated_data.pop("attachments", [])
        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)
        instance.save()
        self._create_attachments(instance, files)
        return instance

    def _create_attachments(self, bug, files):
        BugAttachment.objects.bulk_create([
            BugAttachment(bug=bug, file=file, uploaded_by=self.context["request"].user)
            for file in files
        ])

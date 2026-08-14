from rest_framework import serializers
from apps.testcases.models import Project, Requirement, TestSuite, TestCase, TestStep
from apps.tenants.models import Tenant

class ProjectSerializer(serializers.ModelSerializer):
    tenant = serializers.PrimaryKeyRelatedField(queryset=Tenant.objects.all(), required=False)

    class Meta:
        model = Project
        fields = [
            "id",
            "tenant",
            "name",
            "key",
            "description",
        ]
        validators = []

    def validate_key(self, value):
        return value.strip().upper()

    def validate_name(self, value):
        return value.strip()

    def validate(self, attrs):
        tenant = attrs.get("tenant") or getattr(self.context["request"].user, "tenant", None)
        if tenant is None:
            raise serializers.ValidationError({
                "tenant": "Tenant must be provided or the authenticated user must belong to a tenant."
            })

        attrs["tenant"] = tenant
        key = attrs.get("key")

        if self.instance:
            if tenant and key and Project.objects.filter(tenant=tenant, key=key).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError({
                    "key": "A project with this key already exists for the selected tenant."
                })
        else:
            if tenant and key and Project.objects.filter(tenant=tenant, key=key).exists():
                raise serializers.ValidationError({
                    "key": "A project with this key already exists for the selected tenant."
                })

        return attrs



class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = "__all__"

class TestSuiteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSuite
        fields = [
            "id",
            "name",
            "precondition",
            "priority",
            "test_type",
            "estimate_time",
            "requirement_ref",
        ]
        read_only_fields = ["id"]


class TestSuiteListSerializer(serializers.ModelSerializer):
    project = serializers.IntegerField(source="project.id", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    test_case_count = serializers.SerializerMethodField()

    class Meta:
        model = TestSuite
        fields = [
            "id",
            "name",
            "precondition",
            "project",
            "project_name",
            "priority",
            "test_type",
            "estimate_time",
            "requirement_ref",
            "created_by",
            "created_at",
            "updated_at",
            "test_case_count",
        ]

    def get_test_case_count(self, obj):
        return obj.test_cases.count()


class TestSuiteDetailSerializer(serializers.ModelSerializer):
    project = serializers.IntegerField(source="project.id", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    test_case_count = serializers.SerializerMethodField()

    class Meta:
        model = TestSuite
        fields = [
            "id",
            "name",
            "precondition",
            "project",
            "project_name",
            "priority",
            "test_type",
            "estimate_time",
            "requirement_ref",
            "created_by",
            "created_at",
            "updated_at",
            "test_case_count",
        ]

    def get_test_case_count(self, obj):
        return obj.test_cases.count()

class TestStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestStep
        fields = ["id", "order", "action", "expected"]
        read_only_fields = ["id"]

class TestCaseSerializer(serializers.ModelSerializer):
    steps = TestStepSerializer(many=True, required=False)

    class Meta:
        model = TestCase
        fields = [
            "id",
            "suite",
            "requirements",
            "title",
            "precondition",
            "priority",
            "review_status",
            "test_result",
            "source",
            "technique",
            "version",
            "steps",
        ]

        read_only_fields = ["id", "suite"]

    def create(self, validated_data):
        steps_data = validated_data.pop("steps", [])

        test_case = TestCase.objects.create(**validated_data)

        for step_data in steps_data:
            TestStep.objects.create(case=test_case, **step_data)

        return test_case

    def update(self, instance, validated_data):
        steps_data = validated_data.pop("steps", None)

        # Update Test Case
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Nếu request có gửi steps thì thay toàn bộ steps cũ
        if steps_data is not None:
            instance.steps.all().delete()

            for step_data in steps_data:
                TestStep.objects.create(case=instance, **step_data)

        return instance

class CommitAIGenerationSerializer(serializers.Serializer):
    job_id = serializers.IntegerField(min_value=1)
    decision = serializers.ChoiceField(choices=["draft", "approved"])

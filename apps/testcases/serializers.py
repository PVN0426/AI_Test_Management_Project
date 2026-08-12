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

class TestSuiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSuite
        fields = "__all__"


class TestStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestStep
        fields = ["id", "order", "action", "expected"]


class TestCaseSerializer(serializers.ModelSerializer):
    steps = TestStepSerializer(many=True, read_only=True)
    suite_name = serializers.CharField(source="suite.name", read_only=True)
    is_assigned = serializers.SerializerMethodField()

    class Meta:
        model = TestCase
        fields = [
            "id",
            "suite",
            "suite_name",
            "requirements",
            "title",
            "precondition",
            "priority",
            "status",
            "source",
            "technique",
            "version",
            "is_assigned",
            "steps",
        ]

    def get_is_assigned(self, obj):
        return obj.suite.name != "Unassigned"


class CommitAIGenerationSerializer(serializers.Serializer):
    job_id = serializers.IntegerField(min_value=1)
    decision = serializers.ChoiceField(choices=["draft", "approved"])

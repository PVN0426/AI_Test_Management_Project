from rest_framework import serializers
from apps.testcases.models import Project
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

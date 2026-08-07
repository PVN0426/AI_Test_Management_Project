from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from apps.tenants.models import Tenant
from apps.tenants.serializers import TenantSerializer


class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tenant.objects.filter(is_active=True)
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

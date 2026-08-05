from rest_framework import permissions

class IsOrgAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'org_admin' or request.user.is_superuser)
        )


class IsQCUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'qc'
        )


class IsDevUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'dev'
        )


class IsQCContextAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.role == 'org_admin':
            return False

        if request.method in permissions.SAFE_METHODS:
            return request.user.role in ['qc', 'dev']

        return request.user.role == 'qc'
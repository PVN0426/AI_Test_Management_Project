class TenantMiddleware:
    """Simple tenant middleware placeholder.

    This middleware is required by settings and can be extended later
    to resolve tenants from hostname, request headers, or session data.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None
        return self.get_response(request)

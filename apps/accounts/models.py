from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model for the accounts app."""
    # Add custom fields here if needed in the future.
    pass

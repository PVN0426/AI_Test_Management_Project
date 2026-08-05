from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.accounts.models import User

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField(required=False, write_only=True)
    username = serializers.CharField(required=False)

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        email = attrs.pop('email', None)

        if email:
            user = User.objects.filter(email__iexact=email).first()
            if user:
                attrs[self.username_field] = user.username

        if not username and not email:
            raise serializers.ValidationError(
                {'detail': 'Vui lòng cung cấp username hoặc email cùng password.'}
            )

        if username and '@' in username and not email:
            user = User.objects.filter(email__iexact=username).first()
            if user:
                attrs[self.username_field] = user.username

        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
            'tenant_id': self.user.tenant.id if self.user.tenant else None
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'is_active']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
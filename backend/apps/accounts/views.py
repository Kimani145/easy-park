from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import AllowAny
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework import status
from apps.accounts.serializers import TokenObtainSerializer, UserRegistrationSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter

class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = TokenObtainSerializer

    @extend_schema(
        summary="Login — obtain JWT tokens",
        description=(
            "Returns access and refresh JWTs. "
            "The access token contains 'role' and 'username' claims. "
            "Use the access token as: Authorization: Bearer <token>"
        ),
        tags=["Auth"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

class RegisterView(CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    @extend_schema(
        summary="Register a new user",
        description="Creates a DRIVER or MARSHAL account. Returns user id and role.",
        tags=["Auth"],
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            "email": user.email,
            "role": user.role,
            "message": "User registered successfully"
        }, status=status.HTTP_201_CREATED)

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import AllowAny
from apps.accounts.serializers import TokenObtainSerializer

class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = TokenObtainSerializer

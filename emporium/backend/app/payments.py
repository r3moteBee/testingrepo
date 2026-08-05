from abc import ABC, abstractmethod
from typing import Optional


class PaymentProvider(ABC):
    """Abstract base class for payment providers."""

    @abstractmethod
    def create_payment_intent(
        self,
        amount: int,
        currency: str,
        items: list,
    ) -> dict:
        """Create a payment intent and return client secret."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the provider name."""
        pass


class MockProvider(PaymentProvider):
    """Mock payment provider for development/testing."""

    def create_payment_intent(
        self,
        amount: int,
        currency: str,
        items: list,
    ) -> dict:
        """Create a mock payment intent."""
        # Generate a fake client secret
        import secrets

        client_secret = f"pi_{secrets.token_hex(24)}_mock"

        return {
            "client_secret": client_secret,
            "amount": amount,
            "currency": currency,
            "provider": self.name,
        }

    @property
    def name(self) -> str:
        return "mock"


class StripeProvider(PaymentProvider):
    """Stripe payment provider."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    def create_payment_intent(
        self,
        amount: int,
        currency: str,
        items: list,
    ) -> dict:
        """Create a Stripe payment intent."""
        if not self.api_key:
            raise ValueError("Stripe API key not configured")

        # Lazy import stripe
        try:
            import stripe
        except ImportError:
            raise ImportError(
                "stripe package not installed. "
                "Install with: pip install stripe",
            )

        # Configure Stripe
        stripe.api_key = self.api_key

        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            payment_method_types=["card"],
            description="Emporium purchase",
        )

        return {
            "client_secret": intent.client_secret,
            "amount": amount,
            "currency": currency,
            "provider": self.name,
        }

    @property
    def name(self) -> str:
        return "stripe"


def get_payment_provider() -> PaymentProvider:
    """Get the configured payment provider."""
    from .config import settings

    if settings.payment_provider.lower() == "stripe":
        return StripeProvider(api_key=settings.stripe_secret_key)
    else:
        return MockProvider()

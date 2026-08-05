from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas, security, payments
from ..database import get_db

router = APIRouter(prefix="/payments", tags=["payments"])


def get_current_user(
    token: str = Depends(security.oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Get current authenticated user."""
    payload = security.verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    db_user = db.query(models.User).filter(models.User.email == email).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return db_user


@router.post("/create-intent", response_model=schemas.PaymentIntentResponse)
async def create_payment_intent(
    payment_in: schemas.PaymentIntentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a payment intent."""
    # Calculate total amount from DB prices
    total_amount = 0

    for item in payment_in.items:
        product = (
            db.query(models.Product).filter(models.Product.id == item.product_id).first()
        )

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found",
            )

        if not product.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {item.product_id} is not active",
            )

        total_amount += product.price_cents * item.quantity

    if total_amount == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total amount must be greater than 0",
        )

    # Get currency from first product
    currency = "usd"
    if payment_in.items:
        # Get currency from DB product
        first_product = (
            db.query(models.Product)
            .filter(models.Product.id == payment_in.items[0].product_id)
            .first()
        )
        if first_product:
            currency = first_product.currency

    # Get the configured payment provider
    payment_provider = payments.get_payment_provider()

    # Create payment intent
    intent = payment_provider.create_payment_intent(
        amount=total_amount,
        currency=currency,
        items=[item.model_dump() for item in payment_in.items],
    )

    # Store payment intent in database
    db_intent = models.PaymentIntent(
        user_id=current_user.id,
        client_secret=intent["client_secret"],
        amount=total_amount,
        currency=currency,
        provider=intent["provider"],
    )

    db.add(db_intent)
    db.commit()
    db.refresh(db_intent)

    return intent

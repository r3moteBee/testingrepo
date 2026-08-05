from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, aliased
from typing import List
import slugify  # Will be used for auto-generating slugs

from app import schemas, models
from app.dependencies import get_db, get_current_active_user
from app.auth import get_password_hash, authenticate_user, create_access_token
from datetime import timedelta
from sqlalchemy import func

router = APIRouter(prefix="/api", tags=["auth"])

@router.post("/auth/register", response_model=schemas.Token)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        models.User.email == user_in.email
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user with hashed password
    hashed_password = get_password_hash(user_in.password)
    db_user = models.User(
        email=user_in.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": db_user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/auth/login", response_model=schemas.Token)
def login_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """Login and get access token."""
    user = authenticate_user(db, user_in.email, user_in.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=schemas.UserOut)
def read_users_me(
    current_user: models.User = Depends(get_current_active_user)
):
    """Get current user information."""
    return current_user

class ProductRouter(APIRouter):
    """API router for product-related endpoints."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.prefix = "/api"
        self.tags = ["products"]

product_router = ProductRouter()

@product_router.get("/products", response_model=List[schemas.ProductOut])
def read_products(db: Session = Depends(get_db)):
    """Get all active products with their first image."""
    # Use subquery to get first image per product
    subq = (
        db.query(models.ProductImage)
        .filter(models.ProductImage.position == 0)
        .subquery()
    )
    
    products = (
        db.query(models.Product)
        .outerjoin(subq, models.Product.id == subq.c.product_id)
        .filter(models.Product.active == True)
        .all()
    )
    
    # Build result with image data
    result = []
    for product in products:
        product_out = schemas.ProductOut(
            id=product.id,
            name=product.name,
            slug=product.slug,
            description=product.description,
            price_cents=product.price_cents,
            currency=product.currency,
            active=product.active,
            created_at=product.created_at
        )
        if product.images and len(product.images) > 0:
            # Find first image (position 0 or the first one)
            for img in product.images:
                if img.position == 0:
                    product_out.image = schemas.ProductImageOut(
                        id=img.id,
                        url=img.url,
                        alt=img.alt,
                        position=img.position
                    )
                    break
            else:
                # Use first image if position 0 doesn't exist
                img = product.images[0]
                product_out.image = schemas.ProductImageOut(
                    id=img.id,
                    url=img.url,
                    alt=img.alt,
                    position=img.position
                )
        result.append(product_out)
    
    return result

@product_router.get("/products/{slug}", response_model=schemas.ProductDetail)
def read_product(slug: str, db: Session = Depends(get_db)):
    """Get product by slug with all images."""
    product = db.query(models.Product).filter(
        models.Product.slug == slug,
        models.Product.active == True
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    product_out = schemas.ProductDetail(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        price_cents=product.price_cents,
        currency=product.currency,
        active=product.active,
        created_at=product.created_at
    )
    
    # Add images sorted by position
    for img in sorted(product.images, key=lambda x: x.position):
        product_out.images.append(schemas.ProductImageOut(
            id=img.id,
            url=img.url,
            alt=img.alt,
            position=img.position
        ))
    
    return product_out

@product_router.post("/products", response_model=schemas.ProductOut)
def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new product (auto-generate slug)."""
    # Generate unique slug
    base_slug = slugify.slugify(product_in.name)
    slug = base_slug
    counter = 1
    
    while db.query(models.Product).filter(
        models.Product.slug == slug
    ).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    db_product = models.Product(
        name=product_in.name,
        slug=slug,
        description=product_in.description,
        price_cents=product_in.price_cents,
        currency=product_in.currency
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Return with first image (if any)
    product_out = schemas.ProductOut(
        id=db_product.id,
        name=db_product.name,
        slug=db_product.slug,
        description=db_product.description,
        price_cents=db_product.price_cents,
        currency=db_product.currency,
        active=db_product.active,
        created_at=db_product.created_at
    )
    
    if db_product.images:
        img = db_product.images[0]
        product_out.image = schemas.ProductImageOut(
            id=img.id,
            url=img.url,
            alt=img.alt,
            position=img.position
        )
    
    return product_out

@product_router.post("/products/{id}/images", response_model=schemas.ProductImageOut)
def add_product_image(
    id: int,
    image_in: schemas.ProductImageBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Add an image to a product (max 5 images)."""
    # Check if product exists
    product = db.query(models.Product).filter(
        models.Product.id == id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    # Check image count
    image_count = db.query(func.count(models.ProductImage.id)).filter(
        models.ProductImage.product_id == id
    ).scalar()
    
    if image_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product can have at most 5 images",
        )
    
    db_image = models.ProductImage(
        product_id=id,
        url=image_in.url,
        alt=image_in.alt,
        position=image_in.position
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    
    return schemas.ProductImageOut(
        id=db_image.id,
        url=db_image.url,
        alt=db_image.alt,
        position=db_image.position
    )

# Import and add payment router
class PaymentProvider:
    """Abstract base class for payment providers."""
    async def create_payment_intent(
        self, items: List[schemas.CartItem], db: Session
    ) -> dict:
        raise NotImplementedError

class MockPaymentProvider(PaymentProvider):
    """Mock payment provider for testing."""
    async def create_payment_intent(
        self, items: List[schemas.CartItem], db: Session
    ) -> dict:
        total = 0
        for item in items:
            product = db.query(models.Product).filter(
                models.Product.id == item.product_id
            ).first()
            if product:
                total += product.price_cents * item.quantity
        
        return {
            "client_secret": f"mock_secret_{total}_{len(items)}",
            "amount": total,
            "currency": "usd",
            "provider": "mock"
        }

class StripePaymentProvider(PaymentProvider):
    """Stripe payment provider (lazy import)."""
    def __init__(self):
        self._stripe = None
    
    @property
    def stripe(self):
        if self._stripe is None:
            import stripe
            self._stripe = stripe
        return self._stripe
    
    async def create_payment_intent(
        self, items: List[schemas.CartItem], db: Session
    ) -> dict:
        self.stripe.api_key = "sk_test_"  # From environment in production
        
        line_items = []
        total = 0
        for item in items:
            product = db.query(models.Product).filter(
                models.Product.id == item.product_id
            ).first()
            if product:
                line_items.append({
                    "price_data": {
                        "currency": product.currency,
                        "product_data": {"name": product.name},
                        "unit_amount": product.price_cents,
                    },
                    "quantity": item.quantity,
                })
                total += product.price_cents * item.quantity
        
        if not line_items:
            raise HTTPException(status_code=400, detail="No valid items")
        
        payment_intent = self.stripe.PaymentIntent.create(
            amount=total,
            currency="usd",
            payment_method_types=["card"],
            description="Emporium Purchase",
        )
        
        return {
            "client_secret": payment_intent.client_secret,
            "amount": total,
            "currency": "usd",
            "provider": "stripe"
        }

payment_router = APIRouter(prefix="/api", tags=["payments"])

@payment_router.post("/payments/create-intent", response_model=schemas.PaymentIntentOut)
def create_payment_intent(
    payment_in: schemas.PaymentIntentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a payment intent."""
    import os
    
    provider_name = os.getenv("PAYMENT_PROVIDER", "mock")
    
    if provider_name == "stripe":
        provider = StripePaymentProvider()
    else:
        provider = MockPaymentProvider()
    
    return provider.create_payment_intent(payment_in.items, db)

# Add all routers to main router
from fastapi import FastAPI

def include_routers(app: FastAPI):
    """Include all API routers."""
    app.include_router(router)
    app.include_router(product_router)
    app.include_router(payment_router)
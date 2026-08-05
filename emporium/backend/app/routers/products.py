from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(prefix="/products", tags=["products"])


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


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from name."""
    import re

    # Convert to lowercase and replace spaces with hyphens
    slug = name.lower().strip()
    # Replace multiple spaces with single hyphen
    slug = re.sub(r"\s+", "-", slug)
    # Remove special characters
    slug = re.sub(r"[^\w\-]", "", slug)
    # Remove consecutive hyphens
    slug = re.sub(r"\-{2,}", "-", slug)
    return slug


@router.get("/", response_model=List[schemas.Product])
async def list_products(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """List all active products with their images."""
    products = (
        db.query(models.Product)
        .filter(models.Product.active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Ensure images are loaded for each product
    for product in products:
        if not hasattr(product, "images"):
            product.images = []

    return products


@router.get("/{slug}", response_model=schemas.Product)
async def get_product(
    slug: str,
    db: Session = Depends(get_db),
):
    """Get a single product by slug with all images."""
    product = (
        db.query(models.Product)
        .filter(models.Product.slug == slug, models.Product.active == True)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Ensure images are loaded
    if not hasattr(product, "images"):
        product.images = []

    return product


@router.post("/", response_model=schemas.Product)
async def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new product (authenticated users only)."""
    # Generate slug from name
    slug = generate_slug(product_in.name)

    # Check if slug already exists
    existing = db.query(models.Product).filter(models.Product.slug == slug).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this name already exists",
        )

    # Create product
    db_product = models.Product(
        name=product_in.name,
        slug=slug,
        description=product_in.description,
        price_cents=product_in.price_cents,
        currency=product_in.currency or "usd",
        active=product_in.active,
        owner_id=current_user.id,
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    return db_product


@router.post("/{product_id}/images", response_model=schemas.ProductImage)
async def upload_product_image(
    product_id: int,
    image_in: schemas.ProductImageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload an image for a product (max 5 images per product)."""
    # Check if product exists
    product = db.query(models.Product).filter(models.Product.id == product_id).first()

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Check image count
    image_count = (
        db.query(models.ProductImage)
        .filter(models.ProductImage.product_id == product_id)
        .count()
    )

    if image_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product can have at most 5 images",
        )

    # Get next position
    max_position = (
        db.query(models.ProductImage)
        .filter(models.ProductImage.product_id == product_id)
        .with_entities(models.ProductImage.position)
        .order_by(models.ProductImage.position.desc())
        .first()
    )

    position = (max_position[0] + 1) if max_position else 0

    # Create image record
    db_image = models.ProductImage(
        product_id=product_id,
        url=image_in.url,
        alt=image_in.alt or f"Product image {position + 1}",
        position=position,
    )

    db.add(db_image)
    db.commit()
    db.refresh(db_image)

    return db_image

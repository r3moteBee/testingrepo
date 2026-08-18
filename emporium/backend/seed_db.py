#!/usr/bin/env python3
"""Seed script for Emporium database."""
import sys
import os

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from datetime import datetime

from app.database import engine, Base, get_db
from app.models import User, Product, ProductImage


def seed_database():
    """Seed the database with initial data."""
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Get database session
    db = Session(engine)

    try:
        # Create a test user
        from app.security import get_password_hash

        hashed_password = get_password_hash("testpassword123")

        test_user = User(
            email="test@example.com",
            password_hash=hashed_password,
            created_at=datetime.utcnow(),
        )

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if not existing_user:
            db.add(test_user)
            print(f"Created user: {test_user.email}")
        else:
            test_user = existing_user
            print(f"User already exists: {test_user.email}")

        db.commit()

        # Create sample products
        products_data = [
            {
                "name": "Premium Wireless Headphones",
                "description": "High-quality wireless headphones with noise cancellation",
                "price_cents": 29999,
                "currency": "usd",
                "active": True,
            },
            {
                "name": "Smart Watch Pro",
                "description": "Advanced smartwatch with health tracking and GPS",
                "price_cents": 34999,
                "currency": "usd",
                "active": True,
            },
            {
                "name": "Mechanical Keyboard",
                "description": "RGB mechanical keyboard with Cherry MX switches",
                "price_cents": 14999,
                "currency": "usd",
                "active": True,
            },
        ]

        for product_data in products_data:
            # Check if product already exists
            existing_product = (
                db.query(Product).filter(Product.name == product_data["name"]).first()
            )
            if not existing_product:
                product = Product(
                    name=product_data["name"],
                    slug=product_data["name"].lower().replace(" ", "-"),
                    description=product_data["description"],
                    price_cents=product_data["price_cents"],
                    currency=product_data["currency"],
                    active=product_data["active"],
                    owner_id=test_user.id,
                )
                db.add(product)
                print(f"Created product: {product.name}")
            else:
                print(f"Product already exists: {existing_product.name}")

        db.commit()

        # Add sample images to products
        product_images = [
            {
                "product_id": 1,
                "url": "/images/products/1/headphones_main.jpg",
                "alt": "Premium Wireless Headphones - Front view",
                "position": 0,
            },
            {
                "product_id": 1,
                "url": "/images/products/1/headphones_side.jpg",
                "alt": "Premium Wireless Headphones - Side view",
                "position": 1,
            },
            {
                "product_id": 2,
                "url": "/images/products/2/smartwatch_main.jpg",
                "alt": "Smart Watch Pro - On wrist",
                "position": 0,
            },
        ]

        for img_data in product_images:
            existing_image = (
                db.query(ProductImage)
                .filter(
                    ProductImage.product_id == img_data["product_id"],
                    ProductImage.url == img_data["url"],
                )
                .first()
            )
            if not existing_image:
                image = ProductImage(
                    product_id=img_data["product_id"],
                    url=img_data["url"],
                    alt=img_data["alt"],
                    position=img_data["position"],
                )
                db.add(image)
                print(
                    f"Created image for product {img_data['product_id']}: {img_data['url']}"
                )

        db.commit()
        print("\nDatabase seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

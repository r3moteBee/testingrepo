"""
Seed script for Emporium database.
Creates sample users, products, and product images.
"""
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, Product, ProductImage
from app.auth import get_password_hash

def seed_database():
    """Seed the database with sample data."""
    db = SessionLocal()
    
    try:
        # Create sample users
        user1 = User(
            email="admin@emporium.com",
            password_hash=get_password_hash("admin123")
        )
        user2 = User(
            email="user@emporium.com",
            password_hash=get_password_hash("user123")
        )
        db.add(user1)
        db.add(user2)
        
        # Create sample products
        product1 = Product(
            name="Premium Wireless Headphones",
            slug="premium-wireless-headphones",
            description="High-quality wireless headphones with noise cancellation and 30-hour battery life.",
            price_cents=29999,
            currency="usd",
            active=True
        )
        product2 = Product(
            name="Smart Fitness Watch",
            slug="smart-fitness-watch",
            description="Track your fitness goals with this smart watch featuring heart rate monitoring and GPS.",
            price_cents=19999,
            currency="usd",
            active=True
        )
        product3 = Product(
            name="Mechanical Keyboard",
            slug="mechanical-keyboard",
            description="RGB mechanical keyboard with Cherry MX switches for the ultimate typing experience.",
            price_cents=14999,
            currency="usd",
            active=True
        )
        product4 = Product(
            name="USB-C Hub",
            slug="usb-c-hub",
            description="7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader.",
            price_cents=4999,
            currency="usd",
            active=True
        )
        product5 = Product(
            name="Wireless Mouse",
            slug="wireless-mouse",
            description="Ergonomic wireless mouse with adjustable DPI and long battery life.",
            price_cents=3999,
            currency="usd",
            active=True
        )
        
        db.add(product1)
        db.add(product2)
        db.add(product3)
        db.add(product4)
        db.add(product5)
        
        db.commit()
        db.refresh(user1)
        db.refresh(product1)
        
        # Create product images
        images = [
            ProductImage(
                product_id=product1.id,
                url="https://example.com/images/headphones-main.jpg",
                alt="Premium Wireless Headphones - Main View",
                position=0
            ),
            ProductImage(
                product_id=product1.id,
                url="https://example.com/images/headphones-side.jpg",
                alt="Premium Wireless Headphones - Side View",
                position=1
            ),
            ProductImage(
                product_id=product2.id,
                url="https://example.com/images/watch-main.jpg",
                alt="Smart Fitness Watch - Main View",
                position=0
            ),
            ProductImage(
                product_id=product2.id,
                url="https://example.com/images/watch-band.jpg",
                alt="Smart Fitness Watch - Band Close-up",
                position=1
            ),
            ProductImage(
                product_id=product2.id,
                url="https://example.com/images/watch-screen.jpg",
                alt="Smart Fitness Watch - Screen Display",
                position=2
            ),
            ProductImage(
                product_id=product3.id,
                url="https://example.com/images/keyboard-main.jpg",
                alt="Mechanical Keyboard - Main View",
                position=0
            ),
            ProductImage(
                product_id=product3.id,
                url="https://example.com/images/keyboard-keys.jpg",
                alt="Mechanical Keyboard - Key Switches",
                position=1
            ),
            ProductImage(
                product_id=product4.id,
                url="https://example.com/images/hub-main.jpg",
                alt="USB-C Hub - Main View",
                position=0
            ),
            ProductImage(
                product_id=product5.id,
                url="https://example.com/images/mouse-main.jpg",
                alt="Wireless Mouse - Main View",
                position=0
            ),
        ]
        
        db.add_all(images)
        db.commit()
        
        print("Database seeded successfully!")
        print(f"Created {len(images)} product images")
        
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables first
    Base.metadata.create_all(bind=engine)
    seed_database()
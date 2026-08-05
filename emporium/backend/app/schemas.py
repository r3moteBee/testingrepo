from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class ProductImageBase(BaseModel):
    url: str
    alt: Optional[str] = None
    position: int

class ProductImageOut(ProductImageBase):
    id: int

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price_cents: int
    currency: str = "usd"

class ProductCreate(ProductBase):
    pass

class ProductOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    price_cents: int
    currency: str
    active: bool
    created_at: datetime
    image: Optional[ProductImageOut] = None

    class Config:
        from_attributes = True

class ProductDetail(ProductOut):
    images: List[ProductImageOut] = []

class CartItem(BaseModel):
    product_id: int
    quantity: int = 1

class PaymentIntentCreate(BaseModel):
    items: List[CartItem]

class PaymentIntentOut(BaseModel):
    client_secret: str
    amount: int
    currency: str
    provider: str
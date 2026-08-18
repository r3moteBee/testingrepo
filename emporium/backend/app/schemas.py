from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Product image schemas
class ProductImageBase(BaseModel):
    url: str
    alt: Optional[str] = None
    position: int


class ProductImageCreate(ProductImageBase):
    pass


class ProductImage(ProductImageBase):
    id: int
    product_id: int

    class Config:
        from_attributes = True


# Product schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price_cents: int
    currency: str = "usd"
    active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    currency: Optional[str] = None
    active: Optional[bool] = None


class Product(ProductBase):
    id: int
    slug: str
    created_at: datetime
    images: List[ProductImage] = []

    class Config:
        from_attributes = True


# Payment schemas
class CartItem(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)


class PaymentIntentCreate(BaseModel):
    items: List[CartItem]


class PaymentIntentResponse(BaseModel):
    client_secret: str
    amount: int
    currency: str
    provider: str

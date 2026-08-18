from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=schemas.Token)
async def register_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    """Register a new user."""
    # Check if user already exists
    db_user = (
        db.query(models.User).filter(models.User.email == user_in.email).first()
    )

    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    hashed_password = security.get_password_hash(user_in.password)
    db_user = models.User(
        email=user_in.email,
        password_hash=hashed_password,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Create access token
    access_token = security.create_access_token(
        data={"sub": db_user.email},
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
async def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login and get access token."""
    # Find user by email
    db_user = (
        db.query(models.User).filter(models.User.email == form_data.username).first()
    )

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not security.verify_password(form_data.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = security.create_access_token(
        data={"sub": db_user.email},
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.User)
async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(security.oauth2_scheme),
):
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = security.verify_token(token)
    if payload is None:
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    db_user = db.query(models.User).filter(models.User.email == email).first()

    if db_user is None:
        raise credentials_exception

    return db_user

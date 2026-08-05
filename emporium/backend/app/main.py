from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, get_db
from .routers import auth, products, payments

# Initialize FastAPI app
app = FastAPI(
    title="Emporium API",
    description="E-commerce API for Emporium",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Emporium API",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check(db=Depends(get_db)):
    """Health check endpoint."""
    try:
        # Try a simple query
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": f"error: {str(e)}"}


# Include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(payments.router)

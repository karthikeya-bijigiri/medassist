"""
Pharmacist Service - FastAPI Application
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.routers import inventory, orders, profile
from app.dependencies import connect_db, disconnect_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","service":"pharmacist-service","level":"%(levelname)s","message":"%(message)s"}'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting pharmacist service")
    await connect_db()
    yield
    # Shutdown
    logger.info("Shutting down pharmacist service")
    await disconnect_db()


app = FastAPI(
    title="MedAssist Pharmacist Service",
    description="Pharmacist management service for MedAssist platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "pharmacist-service",
    }


# Prometheus metrics endpoint
@app.get("/metrics")
async def metrics():
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from fastapi.responses import Response
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


# Include routers
app.include_router(inventory.router, prefix="/api/v1/pharmacist", tags=["Inventory"])
app.include_router(orders.router, prefix="/api/v1/pharmacist", tags=["Orders"])
app.include_router(profile.router, prefix="/api/v1/pharmacist", tags=["Profile"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug
    )

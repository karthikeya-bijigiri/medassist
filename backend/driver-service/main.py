"""
Driver Service - FastAPI Application
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.routers import deliveries, profile
from app.dependencies import connect_db, disconnect_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","service":"driver-service","level":"%(levelname)s","message":"%(message)s"}'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting driver service")
    await connect_db()
    yield
    # Shutdown
    logger.info("Shutting down driver service")
    await disconnect_db()


app = FastAPI(
    title="MedAssist Driver Service",
    description="Driver management service for MedAssist platform",
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
        "service": "driver-service",
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
app.include_router(deliveries.router, prefix="/api/v1/driver", tags=["Deliveries"])
app.include_router(profile.router, prefix="/api/v1/driver", tags=["Profile"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug
    )

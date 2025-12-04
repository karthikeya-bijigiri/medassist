"""
Dependencies for Driver Service
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# Database clients
_mongo_client = None
_db = None


async def connect_db():
    """Connect to MongoDB"""
    global _mongo_client, _db
    _mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
    _db = _mongo_client.get_default_database()
    logger.info("Connected to MongoDB")


async def disconnect_db():
    """Disconnect from MongoDB"""
    global _mongo_client
    if _mongo_client:
        _mongo_client.close()
        logger.info("Disconnected from MongoDB")


def get_database():
    """Get database instance"""
    return _db


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Validate JWT token and return user data"""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience
        )
        
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def require_driver(user: dict = Depends(get_current_user)) -> dict:
    """Require driver role"""
    roles = user.get("roles", [])
    if "driver" not in roles and "admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Driver access required"
        )
    return user

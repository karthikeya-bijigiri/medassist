"""
Configuration settings for Pharmacist Service
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Service config
    port: int = 8001
    debug: bool = False
    
    # Database
    mongodb_uri: str = "mongodb://localhost:27017/medassist"
    redis_uri: str = "redis://localhost:6379"
    rabbitmq_uri: str = "amqp://localhost:5672"
    
    # JWT
    jwt_secret: str = "your-256-bit-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "medassist-auth"
    jwt_audience: str = "medassist-services"
    
    # CORS
    cors_origin: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()

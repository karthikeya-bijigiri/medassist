"""
Driver models for Driver Service
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DriverProfile(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class LocationUpdate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)

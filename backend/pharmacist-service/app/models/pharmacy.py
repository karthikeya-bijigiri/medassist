"""
Pharmacy models for Pharmacist Service
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PharmacyProfile(BaseModel):
    id: str
    name: str
    address: str
    opening_hours: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool
    rating: float
    rating_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class PharmacyProfileUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    opening_hours: Optional[str] = None
    contact_phone: Optional[str] = None

"""
Delivery models for Driver Service
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class DeliveryStatus(str, Enum):
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    FAILED = "failed"


class Location(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class DeliveryStatusUpdate(BaseModel):
    status: DeliveryStatus
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lon: Optional[float] = Field(default=None, ge=-180, le=180)
    notes: Optional[str] = None


class DeliveryOTPConfirm(BaseModel):
    otp: str = Field(pattern=r'^\d{6}$')


class DeliveryResponse(BaseModel):
    id: str
    order_id: str
    driver_id: Optional[str] = None
    status: DeliveryStatus
    assigned_at: Optional[datetime] = None
    pickup_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    current_location: Optional[dict] = None
    
    class Config:
        from_attributes = True

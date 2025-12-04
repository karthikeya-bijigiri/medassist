"""
Order models for Pharmacist Service
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum


class OrderStatus(str, Enum):
    CREATED = "created"
    ACCEPTED_BY_PHARMACY = "accepted_by_pharmacy"
    PREPARED = "prepared"
    DRIVER_ASSIGNED = "driver_assigned"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"


class OrderItem(BaseModel):
    medicine_id: str
    batch_no: str
    qty: int
    price: float
    tax: float


class OrderResponse(BaseModel):
    id: str
    user_id: str
    pharmacy_id: str
    items: List[OrderItem]
    total_amount: float
    status: OrderStatus
    payment_status: str
    shipping_address: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeclineOrderRequest(BaseModel):
    reason: Optional[str] = None

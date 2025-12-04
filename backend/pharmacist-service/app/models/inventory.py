"""
Inventory models for Pharmacist Service
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class InventoryItemCreate(BaseModel):
    medicine_id: str
    batch_no: str
    expiry_date: date
    quantity_available: int = Field(ge=0)
    mrp: float = Field(ge=0)
    selling_price: float = Field(ge=0)


class InventoryItemUpdate(BaseModel):
    batch_no: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity_available: Optional[int] = Field(default=None, ge=0)
    mrp: Optional[float] = Field(default=None, ge=0)
    selling_price: Optional[float] = Field(default=None, ge=0)


class InventoryItemResponse(BaseModel):
    id: str
    pharmacy_id: str
    medicine_id: str
    batch_no: str
    expiry_date: datetime
    quantity_available: int
    mrp: float
    selling_price: float
    reserved_qty: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

"""
Orders Router for Pharmacist Service
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from app.dependencies import require_pharmacist, get_database
from app.models.orders import DeclineOrderRequest
from app.services.order_service import OrderService
from app.services.inventory_service import InventoryService

router = APIRouter()


async def get_pharmacy_id(user: dict = Depends(require_pharmacist)) -> str:
    """Get pharmacy ID for the authenticated pharmacist"""
    db = get_database()
    service = InventoryService(db)
    pharmacy = await service.get_pharmacy_for_user(user["sub"])
    
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found for this user"
        )
    
    return str(pharmacy["_id"])


@router.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """List orders for the pharmacy"""
    db = get_database()
    service = OrderService(db)
    
    result = await service.get_orders(pharmacy_id, status, page, size)
    
    return {"success": True, "data": result}


@router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """Get order details"""
    db = get_database()
    service = OrderService(db)
    
    order = await service.get_order(order_id, pharmacy_id)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return {"success": True, "data": {"order": order}}


@router.post("/orders/{order_id}/accept")
async def accept_order(
    order_id: str,
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """Accept an incoming order"""
    db = get_database()
    service = OrderService(db)
    
    order = await service.accept_order(order_id, pharmacy_id)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot accept order. Order may not exist or is not in 'created' status."
        )
    
    return {"success": True, "data": {"order": order}, "message": "Order accepted"}


@router.post("/orders/{order_id}/decline")
async def decline_order(
    order_id: str,
    request: DeclineOrderRequest = None,
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """Decline an incoming order"""
    db = get_database()
    service = OrderService(db)
    
    reason = request.reason if request else None
    order = await service.decline_order(order_id, pharmacy_id, reason)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot decline order. Order may not exist or is not in 'created' status."
        )
    
    return {"success": True, "data": {"order": order}, "message": "Order declined"}


@router.post("/orders/{order_id}/prepared")
async def mark_order_prepared(
    order_id: str,
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """Mark order as prepared for pickup"""
    db = get_database()
    service = OrderService(db)
    
    order = await service.mark_prepared(order_id, pharmacy_id)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark order as prepared. Order may not exist or is not in 'accepted_by_pharmacy' status."
        )
    
    return {"success": True, "data": {"order": order}, "message": "Order marked as prepared"}

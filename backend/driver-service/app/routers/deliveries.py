"""
Deliveries Router for Driver Service
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from app.dependencies import require_driver, get_database
from app.models.delivery import DeliveryStatusUpdate, DeliveryOTPConfirm
from app.services.delivery_service import DeliveryService

router = APIRouter()


@router.get("/deliveries")
async def list_deliveries(
    status: Optional[str] = None,
    available: bool = False,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_driver)
):
    """List deliveries for the driver"""
    db = get_database()
    service = DeliveryService(db)
    
    if available:
        # Get available deliveries that are not yet assigned
        result = await service.get_available_deliveries(page, size)
    else:
        # Get driver's deliveries
        result = await service.get_deliveries(user["sub"], status, page, size)
    
    return {"success": True, "data": result}


@router.get("/deliveries/{delivery_id}")
async def get_delivery(
    delivery_id: str,
    user: dict = Depends(require_driver)
):
    """Get delivery details"""
    db = get_database()
    service = DeliveryService(db)
    
    delivery = await service.get_delivery(delivery_id)
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    return {"success": True, "data": {"delivery": delivery}}


@router.post("/deliveries/{delivery_id}/accept")
async def accept_delivery(
    delivery_id: str,
    user: dict = Depends(require_driver)
):
    """Accept a delivery"""
    db = get_database()
    service = DeliveryService(db)
    
    delivery = await service.accept_delivery(delivery_id, user["sub"])
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot accept delivery. It may not exist or already be assigned."
        )
    
    return {"success": True, "data": {"delivery": delivery}, "message": "Delivery accepted"}


@router.post("/deliveries/{delivery_id}/status")
async def update_delivery_status(
    delivery_id: str,
    update: DeliveryStatusUpdate,
    user: dict = Depends(require_driver)
):
    """Update delivery status and location"""
    db = get_database()
    service = DeliveryService(db)
    
    location = None
    if update.lat is not None and update.lon is not None:
        location = {"lat": update.lat, "lon": update.lon}
    
    delivery = await service.update_status(
        delivery_id,
        user["sub"],
        update.status.value,
        location,
        update.notes
    )
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update delivery status. Delivery may not exist or not assigned to you."
        )
    
    return {"success": True, "data": {"delivery": delivery}, "message": f"Status updated to {update.status.value}"}


@router.post("/deliveries/{delivery_id}/confirm-delivery")
async def confirm_delivery(
    delivery_id: str,
    otp_data: DeliveryOTPConfirm,
    user: dict = Depends(require_driver)
):
    """Confirm delivery with OTP"""
    db = get_database()
    service = DeliveryService(db)
    
    result = await service.confirm_delivery(delivery_id, user["sub"], otp_data.otp)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return {"success": True, "message": result["message"]}

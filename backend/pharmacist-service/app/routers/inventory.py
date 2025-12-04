"""
Inventory Router for Pharmacist Service
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from app.dependencies import require_pharmacist, get_database
from app.models.inventory import InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse
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


@router.get("/inventory")
async def list_inventory(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """List inventory items"""
    db = get_database()
    service = InventoryService(db)
    
    result = await service.get_inventory(pharmacy_id, page, size)
    
    return {"success": True, "data": result}


@router.post("/inventory", status_code=status.HTTP_201_CREATED)
async def add_inventory_item(
    item: InventoryItemCreate,
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """Add new inventory item"""
    db = get_database()
    service = InventoryService(db)
    
    created_item = await service.add_item(pharmacy_id, item.model_dump())
    
    return {"success": True, "data": {"item": created_item}}


@router.put("/inventory/{item_id}")
async def update_inventory_item(
    item_id: str,
    item: InventoryItemUpdate,
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """Update inventory item"""
    db = get_database()
    service = InventoryService(db)
    
    updated_item = await service.update_item(
        item_id, 
        pharmacy_id, 
        item.model_dump(exclude_unset=True)
    )
    
    if not updated_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )
    
    return {"success": True, "data": {"item": updated_item}}


@router.delete("/inventory/{item_id}")
async def delete_inventory_item(
    item_id: str,
    pharmacy_id: str = Depends(get_pharmacy_id)
):
    """Delete inventory item"""
    db = get_database()
    service = InventoryService(db)
    
    deleted = await service.delete_item(item_id, pharmacy_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )
    
    return {"success": True, "message": "Item deleted successfully"}

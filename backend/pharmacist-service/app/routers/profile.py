"""
Profile Router for Pharmacist Service
"""

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.dependencies import require_pharmacist, get_database
from app.models.pharmacy import PharmacyProfileUpdate

router = APIRouter()


@router.get("/profile")
async def get_profile(user: dict = Depends(require_pharmacist)):
    """Get pharmacist profile and pharmacy details"""
    db = get_database()
    
    # Get pharmacy for this pharmacist
    pharmacy = await db.pharmacies.find_one({
        "pharmacist_user_id": ObjectId(user["sub"])
    })
    
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found for this user"
        )
    
    # Get user details
    user_doc = await db.users.find_one({"_id": ObjectId(user["sub"])})
    
    return {
        "success": True,
        "data": {
            "user": {
                "id": str(user_doc["_id"]),
                "name": user_doc.get("name"),
                "email": user_doc.get("email"),
                "phone": user_doc.get("phone"),
                "roles": user_doc.get("roles", [])
            },
            "pharmacy": {
                "id": str(pharmacy["_id"]),
                "name": pharmacy.get("name"),
                "address": pharmacy.get("address"),
                "opening_hours": pharmacy.get("opening_hours"),
                "contact_phone": pharmacy.get("contact_phone"),
                "is_active": pharmacy.get("is_active", True),
                "rating": pharmacy.get("rating", 0),
                "rating_count": pharmacy.get("rating_count", 0),
                "created_at": pharmacy.get("created_at")
            }
        }
    }


@router.put("/profile")
async def update_profile(
    update_data: PharmacyProfileUpdate,
    user: dict = Depends(require_pharmacist)
):
    """Update pharmacy profile"""
    db = get_database()
    
    # Filter out None values
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No updates provided"
        )
    
    result = await db.pharmacies.find_one_and_update(
        {"pharmacist_user_id": ObjectId(user["sub"])},
        {"$set": updates},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found for this user"
        )
    
    return {
        "success": True,
        "data": {
            "pharmacy": {
                "id": str(result["_id"]),
                "name": result.get("name"),
                "address": result.get("address"),
                "opening_hours": result.get("opening_hours"),
                "contact_phone": result.get("contact_phone"),
                "is_active": result.get("is_active", True),
                "rating": result.get("rating", 0),
                "rating_count": result.get("rating_count", 0)
            }
        },
        "message": "Profile updated successfully"
    }

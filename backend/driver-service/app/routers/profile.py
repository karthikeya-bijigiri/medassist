"""
Profile Router for Driver Service
"""

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime

from app.dependencies import require_driver, get_database
from app.models.driver import LocationUpdate

router = APIRouter()


@router.get("/profile")
async def get_profile(user: dict = Depends(require_driver)):
    """Get driver profile"""
    db = get_database()
    
    user_doc = await db.users.find_one({"_id": ObjectId(user["sub"])})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get driver stats
    deliveries_completed = await db.deliveries.count_documents({
        "driver_id": ObjectId(user["sub"]),
        "status": "delivered"
    })
    
    deliveries_in_progress = await db.deliveries.count_documents({
        "driver_id": ObjectId(user["sub"]),
        "status": {"$in": ["assigned", "picked_up", "in_transit"]}
    })
    
    return {
        "success": True,
        "data": {
            "user": {
                "id": str(user_doc["_id"]),
                "name": user_doc.get("name"),
                "email": user_doc.get("email"),
                "phone": user_doc.get("phone"),
                "roles": user_doc.get("roles", []),
                "is_verified": user_doc.get("is_verified", False),
                "created_at": user_doc.get("created_at")
            },
            "stats": {
                "deliveries_completed": deliveries_completed,
                "deliveries_in_progress": deliveries_in_progress
            }
        }
    }


@router.put("/location")
async def update_location(
    location: LocationUpdate,
    user: dict = Depends(require_driver)
):
    """Update driver's current location"""
    db = get_database()
    
    # Store location (could be in Redis for real-time tracking)
    await db.driver_locations.update_one(
        {"driver_id": ObjectId(user["sub"])},
        {
            "$set": {
                "driver_id": ObjectId(user["sub"]),
                "location": {
                    "type": "Point",
                    "coordinates": [location.lon, location.lat]
                },
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Location updated",
        "data": {
            "lat": location.lat,
            "lon": location.lon
        }
    }

"""
Delivery Service for Driver
"""

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class DeliveryService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.deliveries = db.deliveries
        self.orders = db.orders
    
    async def get_deliveries(
        self, 
        driver_id: str, 
        status: Optional[str] = None,
        page: int = 1, 
        size: int = 20
    ) -> dict:
        """Get deliveries for a driver"""
        query = {"driver_id": ObjectId(driver_id)}
        
        if status:
            query["status"] = status
        
        skip = (page - 1) * size
        
        cursor = self.deliveries.find(query).skip(skip).limit(size).sort("assigned_at", -1)
        deliveries = await cursor.to_list(length=size)
        
        # Convert ObjectIds to strings
        for delivery in deliveries:
            delivery["id"] = str(delivery["_id"])
            delivery["order_id"] = str(delivery["order_id"])
            if delivery.get("driver_id"):
                delivery["driver_id"] = str(delivery["driver_id"])
            del delivery["_id"]
        
        total = await self.deliveries.count_documents(query)
        
        return {
            "deliveries": deliveries,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "pages": (total + size - 1) // size
            }
        }
    
    async def get_available_deliveries(
        self, 
        page: int = 1, 
        size: int = 20
    ) -> dict:
        """Get available (unassigned) deliveries"""
        query = {
            "status": "assigned",
            "driver_id": {"$exists": False}
        }
        
        skip = (page - 1) * size
        
        cursor = self.deliveries.find(query).skip(skip).limit(size).sort("assigned_at", -1)
        deliveries = await cursor.to_list(length=size)
        
        # Convert ObjectIds
        for delivery in deliveries:
            delivery["id"] = str(delivery["_id"])
            delivery["order_id"] = str(delivery["order_id"])
            del delivery["_id"]
        
        total = await self.deliveries.count_documents(query)
        
        return {
            "deliveries": deliveries,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "pages": (total + size - 1) // size
            }
        }
    
    async def get_delivery(self, delivery_id: str) -> Optional[dict]:
        """Get single delivery"""
        delivery = await self.deliveries.find_one({"_id": ObjectId(delivery_id)})
        
        if delivery:
            delivery["id"] = str(delivery["_id"])
            delivery["order_id"] = str(delivery["order_id"])
            if delivery.get("driver_id"):
                delivery["driver_id"] = str(delivery["driver_id"])
            del delivery["_id"]
            
            # Get order details
            order = await self.orders.find_one({"_id": ObjectId(delivery["order_id"])})
            if order:
                delivery["order"] = {
                    "id": str(order["_id"]),
                    "total_amount": order.get("total_amount"),
                    "status": order.get("status"),
                    "shipping_address": order.get("shipping_address"),
                    "items_count": len(order.get("items", []))
                }
        
        return delivery
    
    async def accept_delivery(self, delivery_id: str, driver_id: str) -> Optional[dict]:
        """Accept a delivery"""
        result = await self.deliveries.find_one_and_update(
            {
                "_id": ObjectId(delivery_id),
                "status": "assigned",
                "driver_id": {"$exists": False}
            },
            {
                "$set": {
                    "driver_id": ObjectId(driver_id),
                    "accepted_at": datetime.utcnow()
                }
            },
            return_document=True
        )
        
        if result:
            result["id"] = str(result["_id"])
            result["order_id"] = str(result["order_id"])
            result["driver_id"] = str(result["driver_id"])
            del result["_id"]
            logger.info(f"Delivery accepted: {delivery_id} by driver {driver_id}")
        
        return result
    
    async def update_status(
        self, 
        delivery_id: str, 
        driver_id: str,
        status: str,
        location: Optional[dict] = None,
        notes: Optional[str] = None
    ) -> Optional[dict]:
        """Update delivery status"""
        update_data = {
            "status": status
        }
        
        if location:
            update_data["current_location"] = location
        
        if notes:
            update_data["notes"] = notes
        
        # Set timestamp based on status
        if status == "picked_up":
            update_data["pickup_at"] = datetime.utcnow()
        elif status == "delivered":
            update_data["delivered_at"] = datetime.utcnow()
        
        result = await self.deliveries.find_one_and_update(
            {
                "_id": ObjectId(delivery_id),
                "driver_id": ObjectId(driver_id)
            },
            {"$set": update_data},
            return_document=True
        )
        
        if result:
            result["id"] = str(result["_id"])
            result["order_id"] = str(result["order_id"])
            result["driver_id"] = str(result["driver_id"])
            del result["_id"]
            
            # Update order status
            order_status_map = {
                "picked_up": "in_transit",
                "in_transit": "in_transit",
                "delivered": "delivered"
            }
            
            if status in order_status_map:
                await self.orders.update_one(
                    {"_id": ObjectId(result["order_id"])},
                    {
                        "$set": {
                            "status": order_status_map[status],
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            
            logger.info(f"Delivery status updated: {delivery_id} -> {status}")
        
        return result
    
    async def confirm_delivery(
        self, 
        delivery_id: str, 
        driver_id: str,
        otp: str
    ) -> dict:
        """Confirm delivery with OTP"""
        delivery = await self.deliveries.find_one({
            "_id": ObjectId(delivery_id),
            "driver_id": ObjectId(driver_id)
        })
        
        if not delivery:
            return {"success": False, "message": "Delivery not found"}
        
        # Get order to verify OTP
        order = await self.orders.find_one({"_id": delivery["order_id"]})
        
        if not order:
            return {"success": False, "message": "Order not found"}
        
        if order.get("otp_for_delivery") != otp:
            return {"success": False, "message": "Invalid OTP"}
        
        # Update delivery and order status
        await self.update_status(delivery_id, driver_id, "delivered")
        
        logger.info(f"Delivery confirmed with OTP: {delivery_id}")
        
        return {"success": True, "message": "Delivery confirmed successfully"}

"""
Order Service for Pharmacist
"""

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class OrderService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.orders
    
    async def get_orders(
        self, 
        pharmacy_id: str, 
        status: Optional[str] = None,
        page: int = 1, 
        size: int = 20
    ) -> dict:
        """Get orders for a pharmacy"""
        query = {"pharmacy_id": ObjectId(pharmacy_id)}
        
        if status:
            query["status"] = status
        
        skip = (page - 1) * size
        
        cursor = self.collection.find(query).skip(skip).limit(size).sort("created_at", -1)
        orders = await cursor.to_list(length=size)
        
        # Convert ObjectIds to strings
        for order in orders:
            order["id"] = str(order["_id"])
            order["user_id"] = str(order["user_id"])
            order["pharmacy_id"] = str(order["pharmacy_id"])
            if order.get("delivery_id"):
                order["delivery_id"] = str(order["delivery_id"])
            for item in order.get("items", []):
                if isinstance(item.get("medicine_id"), ObjectId):
                    item["medicine_id"] = str(item["medicine_id"])
            del order["_id"]
        
        total = await self.collection.count_documents(query)
        
        return {
            "orders": orders,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "pages": (total + size - 1) // size
            }
        }
    
    async def get_order(self, order_id: str, pharmacy_id: str) -> Optional[dict]:
        """Get single order"""
        order = await self.collection.find_one({
            "_id": ObjectId(order_id),
            "pharmacy_id": ObjectId(pharmacy_id)
        })
        
        if order:
            order["id"] = str(order["_id"])
            order["user_id"] = str(order["user_id"])
            order["pharmacy_id"] = str(order["pharmacy_id"])
            if order.get("delivery_id"):
                order["delivery_id"] = str(order["delivery_id"])
            for item in order.get("items", []):
                if isinstance(item.get("medicine_id"), ObjectId):
                    item["medicine_id"] = str(item["medicine_id"])
            del order["_id"]
        
        return order
    
    async def accept_order(self, order_id: str, pharmacy_id: str) -> Optional[dict]:
        """Accept an order"""
        result = await self.collection.find_one_and_update(
            {
                "_id": ObjectId(order_id),
                "pharmacy_id": ObjectId(pharmacy_id),
                "status": "created"
            },
            {
                "$set": {
                    "status": "accepted_by_pharmacy",
                    "updated_at": datetime.utcnow()
                }
            },
            return_document=True
        )
        
        if result:
            result["id"] = str(result["_id"])
            result["user_id"] = str(result["user_id"])
            result["pharmacy_id"] = str(result["pharmacy_id"])
            del result["_id"]
            logger.info(f"Order accepted: {order_id}")
        
        return result
    
    async def decline_order(
        self, 
        order_id: str, 
        pharmacy_id: str,
        reason: Optional[str] = None
    ) -> Optional[dict]:
        """Decline an order"""
        update_data = {
            "status": "cancelled",
            "updated_at": datetime.utcnow()
        }
        
        if reason:
            update_data["cancellation_reason"] = reason
        
        result = await self.collection.find_one_and_update(
            {
                "_id": ObjectId(order_id),
                "pharmacy_id": ObjectId(pharmacy_id),
                "status": "created"
            },
            {"$set": update_data},
            return_document=True
        )
        
        if result:
            result["id"] = str(result["_id"])
            result["user_id"] = str(result["user_id"])
            result["pharmacy_id"] = str(result["pharmacy_id"])
            del result["_id"]
            logger.info(f"Order declined: {order_id}")
            
            # TODO: Release reserved inventory
        
        return result
    
    async def mark_prepared(self, order_id: str, pharmacy_id: str) -> Optional[dict]:
        """Mark order as prepared"""
        result = await self.collection.find_one_and_update(
            {
                "_id": ObjectId(order_id),
                "pharmacy_id": ObjectId(pharmacy_id),
                "status": "accepted_by_pharmacy"
            },
            {
                "$set": {
                    "status": "prepared",
                    "updated_at": datetime.utcnow()
                }
            },
            return_document=True
        )
        
        if result:
            result["id"] = str(result["_id"])
            result["user_id"] = str(result["user_id"])
            result["pharmacy_id"] = str(result["pharmacy_id"])
            del result["_id"]
            logger.info(f"Order marked as prepared: {order_id}")
        
        return result

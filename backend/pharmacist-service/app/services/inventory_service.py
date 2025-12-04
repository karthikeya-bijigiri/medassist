"""
Inventory Service for Pharmacist
"""

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class InventoryService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.inventory
    
    async def get_pharmacy_for_user(self, user_id: str) -> Optional[dict]:
        """Get pharmacy for the pharmacist user"""
        pharmacy = await self.db.pharmacies.find_one({
            "pharmacist_user_id": ObjectId(user_id)
        })
        return pharmacy
    
    async def get_inventory(
        self, 
        pharmacy_id: str, 
        page: int = 1, 
        size: int = 20
    ) -> dict:
        """Get inventory for a pharmacy"""
        query = {"pharmacy_id": ObjectId(pharmacy_id)}
        
        skip = (page - 1) * size
        
        cursor = self.collection.find(query).skip(skip).limit(size).sort("created_at", -1)
        items = await cursor.to_list(length=size)
        
        # Convert ObjectIds to strings
        for item in items:
            item["id"] = str(item["_id"])
            item["pharmacy_id"] = str(item["pharmacy_id"])
            item["medicine_id"] = str(item["medicine_id"])
            del item["_id"]
        
        total = await self.collection.count_documents(query)
        
        return {
            "items": items,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "pages": (total + size - 1) // size
            }
        }
    
    async def add_item(self, pharmacy_id: str, item_data: dict) -> dict:
        """Add inventory item"""
        doc = {
            "pharmacy_id": ObjectId(pharmacy_id),
            "medicine_id": ObjectId(item_data["medicine_id"]),
            "batch_no": item_data["batch_no"],
            "expiry_date": datetime.combine(item_data["expiry_date"], datetime.min.time()),
            "quantity_available": item_data["quantity_available"],
            "mrp": item_data["mrp"],
            "selling_price": item_data["selling_price"],
            "reserved_qty": 0,
            "created_at": datetime.utcnow()
        }
        
        result = await self.collection.insert_one(doc)
        
        doc["id"] = str(result.inserted_id)
        doc["pharmacy_id"] = str(doc["pharmacy_id"])
        doc["medicine_id"] = str(doc["medicine_id"])
        
        logger.info(f"Inventory item added: {doc['id']}")
        
        return doc
    
    async def update_item(
        self, 
        item_id: str, 
        pharmacy_id: str, 
        update_data: dict
    ) -> Optional[dict]:
        """Update inventory item"""
        # Filter out None values
        updates = {k: v for k, v in update_data.items() if v is not None}
        
        if "expiry_date" in updates:
            updates["expiry_date"] = datetime.combine(
                updates["expiry_date"], 
                datetime.min.time()
            )
        
        if not updates:
            return await self.get_item(item_id, pharmacy_id)
        
        result = await self.collection.find_one_and_update(
            {
                "_id": ObjectId(item_id),
                "pharmacy_id": ObjectId(pharmacy_id)
            },
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result["id"] = str(result["_id"])
            result["pharmacy_id"] = str(result["pharmacy_id"])
            result["medicine_id"] = str(result["medicine_id"])
            del result["_id"]
            logger.info(f"Inventory item updated: {item_id}")
        
        return result
    
    async def delete_item(self, item_id: str, pharmacy_id: str) -> bool:
        """Delete inventory item"""
        result = await self.collection.delete_one({
            "_id": ObjectId(item_id),
            "pharmacy_id": ObjectId(pharmacy_id)
        })
        
        if result.deleted_count > 0:
            logger.info(f"Inventory item deleted: {item_id}")
            return True
        return False
    
    async def get_item(self, item_id: str, pharmacy_id: str) -> Optional[dict]:
        """Get single inventory item"""
        item = await self.collection.find_one({
            "_id": ObjectId(item_id),
            "pharmacy_id": ObjectId(pharmacy_id)
        })
        
        if item:
            item["id"] = str(item["_id"])
            item["pharmacy_id"] = str(item["pharmacy_id"])
            item["medicine_id"] = str(item["medicine_id"])
            del item["_id"]
        
        return item

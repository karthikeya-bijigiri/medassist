/**
 * Order Service Unit Tests
 */

// Mock dependencies
jest.mock('mongoose', () => ({
  model: jest.fn(),
  Schema: jest.fn(),
  connect: jest.fn(),
  Types: {
    ObjectId: {
      isValid: (id) => /^[a-f\d]{24}$/i.test(id)
    }
  }
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    setnx: jest.fn()
  }));
});

describe('Order Service', () => {
  describe('Order Status Transitions', () => {
    const ORDER_STATUSES = {
      CREATED: 'created',
      ACCEPTED_BY_PHARMACY: 'accepted_by_pharmacy',
      PREPARED: 'prepared',
      DRIVER_ASSIGNED: 'driver_assigned',
      IN_TRANSIT: 'in_transit',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
      FAILED: 'failed'
    };

    const validTransitions = {
      'created': ['accepted_by_pharmacy', 'cancelled'],
      'accepted_by_pharmacy': ['prepared', 'cancelled'],
      'prepared': ['driver_assigned', 'cancelled'],
      'driver_assigned': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'failed'],
      'delivered': [],
      'cancelled': [],
      'failed': []
    };

    const isValidTransition = (currentStatus, newStatus) => {
      const allowed = validTransitions[currentStatus] || [];
      return allowed.includes(newStatus);
    };

    it('should allow valid status transitions', () => {
      expect(isValidTransition('created', 'accepted_by_pharmacy')).toBe(true);
      expect(isValidTransition('accepted_by_pharmacy', 'prepared')).toBe(true);
      expect(isValidTransition('prepared', 'driver_assigned')).toBe(true);
      expect(isValidTransition('in_transit', 'delivered')).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      expect(isValidTransition('created', 'delivered')).toBe(false);
      expect(isValidTransition('delivered', 'cancelled')).toBe(false);
      expect(isValidTransition('in_transit', 'created')).toBe(false);
    });

    it('should allow cancellation from valid states', () => {
      expect(isValidTransition('created', 'cancelled')).toBe(true);
      expect(isValidTransition('accepted_by_pharmacy', 'cancelled')).toBe(true);
      expect(isValidTransition('prepared', 'cancelled')).toBe(true);
    });

    it('should not allow cancellation after dispatch', () => {
      expect(isValidTransition('in_transit', 'cancelled')).toBe(false);
      expect(isValidTransition('delivered', 'cancelled')).toBe(false);
    });
  });

  describe('Order Total Calculation', () => {
    const calculateOrderTotal = (items, taxRate = 0.18) => {
      let subtotal = 0;
      let tax = 0;

      for (const item of items) {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        
        // Only apply tax if item is taxable
        if (item.taxable !== false) {
          tax += itemTotal * taxRate;
        }
      }

      return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round((subtotal + tax) * 100) / 100
      };
    };

    it('should calculate order total correctly', () => {
      const items = [
        { medicine_id: '1', qty: 2, price: 50 },
        { medicine_id: '2', qty: 1, price: 100 }
      ];

      const result = calculateOrderTotal(items);
      expect(result.subtotal).toBe(200);
      expect(result.tax).toBe(36);
      expect(result.total).toBe(236);
    });

    it('should handle empty order', () => {
      const result = calculateOrderTotal([]);
      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle items with quantity > 1', () => {
      const items = [
        { medicine_id: '1', qty: 5, price: 20 }
      ];

      const result = calculateOrderTotal(items);
      expect(result.subtotal).toBe(100);
    });
  });

  describe('Inventory Reservation', () => {
    const inventory = new Map();

    const reserveInventory = (inventoryId, quantity) => {
      const item = inventory.get(inventoryId);
      
      if (!item) {
        return { success: false, error: 'INVENTORY_NOT_FOUND' };
      }

      const available = item.quantity_available - item.reserved_qty;
      
      if (available < quantity) {
        return { 
          success: false, 
          error: 'INSUFFICIENT_STOCK',
          available 
        };
      }

      item.reserved_qty += quantity;
      return { success: true, reserved: quantity };
    };

    const releaseReservation = (inventoryId, quantity) => {
      const item = inventory.get(inventoryId);
      
      if (!item) {
        return { success: false, error: 'INVENTORY_NOT_FOUND' };
      }

      if (item.reserved_qty < quantity) {
        return { success: false, error: 'INVALID_RELEASE_QUANTITY' };
      }

      item.reserved_qty -= quantity;
      return { success: true, released: quantity };
    };

    beforeEach(() => {
      inventory.clear();
      inventory.set('inv1', { quantity_available: 100, reserved_qty: 0 });
      inventory.set('inv2', { quantity_available: 5, reserved_qty: 3 });
    });

    it('should reserve inventory successfully', () => {
      const result = reserveInventory('inv1', 10);
      expect(result.success).toBe(true);
      expect(result.reserved).toBe(10);
      expect(inventory.get('inv1').reserved_qty).toBe(10);
    });

    it('should fail when insufficient stock', () => {
      const result = reserveInventory('inv2', 5);
      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_STOCK');
      expect(result.available).toBe(2);
    });

    it('should fail for non-existent inventory', () => {
      const result = reserveInventory('inv999', 1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVENTORY_NOT_FOUND');
    });

    it('should release reservation successfully', () => {
      // First reserve
      reserveInventory('inv1', 20);
      
      // Then release
      const result = releaseReservation('inv1', 10);
      expect(result.success).toBe(true);
      expect(inventory.get('inv1').reserved_qty).toBe(10);
    });
  });

  describe('Idempotency Key Handling', () => {
    const processedKeys = new Map();

    const processWithIdempotency = (idempotencyKey, orderData) => {
      if (processedKeys.has(idempotencyKey)) {
        return { 
          success: true, 
          order: processedKeys.get(idempotencyKey),
          cached: true 
        };
      }

      // Simulate order creation
      const order = {
        _id: `order_${Date.now()}`,
        ...orderData,
        created_at: new Date().toISOString()
      };

      processedKeys.set(idempotencyKey, order);
      return { success: true, order, cached: false };
    };

    beforeEach(() => {
      processedKeys.clear();
    });

    it('should process new order with idempotency key', () => {
      const result = processWithIdempotency('key-1', { items: [{ id: 1, qty: 2 }] });
      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.order._id).toBeDefined();
    });

    it('should return cached order for duplicate request', () => {
      const key = 'key-2';
      
      // First request
      const result1 = processWithIdempotency(key, { items: [] });
      
      // Duplicate request
      const result2 = processWithIdempotency(key, { items: [] });

      expect(result1.order._id).toBe(result2.order._id);
      expect(result2.cached).toBe(true);
    });

    it('should process different keys as separate orders', () => {
      const result1 = processWithIdempotency('key-a', { items: [] });
      const result2 = processWithIdempotency('key-b', { items: [] });

      expect(result1.order._id).not.toBe(result2.order._id);
      expect(result1.cached).toBe(false);
      expect(result2.cached).toBe(false);
    });
  });

  describe('Order Validation', () => {
    const validateOrder = (orderData) => {
      const errors = [];

      if (!orderData.pharmacy_id) {
        errors.push({ field: 'pharmacy_id', message: 'Pharmacy ID is required' });
      }

      if (!orderData.items || orderData.items.length === 0) {
        errors.push({ field: 'items', message: 'At least one item is required' });
      }

      if (orderData.items) {
        orderData.items.forEach((item, index) => {
          if (!item.medicine_id) {
            errors.push({ field: `items[${index}].medicine_id`, message: 'Medicine ID is required' });
          }
          if (!item.qty || item.qty < 1) {
            errors.push({ field: `items[${index}].qty`, message: 'Quantity must be at least 1' });
          }
        });
      }

      if (!orderData.shipping_address) {
        errors.push({ field: 'shipping_address', message: 'Shipping address is required' });
      }

      return {
        valid: errors.length === 0,
        errors
      };
    };

    it('should validate correct order', () => {
      const order = {
        pharmacy_id: 'pharmacy123',
        items: [{ medicine_id: 'med1', qty: 2 }],
        shipping_address: { address_line: '123 Main St', city: 'Mumbai', pincode: '400001' }
      };

      const result = validateOrder(order);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject order without pharmacy_id', () => {
      const order = {
        items: [{ medicine_id: 'med1', qty: 1 }],
        shipping_address: {}
      };

      const result = validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'pharmacy_id')).toBe(true);
    });

    it('should reject order without items', () => {
      const order = {
        pharmacy_id: 'pharmacy123',
        items: [],
        shipping_address: {}
      };

      const result = validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'items')).toBe(true);
    });

    it('should reject invalid item quantity', () => {
      const order = {
        pharmacy_id: 'pharmacy123',
        items: [{ medicine_id: 'med1', qty: 0 }],
        shipping_address: {}
      };

      const result = validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('qty'))).toBe(true);
    });
  });

  describe('Geo-Distance Calculation', () => {
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    it('should calculate distance between two points', () => {
      // Mumbai to Pune (approximately 150 km)
      const distance = calculateDistance(19.0760, 72.8777, 18.5204, 73.8567);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(200);
    });

    it('should return 0 for same location', () => {
      const distance = calculateDistance(19.0760, 72.8777, 19.0760, 72.8777);
      expect(distance).toBe(0);
    });

    it('should calculate short distances correctly', () => {
      // Two points about 1 km apart
      const distance = calculateDistance(19.0760, 72.8777, 19.0850, 72.8777);
      expect(distance).toBeLessThan(2);
      expect(distance).toBeGreaterThan(0.5);
    });
  });
});

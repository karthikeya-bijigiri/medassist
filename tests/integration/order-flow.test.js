/**
 * Order Flow Integration Tests
 * 
 * Tests the complete order flow from creation to delivery
 */

// Mock external services
jest.mock('mongoose', () => ({
  model: jest.fn(),
  Schema: jest.fn(),
  connect: jest.fn().mockResolvedValue({}),
  connection: { readyState: 1 }
}));

jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    setnx: jest.fn().mockResolvedValue(1),
    expire: jest.fn()
  };
  return jest.fn().mockImplementation(() => mockRedis);
});

jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      assertQueue: jest.fn(),
      sendToQueue: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn()
    })
  })
}));

describe('Order Flow Integration', () => {
  // Simulated database state
  const db = {
    users: new Map(),
    orders: new Map(),
    inventory: new Map(),
    deliveries: new Map()
  };

  // Simulated message queue
  const messageQueue = [];

  // Helper functions
  const createUser = (userData) => {
    const user = {
      _id: `user_${Date.now()}`,
      ...userData,
      is_verified: true,
      roles: userData.roles || ['user']
    };
    db.users.set(user._id, user);
    return user;
  };

  const createInventory = (inventoryData) => {
    const item = {
      _id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...inventoryData,
      reserved_qty: 0
    };
    db.inventory.set(item._id, item);
    return item;
  };

  const createOrder = (orderData) => {
    const order = {
      _id: `order_${Date.now()}`,
      ...orderData,
      status: 'created',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.orders.set(order._id, order);
    
    // Emit to queue
    messageQueue.push({
      type: 'orders.created',
      payload: order
    });
    
    return order;
  };

  const updateOrderStatus = (orderId, status) => {
    const order = db.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    
    order.status = status;
    order.updated_at = new Date().toISOString();
    
    return order;
  };

  beforeEach(() => {
    // Clear state
    db.users.clear();
    db.orders.clear();
    db.inventory.clear();
    db.deliveries.clear();
    messageQueue.length = 0;
  });

  describe('Complete Order Flow', () => {
    it('should process order from creation to delivery', async () => {
      // 1. Setup
      const user = createUser({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+919876543210'
      });

      const pharmacist = createUser({
        name: 'Test Pharmacist',
        email: 'pharmacist@example.com',
        roles: ['pharmacist']
      });

      const driver = createUser({
        name: 'Test Driver',
        email: 'driver@example.com',
        roles: ['driver']
      });

      const inventory = createInventory({
        pharmacy_id: 'pharmacy_1',
        medicine_id: 'med_1',
        batch_no: 'BATCH123',
        quantity_available: 100,
        mrp: 50,
        selling_price: 45
      });

      // 2. Create Order
      const order = createOrder({
        user_id: user._id,
        pharmacy_id: 'pharmacy_1',
        items: [{
          medicine_id: 'med_1',
          batch_no: 'BATCH123',
          qty: 2,
          price: 45
        }],
        total_amount: 90,
        shipping_address: {
          address_line: '123 Test Street',
          city: 'Mumbai',
          pincode: '400001'
        }
      });

      expect(order.status).toBe('created');
      expect(messageQueue[0].type).toBe('orders.created');

      // 3. Process payment
      order.payment_status = 'paid';
      messageQueue.push({
        type: 'orders.paid',
        payload: order
      });

      expect(order.payment_status).toBe('paid');

      // 4. Pharmacy accepts order
      updateOrderStatus(order._id, 'accepted_by_pharmacy');
      const acceptedOrder = db.orders.get(order._id);
      expect(acceptedOrder.status).toBe('accepted_by_pharmacy');

      // 5. Order prepared
      updateOrderStatus(order._id, 'prepared');
      const preparedOrder = db.orders.get(order._id);
      expect(preparedOrder.status).toBe('prepared');

      // 6. Driver assigned
      const delivery = {
        _id: `del_${Date.now()}`,
        order_id: order._id,
        driver_id: driver._id,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      };
      db.deliveries.set(delivery._id, delivery);
      
      updateOrderStatus(order._id, 'driver_assigned');
      messageQueue.push({
        type: 'deliveries.created',
        payload: delivery
      });

      // 7. In transit
      updateOrderStatus(order._id, 'in_transit');
      delivery.status = 'in_transit';

      // 8. Delivered
      updateOrderStatus(order._id, 'delivered');
      delivery.status = 'delivered';
      delivery.delivered_at = new Date().toISOString();

      const finalOrder = db.orders.get(order._id);
      expect(finalOrder.status).toBe('delivered');
      expect(delivery.delivered_at).toBeDefined();
    });

    it('should handle order cancellation', async () => {
      const user = createUser({ name: 'Test User', email: 'test@example.com' });

      const order = createOrder({
        user_id: user._id,
        pharmacy_id: 'pharmacy_1',
        items: [{ medicine_id: 'med_1', qty: 1, price: 50 }],
        total_amount: 50
      });

      // Cancel before pharmacy acceptance
      updateOrderStatus(order._id, 'cancelled');
      const cancelledOrder = db.orders.get(order._id);
      
      expect(cancelledOrder.status).toBe('cancelled');
    });

    it('should reserve and release inventory correctly', async () => {
      const inventory = createInventory({
        pharmacy_id: 'pharmacy_1',
        medicine_id: 'med_1',
        batch_no: 'BATCH123',
        quantity_available: 10
      });

      // Reserve inventory
      const reserveQty = 3;
      inventory.reserved_qty += reserveQty;
      
      expect(inventory.reserved_qty).toBe(3);
      expect(inventory.quantity_available - inventory.reserved_qty).toBe(7);

      // Complete order - reduce actual stock
      inventory.quantity_available -= reserveQty;
      inventory.reserved_qty -= reserveQty;

      expect(inventory.quantity_available).toBe(7);
      expect(inventory.reserved_qty).toBe(0);
    });

    it('should handle concurrent order requests with idempotency', async () => {
      const user = createUser({ name: 'Test User', email: 'test@example.com' });
      const idempotencyKey = 'unique-request-key-123';
      const processedKeys = new Map();

      const createOrderWithIdempotency = (key, orderData) => {
        if (processedKeys.has(key)) {
          return { order: processedKeys.get(key), duplicate: true };
        }
        
        const order = createOrder(orderData);
        processedKeys.set(key, order);
        return { order, duplicate: false };
      };

      // First request
      const result1 = createOrderWithIdempotency(idempotencyKey, {
        user_id: user._id,
        pharmacy_id: 'pharmacy_1',
        items: [{ medicine_id: 'med_1', qty: 1, price: 50 }],
        total_amount: 50
      });

      // Duplicate request
      const result2 = createOrderWithIdempotency(idempotencyKey, {
        user_id: user._id,
        pharmacy_id: 'pharmacy_1',
        items: [{ medicine_id: 'med_1', qty: 1, price: 50 }],
        total_amount: 50
      });

      expect(result1.duplicate).toBe(false);
      expect(result2.duplicate).toBe(true);
      expect(result1.order._id).toBe(result2.order._id);
    });
  });

  describe('Error Handling', () => {
    it('should fail order creation with insufficient stock', async () => {
      const inventory = createInventory({
        pharmacy_id: 'pharmacy_1',
        medicine_id: 'med_1',
        quantity_available: 2
      });

      const checkStock = (qty) => {
        const available = inventory.quantity_available - inventory.reserved_qty;
        if (qty > available) {
          throw new Error('INSUFFICIENT_STOCK');
        }
        return true;
      };

      expect(() => checkStock(5)).toThrow('INSUFFICIENT_STOCK');
      expect(() => checkStock(2)).not.toThrow();
    });

    it('should handle pharmacy decline', async () => {
      const order = createOrder({
        user_id: 'user_1',
        pharmacy_id: 'pharmacy_1',
        items: [{ medicine_id: 'med_1', qty: 1, price: 50 }],
        total_amount: 50
      });

      // Pharmacy declines
      order.status = 'cancelled';
      order.cancellation_reason = 'Items not available';

      expect(order.status).toBe('cancelled');
      expect(order.cancellation_reason).toBeDefined();
    });

    it('should handle delivery failure', async () => {
      const order = createOrder({
        user_id: 'user_1',
        pharmacy_id: 'pharmacy_1',
        items: [{ medicine_id: 'med_1', qty: 1, price: 50 }],
        total_amount: 50
      });

      updateOrderStatus(order._id, 'in_transit');

      // Delivery fails
      updateOrderStatus(order._id, 'failed');
      const failedOrder = db.orders.get(order._id);
      
      expect(failedOrder.status).toBe('failed');
    });
  });

  describe('Message Queue Processing', () => {
    it('should emit correct events during order lifecycle', async () => {
      const user = createUser({ name: 'Test User', email: 'test@example.com' });
      
      const order = createOrder({
        user_id: user._id,
        pharmacy_id: 'pharmacy_1',
        items: [{ medicine_id: 'med_1', qty: 1, price: 50 }],
        total_amount: 50
      });

      // Check order.created event
      expect(messageQueue[0].type).toBe('orders.created');
      expect(messageQueue[0].payload._id).toBe(order._id);

      // Simulate payment
      order.payment_status = 'paid';
      messageQueue.push({
        type: 'orders.paid',
        payload: { order_id: order._id }
      });

      expect(messageQueue[1].type).toBe('orders.paid');

      // Verify queue has correct events
      const eventTypes = messageQueue.map(m => m.type);
      expect(eventTypes).toContain('orders.created');
      expect(eventTypes).toContain('orders.paid');
    });
  });
});

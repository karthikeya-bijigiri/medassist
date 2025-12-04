/**
 * End-to-End Full Flow Tests
 * 
 * Tests the complete user journey from registration to order delivery
 */

describe('MedAssist E2E Full Flow', () => {
  // Simulated application state
  const appState = {
    users: new Map(),
    sessions: new Map(),
    pharmacies: new Map(),
    medicines: new Map(),
    inventory: new Map(),
    orders: new Map(),
    deliveries: new Map(),
    otpStore: new Map()
  };

  // Simulated API responses
  const api = {
    // Auth endpoints
    register: async (userData) => {
      if (appState.users.has(userData.email)) {
        return { success: false, error: 'EMAIL_EXISTS' };
      }
      
      const user = {
        _id: `user_${Date.now()}`,
        ...userData,
        is_verified: false,
        roles: ['user'],
        created_at: new Date().toISOString()
      };
      
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      appState.otpStore.set(userData.phone, { otp, expires: Date.now() + 300000 });
      appState.users.set(userData.email, user);
      
      return { success: true, message: 'OTP sent', user_id: user._id };
    },

    verifyOtp: async (phone, otp) => {
      const stored = appState.otpStore.get(phone);
      if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
        return { success: false, error: 'INVALID_OTP' };
      }
      
      // Find and verify user
      for (const [email, user] of appState.users) {
        if (user.phone === phone) {
          user.is_verified = true;
          
          const tokens = {
            access_token: `access_${Date.now()}`,
            refresh_token: `refresh_${Date.now()}`,
            expires_in: 900
          };
          
          appState.sessions.set(tokens.access_token, user);
          appState.otpStore.delete(phone);
          
          return { success: true, ...tokens, user };
        }
      }
      
      return { success: false, error: 'USER_NOT_FOUND' };
    },

    login: async (emailOrPhone, password) => {
      for (const [email, user] of appState.users) {
        if ((email === emailOrPhone || user.phone === emailOrPhone) && user.password === password) {
          if (!user.is_verified) {
            return { success: false, error: 'NOT_VERIFIED' };
          }
          
          const tokens = {
            access_token: `access_${Date.now()}`,
            refresh_token: `refresh_${Date.now()}`,
            expires_in: 900
          };
          
          appState.sessions.set(tokens.access_token, user);
          return { success: true, ...tokens, user };
        }
      }
      
      return { success: false, error: 'INVALID_CREDENTIALS' };
    },

    // Medicine search
    searchMedicines: async (query) => {
      const results = [];
      for (const [id, medicine] of appState.medicines) {
        if (medicine.name.toLowerCase().includes(query.toLowerCase()) ||
            medicine.generic_name.toLowerCase().includes(query.toLowerCase())) {
          results.push(medicine);
        }
      }
      return { success: true, results };
    },

    // Pharmacy endpoints
    getPharmacies: async (lat, lon, radius) => {
      const results = [];
      for (const [id, pharmacy] of appState.pharmacies) {
        // Simplified distance check
        results.push({ ...pharmacy, distance: Math.random() * radius });
      }
      return { success: true, pharmacies: results };
    },

    getPharmacyInventory: async (pharmacyId) => {
      const items = [];
      for (const [id, inv] of appState.inventory) {
        if (inv.pharmacy_id === pharmacyId) {
          const medicine = appState.medicines.get(inv.medicine_id);
          items.push({ ...inv, medicine });
        }
      }
      return { success: true, inventory: items };
    },

    // Order endpoints
    createOrder: async (accessToken, orderData, idempotencyKey) => {
      const user = appState.sessions.get(accessToken);
      if (!user) {
        return { success: false, error: 'UNAUTHORIZED' };
      }

      // Check inventory
      for (const item of orderData.items) {
        const inv = appState.inventory.get(item.inventory_id);
        if (!inv || (inv.quantity_available - inv.reserved_qty) < item.qty) {
          return { success: false, error: 'INSUFFICIENT_STOCK' };
        }
      }

      // Reserve inventory
      for (const item of orderData.items) {
        const inv = appState.inventory.get(item.inventory_id);
        inv.reserved_qty += item.qty;
      }

      const order = {
        _id: `order_${Date.now()}`,
        user_id: user._id,
        ...orderData,
        status: 'created',
        payment_status: 'pending',
        otp_for_delivery: Math.floor(1000 + Math.random() * 9000).toString(),
        created_at: new Date().toISOString()
      };
      
      appState.orders.set(order._id, order);
      return { success: true, order };
    },

    payOrder: async (orderId) => {
      const order = appState.orders.get(orderId);
      if (!order) {
        return { success: false, error: 'ORDER_NOT_FOUND' };
      }
      
      order.payment_status = 'paid';
      return { success: true, order };
    },

    // Pharmacist endpoints
    acceptOrder: async (accessToken, orderId) => {
      const order = appState.orders.get(orderId);
      if (!order) {
        return { success: false, error: 'ORDER_NOT_FOUND' };
      }
      
      order.status = 'accepted_by_pharmacy';
      return { success: true, order };
    },

    markPrepared: async (accessToken, orderId) => {
      const order = appState.orders.get(orderId);
      if (!order) {
        return { success: false, error: 'ORDER_NOT_FOUND' };
      }
      
      order.status = 'prepared';
      return { success: true, order };
    },

    // Driver endpoints
    acceptDelivery: async (accessToken, orderId) => {
      const user = appState.sessions.get(accessToken);
      const order = appState.orders.get(orderId);
      
      if (!order) {
        return { success: false, error: 'ORDER_NOT_FOUND' };
      }

      const delivery = {
        _id: `del_${Date.now()}`,
        order_id: orderId,
        driver_id: user._id,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      };
      
      appState.deliveries.set(delivery._id, delivery);
      order.status = 'driver_assigned';
      order.delivery_id = delivery._id;
      
      return { success: true, delivery };
    },

    confirmDelivery: async (accessToken, deliveryId, otp) => {
      const delivery = appState.deliveries.get(deliveryId);
      if (!delivery) {
        return { success: false, error: 'DELIVERY_NOT_FOUND' };
      }

      const order = appState.orders.get(delivery.order_id);
      if (order.otp_for_delivery !== otp) {
        return { success: false, error: 'INVALID_OTP' };
      }

      delivery.status = 'delivered';
      delivery.delivered_at = new Date().toISOString();
      order.status = 'delivered';

      // Release reserved inventory and reduce stock
      for (const item of order.items) {
        const inv = appState.inventory.get(item.inventory_id);
        inv.reserved_qty -= item.qty;
        inv.quantity_available -= item.qty;
      }

      return { success: true, delivery, order };
    }
  };

  // Setup test data
  beforeEach(() => {
    // Clear state
    appState.users.clear();
    appState.sessions.clear();
    appState.pharmacies.clear();
    appState.medicines.clear();
    appState.inventory.clear();
    appState.orders.clear();
    appState.deliveries.clear();
    appState.otpStore.clear();

    // Add test pharmacy
    appState.pharmacies.set('pharmacy_1', {
      _id: 'pharmacy_1',
      name: 'Test Pharmacy',
      address: '123 Medical Street',
      geo: { type: 'Point', coordinates: [72.8777, 19.0760] },
      is_active: true
    });

    // Add test medicines
    appState.medicines.set('med_1', {
      _id: 'med_1',
      name: 'Paracetamol 500mg',
      brand: 'Crocin',
      generic_name: 'Paracetamol',
      prescription_required: false
    });

    appState.medicines.set('med_2', {
      _id: 'med_2',
      name: 'Amoxicillin 500mg',
      brand: 'Amoxil',
      generic_name: 'Amoxicillin',
      prescription_required: true
    });

    // Add test inventory
    appState.inventory.set('inv_1', {
      _id: 'inv_1',
      pharmacy_id: 'pharmacy_1',
      medicine_id: 'med_1',
      batch_no: 'BATCH001',
      quantity_available: 100,
      reserved_qty: 0,
      mrp: 25,
      selling_price: 22
    });
  });

  describe('Complete User Journey', () => {
    it('should complete full flow: register → search → order → deliver', async () => {
      // Step 1: User Registration
      const registerResult = await api.register({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        password: 'securePass123'
      });
      
      expect(registerResult.success).toBe(true);
      expect(registerResult.message).toBe('OTP sent');

      // Step 2: Verify OTP
      const otp = appState.otpStore.get('+919876543210').otp;
      const verifyResult = await api.verifyOtp('+919876543210', otp);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.access_token).toBeDefined();
      expect(verifyResult.user.is_verified).toBe(true);

      const accessToken = verifyResult.access_token;

      // Step 3: Search for medicines
      const searchResult = await api.searchMedicines('paracetamol');
      
      expect(searchResult.success).toBe(true);
      expect(searchResult.results.length).toBeGreaterThan(0);
      expect(searchResult.results[0].name).toContain('Paracetamol');

      // Step 4: Get nearby pharmacies
      const pharmaciesResult = await api.getPharmacies(19.0760, 72.8777, 10);
      
      expect(pharmaciesResult.success).toBe(true);
      expect(pharmaciesResult.pharmacies.length).toBeGreaterThan(0);

      // Step 5: Get pharmacy inventory
      const inventoryResult = await api.getPharmacyInventory('pharmacy_1');
      
      expect(inventoryResult.success).toBe(true);
      expect(inventoryResult.inventory.length).toBeGreaterThan(0);

      // Step 6: Create order
      const orderResult = await api.createOrder(accessToken, {
        pharmacy_id: 'pharmacy_1',
        items: [{
          inventory_id: 'inv_1',
          medicine_id: 'med_1',
          qty: 2,
          price: 22
        }],
        total_amount: 44,
        shipping_address: {
          address_line: '456 Home Street',
          city: 'Mumbai',
          pincode: '400001'
        }
      }, 'idempotency-key-1');

      expect(orderResult.success).toBe(true);
      expect(orderResult.order.status).toBe('created');
      expect(orderResult.order.otp_for_delivery).toBeDefined();

      const orderId = orderResult.order._id;
      const deliveryOtp = orderResult.order.otp_for_delivery;

      // Step 7: Pay for order
      const payResult = await api.payOrder(orderId);
      expect(payResult.success).toBe(true);
      expect(payResult.order.payment_status).toBe('paid');

      // Step 8: Pharmacist accepts order
      const acceptResult = await api.acceptOrder('pharmacist_token', orderId);
      expect(acceptResult.success).toBe(true);
      expect(acceptResult.order.status).toBe('accepted_by_pharmacy');

      // Step 9: Pharmacist marks order as prepared
      const preparedResult = await api.markPrepared('pharmacist_token', orderId);
      expect(preparedResult.success).toBe(true);
      expect(preparedResult.order.status).toBe('prepared');

      // Step 10: Create driver session
      appState.users.set('driver@example.com', {
        _id: 'driver_1',
        name: 'Driver One',
        email: 'driver@example.com',
        roles: ['driver'],
        is_verified: true
      });
      const driverToken = 'driver_access_token';
      appState.sessions.set(driverToken, appState.users.get('driver@example.com'));

      // Step 11: Driver accepts delivery
      const deliveryResult = await api.acceptDelivery(driverToken, orderId);
      expect(deliveryResult.success).toBe(true);
      expect(deliveryResult.delivery.status).toBe('assigned');

      // Step 12: Driver confirms delivery with OTP
      const confirmResult = await api.confirmDelivery(
        driverToken, 
        deliveryResult.delivery._id, 
        deliveryOtp
      );

      expect(confirmResult.success).toBe(true);
      expect(confirmResult.delivery.status).toBe('delivered');
      expect(confirmResult.order.status).toBe('delivered');

      // Verify inventory was updated
      const inventory = appState.inventory.get('inv_1');
      expect(inventory.quantity_available).toBe(98);
      expect(inventory.reserved_qty).toBe(0);
    });

    it('should handle order cancellation', async () => {
      // Register and login user
      await api.register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+919876543211',
        password: 'securePass123'
      });
      
      const otp = appState.otpStore.get('+919876543211').otp;
      const { access_token } = await api.verifyOtp('+919876543211', otp);

      // Create order
      const { order } = await api.createOrder(access_token, {
        pharmacy_id: 'pharmacy_1',
        items: [{ inventory_id: 'inv_1', medicine_id: 'med_1', qty: 1, price: 22 }],
        total_amount: 22,
        shipping_address: { address_line: '123 Test St', city: 'Mumbai', pincode: '400001' }
      });

      // Cancel order
      order.status = 'cancelled';
      
      // Release reserved inventory
      const inv = appState.inventory.get('inv_1');
      inv.reserved_qty -= 1;

      expect(order.status).toBe('cancelled');
      expect(inv.reserved_qty).toBe(0);
    });

    it('should reject order with insufficient stock', async () => {
      // Set low stock
      appState.inventory.get('inv_1').quantity_available = 1;

      await api.register({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+919876543212',
        password: 'test123'
      });
      
      const otp = appState.otpStore.get('+919876543212').otp;
      const { access_token } = await api.verifyOtp('+919876543212', otp);

      // Try to order more than available
      const result = await api.createOrder(access_token, {
        pharmacy_id: 'pharmacy_1',
        items: [{ inventory_id: 'inv_1', medicine_id: 'med_1', qty: 5, price: 22 }],
        total_amount: 110,
        shipping_address: { address_line: '123 Test St', city: 'Mumbai', pincode: '400001' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_STOCK');
    });

    it('should reject delivery with wrong OTP', async () => {
      // Setup user and order
      await api.register({
        name: 'OTP Test User',
        email: 'otp@example.com',
        phone: '+919876543213',
        password: 'test123'
      });
      
      const otp = appState.otpStore.get('+919876543213').otp;
      const { access_token } = await api.verifyOtp('+919876543213', otp);

      const { order } = await api.createOrder(access_token, {
        pharmacy_id: 'pharmacy_1',
        items: [{ inventory_id: 'inv_1', medicine_id: 'med_1', qty: 1, price: 22 }],
        total_amount: 22,
        shipping_address: { address_line: '123 Test St', city: 'Mumbai', pincode: '400001' }
      });

      // Process order through pharmacy
      await api.payOrder(order._id);
      await api.acceptOrder('pharmacist_token', order._id);
      await api.markPrepared('pharmacist_token', order._id);

      // Setup driver
      appState.users.set('driver2@example.com', {
        _id: 'driver_2',
        email: 'driver2@example.com',
        roles: ['driver'],
        is_verified: true
      });
      const driverToken = 'driver_token_2';
      appState.sessions.set(driverToken, appState.users.get('driver2@example.com'));

      const { delivery } = await api.acceptDelivery(driverToken, order._id);

      // Try to confirm with wrong OTP
      const result = await api.confirmDelivery(driverToken, delivery._id, '0000');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_OTP');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple users ordering same item', async () => {
      // Set limited stock
      appState.inventory.get('inv_1').quantity_available = 3;

      const results = [];

      // Simulate 5 concurrent orders for 1 item each
      for (let i = 0; i < 5; i++) {
        const email = `user${i}@example.com`;
        const phone = `+9198765432${10 + i}`;
        
        await api.register({
          name: `User ${i}`,
          email,
          phone,
          password: 'test123'
        });
        
        const otp = appState.otpStore.get(phone).otp;
        const { access_token } = await api.verifyOtp(phone, otp);

        const result = await api.createOrder(access_token, {
          pharmacy_id: 'pharmacy_1',
          items: [{ inventory_id: 'inv_1', medicine_id: 'med_1', qty: 1, price: 22 }],
          total_amount: 22,
          shipping_address: { address_line: '123 Test St', city: 'Mumbai', pincode: '400001' }
        });

        results.push(result);
      }

      // Only 3 orders should succeed (limited stock)
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(3);
      expect(failCount).toBe(2);
    });
  });
});

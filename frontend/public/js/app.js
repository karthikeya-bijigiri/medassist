/**
 * Main application script for MedAssist Frontend
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize mobile menu
  initMobileMenu();
  
  // Initialize page-specific functionality
  initPageSpecific();
});

/**
 * Initialize mobile menu
 */
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mainNav = document.getElementById('main-nav');

  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      mobileMenuBtn.classList.toggle('active');
    });
  }
}

/**
 * Initialize page-specific functionality
 */
function initPageSpecific() {
  const path = window.location.pathname;

  // Search results page
  if (path.includes('search-results')) {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
      search.loadSearchResults(resultsContainer);
    }
  }

  // Cart page
  if (path.includes('cart')) {
    const cartContainer = document.getElementById('cart-container');
    if (cartContainer) {
      cart.renderCart(cartContainer);
    }
  }

  // Checkout page
  if (path.includes('checkout')) {
    initCheckout();
  }

  // Login page
  if (path.includes('login')) {
    initLoginPage();
  }

  // Register page
  if (path.includes('register')) {
    initRegisterPage();
  }

  // Order tracking page
  if (path.includes('order-tracking')) {
    initOrderTracking();
  }

  // Profile page
  if (path.includes('profile')) {
    initProfilePage();
  }
}

/**
 * Initialize checkout page
 */
function initCheckout() {
  // Check if user is logged in
  if (!auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(checkoutForm);
      const shippingAddress = {
        label: formData.get('label') || 'home',
        address_line: formData.get('address'),
        city: formData.get('city'),
        pincode: formData.get('pincode'),
        lat: 0,
        lon: 0
      };

      try {
        const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const orderData = {
          items: cart.getItems(),
          shipping_address: shippingAddress
        };

        const result = await api.createOrder(orderData, idempotencyKey);
        
        if (result.success) {
          cart.clearCart();
          window.location.href = `order-tracking.html?id=${result.data.order._id}`;
        } else {
          showToast(result.message || 'Failed to create order', 'error');
        }
      } catch (error) {
        console.error('Checkout error:', error);
        showToast('Failed to process order. Please try again.', 'error');
      }
    });
  }
}

/**
 * Initialize login page
 */
function initLoginPage() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(loginForm);
      const emailOrPhone = formData.get('email_or_phone');
      const password = formData.get('password');

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      try {
        const result = await auth.login(emailOrPhone, password);
        
        if (result.success) {
          const redirect = new URLSearchParams(window.location.search).get('redirect');
          window.location.href = redirect || '/';
        } else {
          showToast(result.message || 'Login failed', 'error');
        }
      } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    });
  }
}

/**
 * Initialize register page
 */
function initRegisterPage() {
  const registerForm = document.getElementById('register-form');
  const otpForm = document.getElementById('otp-form');
  let registeredPhone = '';

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(registerForm);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password')
      };

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        const result = await auth.register(data);
        
        if (result.success) {
          registeredPhone = data.phone;
          registerForm.classList.add('hidden');
          if (otpForm) {
            otpForm.classList.remove('hidden');
          }
          showToast('Registration successful! Please verify your phone.');
        } else {
          showToast(result.message || 'Registration failed', 'error');
        }
      } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }

  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(otpForm);
      const otp = formData.get('otp');

      try {
        const result = await auth.verifyOtp(registeredPhone, otp);
        
        if (result.success) {
          showToast('Phone verified successfully!');
          window.location.href = '/';
        } else {
          showToast(result.message || 'Invalid OTP', 'error');
        }
      } catch (error) {
        console.error('OTP verification error:', error);
        showToast('Verification failed. Please try again.', 'error');
      }
    });
  }
}

/**
 * Initialize order tracking page
 */
async function initOrderTracking() {
  const ordersContainer = document.getElementById('orders-container');
  const orderDetail = document.getElementById('order-detail');
  
  const orderId = new URLSearchParams(window.location.search).get('id');

  if (orderId && orderDetail) {
    // Show single order
    try {
      const result = await api.getOrder(orderId);
      if (result.success) {
        renderOrderDetail(orderDetail, result.data.order);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    }
  } else if (ordersContainer) {
    // Show all orders
    try {
      const result = await api.getOrders();
      if (result.success) {
        renderOrdersList(ordersContainer, result.data.orders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }
}

/**
 * Render order detail
 */
function renderOrderDetail(container, order) {
  const statusSteps = ['created', 'accepted_by_pharmacy', 'prepared', 'driver_assigned', 'in_transit', 'delivered'];
  const currentIndex = statusSteps.indexOf(order.status);

  container.innerHTML = `
    <div class="order-detail-header">
      <h2>Order #${order._id}</h2>
      <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span>
    </div>
    
    <div class="order-timeline">
      ${statusSteps.map((step, index) => `
        <div class="timeline-step ${index <= currentIndex ? 'completed' : ''} ${index === currentIndex ? 'current' : ''}">
          <div class="step-indicator">${index < currentIndex ? '✓' : index + 1}</div>
          <div class="step-label">${formatStatus(step)}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="order-info card">
      <h3>Order Details</h3>
      <p><strong>Total:</strong> ₹${order.total_amount.toFixed(2)}</p>
      <p><strong>Payment:</strong> ${order.payment_status}</p>
      <p><strong>Ordered:</strong> ${new Date(order.created_at).toLocaleString()}</p>
      
      ${order.status === 'created' ? `
        <button class="btn btn-danger" onclick="cancelOrder('${order._id}')">Cancel Order</button>
      ` : ''}
    </div>
  `;
}

/**
 * Render orders list
 */
function renderOrdersList(container, orders) {
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No orders yet</h3>
        <p>Start shopping to see your orders here</p>
        <a href="/" class="btn btn-primary">Browse Medicines</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => `
    <div class="order-card card">
      <div class="order-card-header">
        <div>
          <h4>Order #${order._id.slice(-8)}</h4>
          <p class="order-date">${new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span>
      </div>
      <div class="order-card-body">
        <p>${order.items.length} item(s) • ₹${order.total_amount.toFixed(2)}</p>
      </div>
      <div class="order-card-footer">
        <a href="order-tracking.html?id=${order._id}" class="btn btn-outline btn-sm">View Details</a>
      </div>
    </div>
  `).join('');
}

/**
 * Cancel order
 */
async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) return;

  try {
    const result = await api.cancelOrder(orderId);
    if (result.success) {
      showToast('Order cancelled successfully');
      location.reload();
    } else {
      showToast(result.message || 'Failed to cancel order', 'error');
    }
  } catch (error) {
    console.error('Cancel error:', error);
    showToast('Failed to cancel order', 'error');
  }
}

/**
 * Initialize profile page
 */
async function initProfilePage() {
  const profileContainer = document.getElementById('profile-container');
  
  if (!auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=profile.html';
    return;
  }

  try {
    const result = await api.getUserProfile();
    if (result.success) {
      renderProfile(profileContainer, result.data.user);
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

/**
 * Render profile
 */
function renderProfile(container, user) {
  container.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${user.name[0].toUpperCase()}</div>
      <div class="profile-info">
        <h2>${user.name}</h2>
        <p>${user.email}</p>
        <p>${user.phone}</p>
      </div>
    </div>
    
    <div class="profile-sections">
      <div class="card">
        <h3>Saved Addresses</h3>
        ${user.addresses?.length > 0 ? user.addresses.map(addr => `
          <div class="address-item">
            <strong>${addr.label}</strong>
            <p>${addr.address_line}, ${addr.city} - ${addr.pincode}</p>
          </div>
        `).join('') : '<p class="text-secondary">No saved addresses</p>'}
      </div>
    </div>
  `;
}

/**
 * Format status for display
 */
function formatStatus(status) {
  return status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Add additional styles
const appStyles = document.createElement('style');
appStyles.textContent = `
  .order-card {
    margin-bottom: 1rem;
  }
  
  .order-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }
  
  .order-date {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .order-card-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }
  
  .order-timeline {
    display: flex;
    justify-content: space-between;
    margin: 2rem 0;
    position: relative;
  }
  
  .order-timeline::before {
    content: '';
    position: absolute;
    top: 15px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--border-color);
    z-index: 0;
  }
  
  .timeline-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    z-index: 1;
  }
  
  .step-indicator {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .timeline-step.completed .step-indicator {
    background: var(--secondary-color);
    border-color: var(--secondary-color);
    color: white;
  }
  
  .timeline-step.current .step-indicator {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }
  
  .step-label {
    font-size: 0.75rem;
    text-align: center;
    max-width: 80px;
  }
  
  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .profile-avatar {
    width: 80px;
    height: 80px;
    background: var(--primary-color);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 600;
  }
  
  .address-item {
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-color);
  }
  
  .address-item:last-child {
    border-bottom: none;
  }
`;
document.head.appendChild(appStyles);

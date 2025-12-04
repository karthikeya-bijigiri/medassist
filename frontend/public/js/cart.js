/**
 * Cart management for MedAssist Frontend
 */

class CartManager {
  constructor() {
    this.items = [];
    this.loadCart();
  }

  /**
   * Load cart from local storage
   */
  loadCart() {
    const cartStr = localStorage.getItem('cart');
    if (cartStr) {
      try {
        this.items = JSON.parse(cartStr);
      } catch (e) {
        this.items = [];
      }
    }
    this.updateCartBadge();
  }

  /**
   * Save cart to local storage
   */
  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.items));
    this.updateCartBadge();
    
    // Sync with server if logged in
    if (auth.isLoggedIn()) {
      this.syncWithServer();
    }
  }

  /**
   * Sync cart with server
   */
  async syncWithServer() {
    try {
      await api.updateCart(this.items);
    } catch (error) {
      console.error('Failed to sync cart:', error);
    }
  }

  /**
   * Add item to cart
   */
  addItem(item) {
    const existingIndex = this.items.findIndex(
      i => i.medicine_id === item.medicine_id && i.pharmacy_id === item.pharmacy_id
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].qty += item.qty || 1;
    } else {
      this.items.push({
        medicine_id: item.medicine_id,
        pharmacy_id: item.pharmacy_id,
        qty: item.qty || 1,
        price_at_add: item.price
      });
    }

    this.saveCart();
  }

  /**
   * Update item quantity
   */
  updateQuantity(medicineId, pharmacyId, qty) {
    const index = this.items.findIndex(
      i => i.medicine_id === medicineId && i.pharmacy_id === pharmacyId
    );

    if (index >= 0) {
      if (qty <= 0) {
        this.removeItem(medicineId, pharmacyId);
      } else {
        this.items[index].qty = qty;
        this.saveCart();
      }
    }
  }

  /**
   * Remove item from cart
   */
  removeItem(medicineId, pharmacyId) {
    this.items = this.items.filter(
      i => !(i.medicine_id === medicineId && i.pharmacy_id === pharmacyId)
    );
    this.saveCart();
  }

  /**
   * Clear cart
   */
  clearCart() {
    this.items = [];
    this.saveCart();
  }

  /**
   * Get cart items
   */
  getItems() {
    return this.items;
  }

  /**
   * Get cart count
   */
  getCount() {
    return this.items.reduce((sum, item) => sum + item.qty, 0);
  }

  /**
   * Get cart total
   */
  getTotal() {
    return this.items.reduce((sum, item) => {
      return sum + (item.price_at_add || 0) * item.qty;
    }, 0);
  }

  /**
   * Update cart badge in header
   */
  updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = this.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  /**
   * Render cart page
   */
  async renderCart(container) {
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Start adding medicines to your cart</p>
          <a href="/" class="btn btn-primary">Browse Medicines</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="cart-container">
        <div class="cart-items">
          <h2>Shopping Cart (${this.getCount()} items)</h2>
          <div id="cart-items-list">Loading...</div>
        </div>
        <div class="cart-summary card">
          <h3>Order Summary</h3>
          <div class="summary-row">
            <span>Subtotal</span>
            <span id="cart-subtotal">₹0.00</span>
          </div>
          <div class="summary-row">
            <span>Delivery</span>
            <span id="cart-delivery">₹0.00</span>
          </div>
          <div class="summary-row">
            <span>Tax (18%)</span>
            <span id="cart-tax">₹0.00</span>
          </div>
          <hr>
          <div class="summary-row total">
            <span>Total</span>
            <span id="cart-total">₹0.00</span>
          </div>
          <a href="public/pages/checkout.html" class="btn btn-primary btn-full btn-lg">
            Proceed to Checkout
          </a>
        </div>
      </div>
    `;

    // Render items
    this.renderCartItems(document.getElementById('cart-items-list'));
    this.updateSummary();
  }

  /**
   * Render cart items
   */
  renderCartItems(container) {
    if (!container) return;

    container.innerHTML = this.items.map(item => `
      <div class="cart-item" data-medicine="${item.medicine_id}" data-pharmacy="${item.pharmacy_id}">
        <div class="cart-item-image">💊</div>
        <div class="cart-item-details">
          <h4>Medicine ID: ${item.medicine_id}</h4>
          <p class="price">₹${(item.price_at_add || 0).toFixed(2)}</p>
        </div>
        <div class="cart-item-quantity">
          <div class="quantity-selector">
            <button class="quantity-btn minus" data-action="decrease">-</button>
            <span class="quantity-value">${item.qty}</span>
            <button class="quantity-btn plus" data-action="increase">+</button>
          </div>
        </div>
        <div class="cart-item-total">
          ₹${((item.price_at_add || 0) * item.qty).toFixed(2)}
        </div>
        <button class="cart-item-remove" data-action="remove">×</button>
      </div>
    `).join('');

    // Add event handlers
    container.querySelectorAll('.cart-item').forEach(itemEl => {
      const medicineId = itemEl.dataset.medicine;
      const pharmacyId = itemEl.dataset.pharmacy;

      itemEl.querySelector('.minus')?.addEventListener('click', () => {
        const item = this.items.find(i => i.medicine_id === medicineId && i.pharmacy_id === pharmacyId);
        if (item) {
          this.updateQuantity(medicineId, pharmacyId, item.qty - 1);
          this.renderCartItems(container);
          this.updateSummary();
        }
      });

      itemEl.querySelector('.plus')?.addEventListener('click', () => {
        const item = this.items.find(i => i.medicine_id === medicineId && i.pharmacy_id === pharmacyId);
        if (item) {
          this.updateQuantity(medicineId, pharmacyId, item.qty + 1);
          this.renderCartItems(container);
          this.updateSummary();
        }
      });

      itemEl.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
        this.removeItem(medicineId, pharmacyId);
        this.renderCartItems(container);
        this.updateSummary();
        
        if (this.items.length === 0) {
          location.reload();
        }
      });
    });
  }

  /**
   * Update order summary
   */
  updateSummary() {
    const subtotal = this.getTotal();
    const delivery = subtotal > 500 ? 0 : 40;
    const tax = subtotal * 0.18;
    const total = subtotal + delivery + tax;

    const subtotalEl = document.getElementById('cart-subtotal');
    const deliveryEl = document.getElementById('cart-delivery');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'FREE' : `₹${delivery.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₹${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
  }
}

// Global cart instance
const cart = new CartManager();

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .cart-container {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 2rem;
    padding: 2rem 0;
  }
  
  .cart-items h2 {
    margin-bottom: 1.5rem;
  }
  
  .cart-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .cart-item-image {
    width: 60px;
    height: 60px;
    background: #f3f4f6;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  
  .cart-item-details {
    flex: 1;
  }
  
  .cart-item-details h4 {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }
  
  .cart-item-total {
    font-weight: 600;
    min-width: 80px;
    text-align: right;
  }
  
  .cart-item-remove {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #9ca3af;
    cursor: pointer;
  }
  
  .cart-item-remove:hover {
    color: #ef4444;
  }
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
  }
  
  .summary-row.total {
    font-weight: 700;
    font-size: 1.125rem;
  }
  
  .cart-summary hr {
    margin: 1rem 0;
    border: none;
    border-top: 1px solid #e5e7eb;
  }
  
  .cart-summary .btn {
    margin-top: 1rem;
  }
  
  @media (max-width: 768px) {
    .cart-container {
      grid-template-columns: 1fr;
    }
  }
`;
document.head.appendChild(style);

/**
 * API Client for MedAssist Frontend
 */

const API_CONFIG = {
  AUTH_SERVICE: 'http://localhost:3001/api/v1',
  USER_ORDER_SERVICE: 'http://localhost:3002/api/v1',
  SEARCH_SERVICE: 'http://localhost:3003/api/v1',
  PHARMACIST_SERVICE: 'http://localhost:8001/api/v1',
  DRIVER_SERVICE: 'http://localhost:8002/api/v1'
};

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    return headers;
  }

  /**
   * Make API request
   */
  async request(url, options = {}) {
    const defaultOptions = {
      headers: this.getHeaders(),
      credentials: 'include'
    };
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, mergedOptions);
      
      // Handle 401 - try to refresh token
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          mergedOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
          return fetch(url, mergedOptions);
        }
      }
      
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.data.access_token, data.data.refresh_token);
        return true;
      }
      
      this.clearTokens();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Set tokens
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * Clear tokens
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  // ==================== Auth API ====================

  async register(data) {
    const response = await this.request(`${API_CONFIG.AUTH_SERVICE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async verifyOtp(phone, otp) {
    const response = await this.request(`${API_CONFIG.AUTH_SERVICE}/auth/verify-otp`, {
      method: 'POST',
      body: JSON.stringify({ phone, otp })
    });
    return response.json();
  }

  async login(emailOrPhone, password) {
    const response = await this.request(`${API_CONFIG.AUTH_SERVICE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email_or_phone: emailOrPhone, password })
    });
    return response.json();
  }

  async logout() {
    await this.request(`${API_CONFIG.AUTH_SERVICE}/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: this.refreshToken })
    });
    this.clearTokens();
  }

  async getCurrentUser() {
    const response = await this.request(`${API_CONFIG.AUTH_SERVICE}/auth/me`);
    return response.json();
  }

  // ==================== Search API ====================

  async searchMedicines(query, options = {}) {
    const params = new URLSearchParams({ q: query, ...options });
    const response = await this.request(`${API_CONFIG.SEARCH_SERVICE}/search/medicines?${params}`);
    return response.json();
  }

  async autocomplete(query) {
    const params = new URLSearchParams({ q: query });
    const response = await this.request(`${API_CONFIG.SEARCH_SERVICE}/search/autocomplete?${params}`);
    return response.json();
  }

  async searchPharmacies(lat, lon, radius = 10) {
    const params = new URLSearchParams({ lat, lon, radius });
    const response = await this.request(`${API_CONFIG.SEARCH_SERVICE}/search/pharmacies?${params}`);
    return response.json();
  }

  // ==================== Medicines API ====================

  async getMedicines(options = {}) {
    const params = new URLSearchParams(options);
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/medicines/search?${params}`);
    return response.json();
  }

  async getMedicine(id) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/medicines/${id}`);
    return response.json();
  }

  // ==================== Pharmacies API ====================

  async getPharmacies(options = {}) {
    const params = new URLSearchParams(options);
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/pharmacies?${params}`);
    return response.json();
  }

  async getPharmacy(id) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/pharmacies/${id}`);
    return response.json();
  }

  async getPharmacyInventory(id, options = {}) {
    const params = new URLSearchParams(options);
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/pharmacies/${id}/inventory?${params}`);
    return response.json();
  }

  // ==================== Orders API ====================

  async createOrder(orderData, idempotencyKey) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/orders`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(orderData)
    });
    return response.json();
  }

  async getOrders(options = {}) {
    const params = new URLSearchParams(options);
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/orders?${params}`);
    return response.json();
  }

  async getOrder(id) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/orders/${id}`);
    return response.json();
  }

  async cancelOrder(id) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/orders/${id}/cancel`, {
      method: 'POST'
    });
    return response.json();
  }

  async rateOrder(id, rating, review) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/orders/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, review })
    });
    return response.json();
  }

  // ==================== User API ====================

  async getUserProfile() {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/users/profile`);
    return response.json();
  }

  async updateUserProfile(data) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async getCart() {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/users/cart`);
    return response.json();
  }

  async updateCart(cart) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/users/cart`, {
      method: 'PUT',
      body: JSON.stringify({ cart })
    });
    return response.json();
  }

  // ==================== Payment API ====================

  async simulatePayment(orderId) {
    const response = await this.request(`${API_CONFIG.USER_ORDER_SERVICE}/payment/simulate`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId })
    });
    return response.json();
  }
}

// Global API instance
const api = new ApiClient();

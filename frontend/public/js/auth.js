/**
 * Authentication management for MedAssist Frontend
 */

class AuthManager {
  constructor() {
    this.user = null;
    this.loadUser();
  }

  /**
   * Load user from local storage
   */
  loadUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        this.user = null;
      }
    }
  }

  /**
   * Save user to local storage
   */
  saveUser(user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.user && !!localStorage.getItem('access_token');
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get user roles
   */
  getRoles() {
    return this.user?.roles || [];
  }

  /**
   * Check if user has role
   */
  hasRole(role) {
    return this.getRoles().includes(role);
  }

  /**
   * Login user
   */
  async login(emailOrPhone, password) {
    const result = await api.login(emailOrPhone, password);
    
    if (result.success && result.data.access_token) {
      api.setTokens(result.data.access_token, result.data.refresh_token);
      this.saveUser(result.data.user);
      return { success: true, user: result.data.user };
    }
    
    return result;
  }

  /**
   * Register user
   */
  async register(data) {
    return await api.register(data);
  }

  /**
   * Verify OTP
   */
  async verifyOtp(phone, otp) {
    const result = await api.verifyOtp(phone, otp);
    
    if (result.success && result.data.access_token) {
      api.setTokens(result.data.access_token, result.data.refresh_token);
      // Fetch user details
      const userResult = await api.getCurrentUser();
      if (userResult.success) {
        this.saveUser(userResult.data.user);
      }
    }
    
    return result;
  }

  /**
   * Logout user
   */
  async logout() {
    await api.logout();
    this.user = null;
    localStorage.removeItem('user');
    window.location.href = '/';
  }

  /**
   * Update UI based on auth state
   */
  updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    if (this.isLoggedIn()) {
      if (authButtons) authButtons.classList.add('hidden');
      if (userMenu) {
        userMenu.classList.remove('hidden');
        if (userName) userName.textContent = this.user.name || 'User';
        if (userAvatar) userAvatar.textContent = (this.user.name || 'U')[0].toUpperCase();
      }
    } else {
      if (authButtons) authButtons.classList.remove('hidden');
      if (userMenu) userMenu.classList.add('hidden');
    }
  }
}

// Global auth instance
const auth = new AuthManager();

// Initialize auth UI on page load
document.addEventListener('DOMContentLoaded', () => {
  auth.updateAuthUI();
  
  // Setup logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => auth.logout());
  }

  // Setup user menu dropdown
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', () => {
      userDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
      }
    });
  }
});

/**
 * Search functionality for MedAssist Frontend
 */

class SearchManager {
  constructor() {
    this.searchInput = null;
    this.autocompleteContainer = null;
    this.debounceTimer = null;
    this.debounceDelay = 300; // 300ms debounce
  }

  /**
   * Initialize search
   */
  init() {
    this.searchInput = document.getElementById('medicine-search');
    this.autocompleteContainer = document.getElementById('autocomplete-results');
    const searchBtn = document.getElementById('search-btn');

    if (this.searchInput) {
      // Input event for autocomplete
      this.searchInput.addEventListener('input', (e) => {
        this.handleInput(e.target.value);
      });

      // Focus event
      this.searchInput.addEventListener('focus', () => {
        if (this.searchInput.value.length >= 2) {
          this.showAutocomplete();
        }
      });

      // Enter key
      this.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performSearch();
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.performSearch());
    }

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (this.searchInput && !this.searchInput.contains(e.target) && 
          this.autocompleteContainer && !this.autocompleteContainer.contains(e.target)) {
        this.hideAutocomplete();
      }
    });
  }

  /**
   * Handle input with debounce
   */
  handleInput(value) {
    clearTimeout(this.debounceTimer);
    
    if (value.length < 2) {
      this.hideAutocomplete();
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.fetchAutocomplete(value);
    }, this.debounceDelay);
  }

  /**
   * Fetch autocomplete suggestions
   */
  async fetchAutocomplete(query) {
    try {
      // First try Elasticsearch
      let result = await api.autocomplete(query);
      
      // Fallback to MongoDB text search if ES fails
      if (!result.success || !result.data?.suggestions) {
        result = await api.getMedicines({ q: query, size: 10 });
        if (result.success) {
          result.data = { suggestions: result.data.medicines || [] };
        }
      }

      if (result.success && result.data.suggestions) {
        this.renderAutocomplete(result.data.suggestions);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }

  /**
   * Render autocomplete suggestions
   */
  renderAutocomplete(suggestions) {
    if (!this.autocompleteContainer) return;

    if (suggestions.length === 0) {
      this.hideAutocomplete();
      return;
    }

    this.autocompleteContainer.innerHTML = suggestions.map(item => `
      <div class="autocomplete-item" data-id="${item.id || item._id}">
        <div>
          <div class="medicine-name">${item.name}</div>
          <div class="medicine-brand">${item.brand || item.generic_name || ''}</div>
        </div>
        ${item.prescription_required ? '<span class="prescription-badge">Rx</span>' : ''}
      </div>
    `).join('');

    // Add click handlers
    this.autocompleteContainer.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        window.location.href = `public/pages/product-detail.html?id=${id}`;
      });
    });

    this.showAutocomplete();
  }

  /**
   * Show autocomplete
   */
  showAutocomplete() {
    if (this.autocompleteContainer) {
      this.autocompleteContainer.classList.remove('hidden');
    }
  }

  /**
   * Hide autocomplete
   */
  hideAutocomplete() {
    if (this.autocompleteContainer) {
      this.autocompleteContainer.classList.add('hidden');
    }
  }

  /**
   * Perform full search
   */
  performSearch() {
    const query = this.searchInput?.value?.trim();
    if (query) {
      window.location.href = `public/pages/search-results.html?q=${encodeURIComponent(query)}`;
    }
  }

  /**
   * Get search query from URL
   */
  getQueryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  }

  /**
   * Load search results (for search results page)
   */
  async loadSearchResults(container) {
    const query = this.getQueryFromURL();
    const category = new URLSearchParams(window.location.search).get('category');

    if (!container) return;

    container.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Loading...</p></div>';

    try {
      let result;
      if (query) {
        result = await api.getMedicines({ q: query, size: 20 });
      } else {
        result = await api.getMedicines({ size: 20 });
      }

      if (result.success && result.data.medicines) {
        this.renderSearchResults(container, result.data.medicines, query);
      } else {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>No results found</h3><p>Try searching with different keywords</p></div>';
      }
    } catch (error) {
      console.error('Search error:', error);
      container.innerHTML = '<div class="alert alert-error">Failed to load results. Please try again.</div>';
    }
  }

  /**
   * Render search results
   */
  renderSearchResults(container, medicines, query) {
    if (medicines.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No results found for "${query}"</h3>
          <p>Try searching with different keywords</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="search-header">
        <p>Found ${medicines.length} result(s) ${query ? `for "${query}"` : ''}</p>
      </div>
      <div class="products-grid grid-4">
        ${medicines.map(med => this.renderProductCard(med)).join('')}
      </div>
    `;

    // Add click handlers for add to cart
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        cart.addItem({
          medicine_id: id,
          qty: 1
        });
        showToast('Added to cart!');
      });
    });
  }

  /**
   * Render product card
   */
  renderProductCard(medicine) {
    const price = medicine.availability?.[0]?.price || 'N/A';
    const available = medicine.availability?.length > 0;

    return `
      <div class="product-card">
        <a href="public/pages/product-detail.html?id=${medicine._id}">
          <div class="product-image">💊</div>
          <div class="product-content">
            <h3 class="product-name">${medicine.name}</h3>
            <p class="product-brand">${medicine.brand || medicine.generic_name || ''}</p>
            ${medicine.prescription_required ? '<span class="badge badge-rx">Prescription Required</span>' : ''}
            <p class="product-price">₹${typeof price === 'number' ? price.toFixed(2) : price}</p>
            ${!available ? '<p class="text-secondary text-sm">Check availability</p>' : ''}
          </div>
        </a>
        <div class="product-actions">
          <button class="btn btn-primary btn-full add-to-cart-btn" data-id="${medicine._id}" ${!available ? 'disabled' : ''}>
            Add to Cart
          </button>
        </div>
      </div>
    `;
  }
}

// Global search instance
const search = new SearchManager();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  search.init();
});

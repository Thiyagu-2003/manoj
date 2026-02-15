// Configuration
const API_URL = 'http://127.0.0.1:8000/api';
const ITEMS_PER_PAGE = 12;

// Cache Manager for client-side caching
class CacheManager {
    constructor() {
        this.cache = {};
    }

    set(key, data, ttlMinutes = 5) {
        const expiresAt = Date.now() + (ttlMinutes * 60 * 1000);
        this.cache[key] = { data, expiresAt };
        console.log(`✓ Cached ${key} (TTL: ${ttlMinutes}min)`);
    }

    get(key) {
        const cached = this.cache[key];
        if (!cached) {
            return null;
        }
        
        if (Date.now() > cached.expiresAt) {
            delete this.cache[key];
            console.log(`⟳ Cache expired for ${key}`);
            return null;
        }
        
        console.log(`✓ Using cached ${key}`);
        return cached.data;
    }

    clear() {
        this.cache = {};
        console.log('Cache cleared');
    }
}

const cache = new CacheManager();

// Cart Manager for shopping cart functionality
class CartManager {
    constructor() {
        this.items = this.loadFromStorage();
        this.updateBadge();
    }

    loadFromStorage() {
        const saved = localStorage.getItem('grocery_cart');
        return saved ? JSON.parse(saved) : [];
    }

    saveToStorage() {
        localStorage.setItem('grocery_cart', JSON.stringify(this.items));
    }

    addItem(product) {
        const existing = this.items.find(item => item.product_id === product.product_id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.push({
                product_id: product.product_id,
                name: product.name,
                price: product.dynamic_price,
                quantity: 1
            });
        }
        this.saveToStorage();
        this.updateBadge();
        this.render();
        console.log(`+ Added ${product.name} to cart`);
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.product_id !== productId);
        this.saveToStorage();
        this.updateBadge();
        this.render();
    }

    updateQuantity(productId, delta) {
        const item = this.items.find(i => i.product_id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.removeItem(productId);
            } else {
                this.saveToStorage();
                this.render();
            }
        }
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    updateBadge() {
        const badge = document.getElementById('cartBadge');
        if (badge) {
            const count = this.items.reduce((sum, item) => sum + item.quantity, 0);
            badge.textContent = count;
            badge.classList.toggle('empty', count === 0);
        }
    }

    render() {
        const cartItems = document.getElementById('cartItems');
        const cartTotalValue = document.getElementById('cartTotalValue');
        
        if (!cartItems) return;

        if (this.items.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart-msg">Your cart is empty.</p>';
            if (cartTotalValue) cartTotalValue.textContent = '₹0.00';
            return;
        }

        cartItems.innerHTML = this.items.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <p>₹${item.price.toFixed(2)} x ${item.quantity}</p>
                </div>
                <div class="cart-item-controls">
                    <button class="btn-qty" onclick="cart.updateQuantity(${item.product_id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn-qty" onclick="cart.updateQuantity(${item.product_id}, 1)">+</button>
                </div>
            </div>
        `).join('');

        if (cartTotalValue) {
            cartTotalValue.textContent = `₹${this.getTotal().toFixed(2)}`;
        }
    }

    clear() {
        this.items = [];
        this.saveToStorage();
        this.updateBadge();
        this.render();
    }
}

const cart = new CartManager();

// Spinner Helper Functions
function showSpinner(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        // Only add if not already present
        if (!element.querySelector('.loading-spinner-container')) {
            const spinnerDiv = document.createElement('div');
            spinnerDiv.className = 'loading-spinner-container loading';
            spinnerDiv.innerHTML = 'Loading<span class="spinner-inline"></span>';
            
            // If it's the products grid, we want it to span all columns or be prominent
            if (elementId === 'productsGrid') {
                spinnerDiv.style.gridColumn = '1 / -1';
                spinnerDiv.style.textAlign = 'center';
                spinnerDiv.style.padding = '3rem';
            }
            
            element.prepend(spinnerDiv);
        }
    }
}

function hideSpinner(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const spinner = element.querySelector('.loading-spinner-container');
        if (spinner) {
            spinner.remove();
        }
    }
}

function showOverlaySpinner() {
    const overlay = document.createElement('div');
    overlay.id = 'spinnerOverlay';
    overlay.className = 'spinner-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
}

function hideOverlaySpinner() {
    const overlay = document.getElementById('spinnerOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// State Management
let state = {
    allProducts: [],
    filteredProducts: [],
    currentPage: 1,
    searchQuery: '',
    selectedCategory: '',
    sortBy: 'name',
    categories: [],
    cart: [],
    isAdminView: false,
    charts: {}
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Dynamic Pricing Application...');
    initTheme();
    await checkApiStatus();
    await loadCategories();
    await loadProducts();
    await loadInsights();
    
    // Add theme toggle listener
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('✓ Service Worker registered');
        } catch (error) {
            console.error('✗ Service Worker registration failed:', error);
        }
    }
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    console.log(`Theme switched to: ${isDark ? 'Dark' : 'Light'}`);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = isDark ? '☀️' : '🌙';
    }
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
}

// Check API Status
async function checkApiStatus() {
    try {
        const response = await fetch(API_URL.replace('/api', ''));
        if (response.ok) {
            updateApiStatus('Connected', false);
            console.log('✓ API is connected');
            return true;
        }
    } catch (error) {
        updateApiStatus('Disconnected', true);
        console.error('✗ API Connection Failed:', error);
        return false;
    }
}

function updateApiStatus(message, isError) {
    const statusElement = document.getElementById('apiStatus');
    statusElement.textContent = message;
    statusElement.classList.toggle('error', isError);
}

// Load Categories from API
async function loadCategories() {
    try {
        // Check cache first
        const cachedCategories = cache.get('categories');
        if (cachedCategories) {
            state.categories = cachedCategories;
            populateCategorySelect(); // Changed from populateCategoryDropdown to populateCategorySelect
            return;
        }

        console.log('⟳ Fetching categories from API...');
        const response = await fetch(`${API_URL}/categories`);
        const data = await response.json();
        state.categories = data.categories;
        
        // Cache for 10 minutes
        cache.set('categories', data.categories, 10);
        
        populateCategorySelect(); // Changed from populateCategoryDropdown to populateCategorySelect
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateCategorySelect() {
    const select = document.getElementById('categorySelect');
    if (!select) return;
    
    // Reset to only include "All Categories"
    select.innerHTML = '<option value="">All Categories</option>';
    
    state.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        select.appendChild(option);
    });
}

// Load Products from API
async function loadProducts() {
    try {
        const productsGrid = document.getElementById('productsGrid');
        
        // Check cache first
        const cachedProducts = cache.get('products');
        if (cachedProducts) {
            state.allProducts = cachedProducts;
            state.filteredProducts = cachedProducts;
            displayProducts(); // Changed from applyFiltersAndSort to displayProducts
            return;
        }

        // Show loading spinner
        showSpinner('productsGrid');
        
        console.log('⟳ Fetching products from API...');
        const response = await fetch(`${API_URL}/products`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        
        state.allProducts = products;
        state.filteredProducts = products;
        
        // Cache for 5 minutes
        cache.set('products', products, 5);
        
        // Hide spinner BEFORE displaying products to avoid clearing the grid
        hideSpinner('productsGrid');
        displayProducts(); 
    } catch (error) {
        console.error('Error loading products:', error);
        hideSpinner('productsGrid');
        document.getElementById('productsGrid').innerHTML = 
            '<div class="loading" style="color: #e74c3c; grid-column: 1/-1;">Failed to load products. Please try again.</div>';
    }
}

// Display Products
function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    const pagination = document.getElementById('pagination');
    
    // Start with all products
    let products = [...state.allProducts];
    
    // Search filter
    if (state.searchQuery) {
        products = products.filter(p => 
            p.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(state.searchQuery.toLowerCase())
        );
    }
    
    // Category filter
    if (state.selectedCategory) {
        products = products.filter(p => p.category === state.selectedCategory);
    }
    
    // Sort products
    const sortBy = state.sortBy;
    switch (sortBy) {
        case 'name':
            products.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'dynamic_price':
            products.sort((a, b) => a.dynamic_price - b.dynamic_price);
            break;
        case 'price_high':
            products.sort((a, b) => b.dynamic_price - a.dynamic_price);
            break;
        case 'demand':
            const demandOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
            products.sort((a, b) => demandOrder[b.demand_level] - demandOrder[a.demand_level]);
            break;
        case 'stock':
            products.sort((a, b) => b.stock - a.stock);
            break;
    }
    
    state.filteredProducts = products;
    
    // Check if no results
    if (products.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }
    
    noResults.style.display = 'none';
    
    // Pagination
    const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
    const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageProducts = products.slice(startIndex, endIndex);
    
    // Render products
    grid.innerHTML = pageProducts.map(product => createProductCard(product)).join('');
    
    // Show pagination if needed
    if (totalPages > 1) {
        pagination.style.display = 'flex';
        document.getElementById('pageInfo').textContent = 
            `Page ${state.currentPage} of ${totalPages}`;
    } else {
        pagination.style.display = 'none';
    }
}

// Create Product Card
function createProductCard(product) {
    const priceChange = product.discount_percent;
    const priceChangeBadgeClass = priceChange >= 0 ? 'positive' : '';
    const priceChangeText = priceChange >= 0 ? `+${priceChange.toFixed(1)}%` : `${priceChange.toFixed(1)}%`;
    
    // Determine trend arrow and class
    let trendArrow = '→';
    let trendClass = 'trend-stable';
    if (priceChange > 0.5) {
        trendArrow = '↑';
        trendClass = 'trend-up';
    } else if (priceChange < -0.5) {
        trendArrow = '↓';
        trendClass = 'trend-down';
    }
    
    const stockStatus = product.stock < 10 ? 'low' : product.stock < 50 ? 'medium' : 'high';
    const stockText = product.stock < 10 ? 'Low Stock!' : product.stock < 50 ? 'Medium Stock' : 'In Stock';
    
    return `
        <div class="product-card">
            <div class="product-header">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <span class="product-category">${escapeHtml(product.category)}</span>
            </div>
            
            <div class="product-details">
                <div class="detail-row">
                    <span class="detail-label">Base Price:</span>
                    <span class="base-price">₹${product.base_price.toFixed(2)}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Stock:</span>
                    <span class="detail-value">${product.stock} units</span>
                </div>
            </div>
            
            <div class="pricing-section">
                <div class="pricing-row">
                    <span class="detail-label">Current Price:</span>
                    <span class="dynamic-price">₹${product.dynamic_price.toFixed(2)}</span>
                </div>
                
                <div class="pricing-row">
                    <span class="detail-label">Price Change:</span>
                    <span class="discount-badge ${priceChangeBadgeClass}">
                        <span class="trend-arrow ${trendClass}">${trendArrow}</span>
                        ${priceChangeText}
                    </span>
                </div>
            </div>
            
            <div style="margin-top: 1rem;">
                <span class="demand-badge ${product.demand_level.toLowerCase()}">
                    📊 ${product.demand_level} Demand
                </span>
                <div class="stock-status ${stockStatus}">
                    ${stockText}
                </div>
            </div>
            
            <div class="product-actions">
                <button class="btn btn-add-cart" onclick="cart.addItem({
                    product_id: ${product.product_id},
                    name: '${escapeHtml(product.name)}',
                    dynamic_price: ${product.dynamic_price}
                })">
                    <span>🛒</span> Add to Cart
                </button>
                <button class="btn btn-view-details" onclick="showProductDetails(${product.product_id})">
                    View Details
                </button>
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Search Products
function searchProducts() {
    const searchInput = document.getElementById('searchInput');
    state.searchQuery = searchInput.value.trim();
    state.currentPage = 1;
    displayProducts();
}

// Filter by Category
function filterByCategory() {
    const categorySelect = document.getElementById('categorySelect');
    state.selectedCategory = categorySelect.value;
    state.currentPage = 1;
    displayProducts();
}

// Sort Products
// Sort Products Event Handler
function sortProducts() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        state.sortBy = sortSelect.value;
        state.currentPage = 1;
        displayProducts();
    }
}

// Pagination
function nextPage() {
    const totalPages = Math.ceil(state.filteredProducts.length / ITEMS_PER_PAGE);
    if (state.currentPage < totalPages) {
        state.currentPage++;
        displayProducts();
        window.scrollTo(0, 0);
    }
}

function previousPage() {
    if (state.currentPage > 1) {
        state.currentPage--;
        displayProducts();
        window.scrollTo(0, 0);
    }
}

// UI Controls
function toggleCart() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.toggle('active');
        if (modal.classList.contains('active')) {
            cart.render();
        }
    }
}

function checkout() {
    if (cart.items.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    showOverlaySpinner();
    
    // Simulate API call
    setTimeout(() => {
        hideOverlaySpinner();
        alert(`Order successful! Total: ₹${cart.getTotal().toFixed(2)}\nThank you for shopping with GroceryDynamix!`);
        cart.clear();
        toggleCart();
    }, 1500);
}

function toggleAdminView() {
    state.isAdminView = !state.isAdminView;
    const adminDashboard = document.getElementById('adminDashboard');
    const storeView = document.getElementById('storeView');
    const adminToggleBtn = document.getElementById('adminToggleBtn');

    if (state.isAdminView) {
        adminDashboard.style.display = 'block';
        storeView.style.display = 'none';
        if (adminToggleBtn) adminToggleBtn.style.display = 'none';
        loadAdminData();
    } else {
        adminDashboard.style.display = 'none';
        storeView.style.display = 'block';
        if (adminToggleBtn) adminToggleBtn.style.display = 'block';
    }
}

async function loadAdminData() {
    const cachedInsights = cache.get('insights');
    if (cachedInsights) {
        initCharts(cachedInsights);
        renderStatsTable(cachedInsights);
    } else {
        await loadInsights(); // This will call displayInsights which we'll update to also call initCharts
    }
}

function initCharts(data) {
    // 1. Sales & Demand Trends (Top 10)
    const salesCtx = document.getElementById('salesChart')?.getContext('2d');
    if (salesCtx) {
        if (state.charts.sales) state.charts.sales.destroy();
        
        const topProducts = data.top_demand_products || [];
        state.charts.sales = new Chart(salesCtx, {
            type: 'bar',
            data: {
                labels: topProducts.map(p => p.name),
                datasets: [{
                    label: 'Demand Ratio',
                    data: topProducts.map(p => p.demand_ratio),
                    backgroundColor: '#10b981',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // 2. Inventory Distribution by Category
    const invCtx = document.getElementById('inventoryChart')?.getContext('2d');
    if (invCtx) {
        if (state.charts.inventory) state.charts.inventory.destroy();
        
        const stats = data.category_statistics || {};
        const labels = Object.keys(stats);
        state.charts.inventory = new Chart(invCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: labels.map(l => stats[l].stock),
                    backgroundColor: [
                        '#10b981', '#6366f1', '#f59e0b', '#ef4444', 
                        '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

function renderStatsTable(data) {
    const container = document.getElementById('categoryStatsTable');
    if (!container) return;

    const stats = data.category_statistics || {};
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Items</th>
                    <th>Avg Price</th>
                    <th>Total Stock</th>
                    <th>7D Sales</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const [cat, detail] of Object.entries(stats)) {
        html += `
            <tr>
                <td><strong>${cat.charAt(0).toUpperCase() + cat.slice(1)}</strong></td>
                <td>${detail.product_count}</td>
                <td>₹${detail.base_price.toFixed(2)}</td>
                <td>${detail.stock}</td>
                <td>${detail.sales_7}</td>
            </tr>
        `;
    }

    html += `
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

// Placeholder for Product Details (will be enhanced in next task)
function showProductDetails(productId) {
    const product = state.allProducts.find(p => p.product_id === productId);
    if (!product) return;

    const modal = document.getElementById('detailsModal');
    const content = modal.querySelector('.modal-content');
    
    content.innerHTML = `
        <div class="modal-header">
            <h3>${escapeHtml(product.name)}</h3>
            <span class="close-modal" onclick="closeDetails()">&times;</span>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
            <div style="display: flex; gap: 2rem; margin-bottom: 2rem;">
                <div style="flex: 1;">
                    <p><strong>Category:</strong> ${escapeHtml(product.category)}</p>
                    <p><strong>Available Stock:</strong> ${product.stock} units</p>
                    <p><strong>Base Price:</strong> ₹${product.base_price.toFixed(2)}</p>
                    <p style="font-size: 1.5rem; color: var(--accent-color); margin-top: 1rem;">
                        <strong>Current Price:</strong> ₹${product.dynamic_price.toFixed(2)}
                    </p>
                </div>
                <div style="flex: 1; background: var(--secondary-bg); border-radius: 12px; padding: 1rem; position: relative; min-height: 200px;">
                    <canvas id="productDetailChart"></canvas>
                </div>
            </div>
            <div style="margin-bottom: 2rem;">
                <h4 style="margin-bottom: 0.5rem; color: var(--text-main);">User Sentiment</h4>
                <div style="display: flex; gap: 0.5rem; color: #f59e0b;">
                    <span>★★★★☆</span>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">(4.2 based on 128 orders)</span>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">"Usually fresh and well-stocked. Price fluctuates but it's okay for the quality."</p>
            </div>
            <button class="btn btn-add-cart" onclick="cart.addItem({
                product_id: ${product.product_id},
                name: '${escapeHtml(product.name)}',
                dynamic_price: ${product.dynamic_price}
            }); closeDetails();">Add to Cart</button>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Initialize Product Detail Chart (Stock History)
    setTimeout(() => {
        const ctx = document.getElementById('productDetailChart')?.getContext('2d');
        if (ctx) {
            if (state.charts.productDetail) state.charts.productDetail.destroy();
            
            // Generate some semi-realistic mock history
            const baseStock = product.stock;
            const labels = ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today'];
            const stockHistory = labels.map((_, i) => Math.max(0, baseStock + Math.floor(Math.random() * 20) - (7-i)*2));

            state.charts.productDetail = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Stock Level',
                        data: stockHistory,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }, 100);
}

function closeDetails() {
    document.getElementById('detailsModal').classList.remove('active');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const cartModal = document.getElementById('cartModal');
    const detailsModal = document.getElementById('detailsModal');
    if (event.target === cartModal) toggleCart();
    if (event.target === detailsModal) closeDetails();
}

// Load Insights
async function loadInsights() {
    try {
        // Check cache first
        const cachedInsights = cache.get('insights');
        if (cachedInsights) {
            displayInsights(cachedInsights);
            return;
        }

        showSpinner('insightsSection');
        
        console.log('⟳ Fetching insights from API...');
        const response = await fetch(`${API_URL}/insights`);
        const data = await response.json();
        
        // Cache for 2 minutes
        cache.set('insights', data, 2);
        
        hideSpinner('insightsSection');
        displayInsights(data);
        if (state.isAdminView) {
            initCharts(data);
            renderStatsTable(data);
        }
    } catch (error) {
        console.error('Error loading insights:', error);
        hideSpinner('insightsSection');
    }
}

function displayInsights(data) {
    // Update insight cards
    const totalProducts = document.getElementById('totalProducts');
    const totalStock = document.getElementById('totalStock');
    const salesWeek = document.getElementById('salesWeek');
    const avgPrice = document.getElementById('avgPrice');

    if (totalProducts) totalProducts.textContent = data.total_products || '0';
    if (totalStock) totalStock.textContent = data.total_stock?.toLocaleString() || '0';
    if (salesWeek) salesWeek.textContent = data.total_sales_7days?.toLocaleString() || '0';
    if (avgPrice) avgPrice.textContent = data.average_price ? `₹${data.average_price.toFixed(2)}` : '-';
    
    // Display low stock alerts
    if (data.low_stock_alerts && data.low_stock_alerts.length > 0) {
        displayAlerts(data.low_stock_alerts);
    } else {
        const alertsSection = document.getElementById('alertsSection');
        if (alertsSection) alertsSection.style.display = 'none';
    }
}

// Display Low Stock Alerts
function displayAlerts(alerts) {
    const alertsSection = document.getElementById('alertsSection');
    const alertsList = document.getElementById('alertsList');
    
    if (!alertsSection || !alertsList) return;

    alertsList.innerHTML = alerts.map(alert => `
        <div class="alert-item">
            <strong>${escapeHtml(alert.name)}</strong>: Only ${alert.stock} units left!
        </div>
    `).join('');
    
    alertsSection.style.display = 'block';
}

// Global Event Listeners
document.addEventListener('keyup', (e) => {
    if (e.target.id === 'searchInput' && e.key === 'Enter') {
        searchProducts();
    }
});

let searchTimeout;
document.addEventListener('input', (e) => {
    if (e.target.id === 'searchInput') {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchProducts();
        }, 300);
    }
});

// Log initialization
console.log('✓ Dynamic Pricing Frontend initialized');
console.log(`API URL: ${API_URL}`);

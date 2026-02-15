// Configuration
const API_URL = 'http://127.0.0.1:8000/api';
const ITEMS_PER_PAGE = 12;

// State Management
let state = {
    allProducts: [],
    filteredProducts: [],
    currentPage: 1,
    searchQuery: '',
    selectedCategory: '',
    sortBy: 'name',
    categories: []
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Dynamic Pricing Application...');
    await checkApiStatus();
    await loadCategories();
    await loadProducts();
    await loadInsights();
});

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

// Load Categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const data = await response.json();
        state.categories = data.categories;
        populateCategorySelect();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateCategorySelect() {
    const select = document.getElementById('categorySelect');
    state.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        select.appendChild(option);
    });
}

// Load Products
async function loadProducts() {
    try {
        console.log('Loading products...');
        const response = await fetch(`${API_URL}/products`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        state.allProducts = products;
        state.filteredProducts = products;
        
        console.log(`✓ Loaded ${products.length} products`);
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="loading" style="grid-column: 1/-1;">Error loading products. Please check if the backend is running.</div>';
    }
}

// Display Products
function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    const pagination = document.getElementById('pagination');
    
    // Apply filters
    let products = state.allProducts;
    
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
    
    state.filteredProducts = products;
    
    // Sort
    sortProducts();
    
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
                    <span class="discount-badge ${priceChangeBadgeClass}">${priceChangeText}</span>
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
            
            <button onclick="addToCart(${product.product_id}, '${escapeHtml(product.name)}')" 
                    style="width: 100%; margin-top: 1rem; background: #3498db; color: white; padding: 0.75rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.3s;" 
                    onmouseover="this.style.background='#2980b9'" 
                    onmouseout="this.style.background='#3498db'">
                Add to Cart 🛒
            </button>
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
function sortProducts() {
    const sortSelect = document.getElementById('sortSelect');
    const sortBy = sortSelect ? sortSelect.value : state.sortBy;
    state.sortBy = sortBy;
    
    let products = [...state.filteredProducts];
    
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
    state.currentPage = 1;
    displayProducts();
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

// Load Insights
async function loadInsights() {
    try {
        const response = await fetch(`${API_URL}/insights`);
        const insights = await response.json();
        
        // Update insight cards
        document.getElementById('totalProducts').textContent = insights.total_products;
        document.getElementById('totalStock').textContent = insights.total_stock.toLocaleString();
        document.getElementById('salesWeek').textContent = insights.total_sales_7days.toLocaleString();
        document.getElementById('avgPrice').textContent = `₹${insights.average_price.toFixed(2)}`;
        
        // Show low stock alerts if any
        if (insights.low_stock_alerts && insights.low_stock_alerts.length > 0) {
            displayAlerts(insights.low_stock_alerts);
        }
        
        console.log('✓ Insights loaded');
    } catch (error) {
        console.error('Error loading insights:', error);
    }
}

// Display Low Stock Alerts
function displayAlerts(alerts) {
    const alertsSection = document.getElementById('alertsSection');
    const alertsList = document.getElementById('alertsList');
    
    alertsList.innerHTML = alerts.map(alert => `
        <div class="alert-item">
            <strong>${escapeHtml(alert.name)}</strong> (ID: ${alert.product_id})
            <br>
            <small>Current Stock: <strong>${alert.stock} units</strong></small>
        </div>
    `).join('');
    
    alertsSection.style.display = 'block';
}

// Add to Cart (Simulated)
function addToCart(productId, productName) {
    alert(`✅ "${productName}" added to cart!\n\nNote: This is a demo. Cart functionality can be integrated with a backend database.`);
}

// Allow Enter key to search
document.addEventListener('keyup', (e) => {
    if (e.target.id === 'searchInput' && e.key === 'Enter') {
        searchProducts();
    }
});

// Debounce search for real-time filtering (optional)
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
console.log(`Items per page: ${ITEMS_PER_PAGE}`);

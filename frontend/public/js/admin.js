const API_BASE = '/api';
let currentUser = null;
let authToken = localStorage.getItem('token');

function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast';
    toast.innerHTML = '<div class="toast-icon"><i class="fas fa-check"></i></div><div class="toast-message"></div>';
    document.body.appendChild(toast);
  }
  toast.querySelector('.toast-message').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', function () {
  checkAuth();

  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('settings-form')?.addEventListener('submit', handleSettingsSubmit);
  document.getElementById('account-form')?.addEventListener('submit', handleAccountSubmit);
  document.getElementById('userForm')?.addEventListener('submit', handleUserSubmit);
  document.getElementById('pageForm')?.addEventListener('submit', handlePageSubmit);
});

async function checkAuth() {
  if (authToken) {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        currentUser = await response.json();
        showAdminPanel();
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }
  showLogin();
}

function showLogin() {
  document.getElementById('login-overlay').classList.add('active');
  document.getElementById('user-profile').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('login-overlay').classList.remove('active');
  document.getElementById('user-profile').style.display = 'flex';
  document.getElementById('user-name').textContent = currentUser.name || currentUser.username;

  if (currentUser.role === 'admin') {
    document.getElementById('nav-users').style.display = 'block';
  }

  setupNavigation();
  loadDashboard();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('token', authToken);
      errorEl.textContent = '';
      showAdminPanel();
    } else {
      errorEl.textContent = data.message || 'Login failed';
    }
  } catch (error) {
    errorEl.textContent = 'Connection error';
  }
}

function logout() {
  localStorage.removeItem('token');
  authToken = null;
  currentUser = null;
  document.getElementById('nav-users').style.display = 'none';
  showLogin();
  document.getElementById('login-form').reset();
}

// ==================== NAVIGATION ====================
function setupNavigation() {
  const navLinks = document.querySelectorAll('.admin-nav a[data-section]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (section === 'users' && currentUser?.role !== 'admin') {
        alert('Admin access required');
        return;
      }
      switchSection(section);
    });
  });
}

function switchSection(section) {
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  document.querySelector(`.admin-nav a[data-section="${section}"]`)?.classList.add('active');

  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById(section)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    products: 'Product Management',
    orders: 'Order Management',
    customers: 'Customer Management',
    categories: 'Category Management',
    analytics: 'Analytics',
    pages: 'Page Management',
    customerService: 'Customer Service',
    users: 'User Management',
    account: 'My Account',
    settings: 'Store Settings'
  };
  document.getElementById('page-title').textContent = titles[section] || 'Dashboard';

  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'products': loadProducts(); break;
    case 'orders': loadOrders(); break;
    case 'customers': loadCustomers(); break;
    case 'categories': loadCategories(); break;
    case 'analytics': loadAnalytics(); break;
    case 'pages': loadPages(); break;
    case 'customer-service': loadCustomerService(); break;
    case 'users': loadUsers(); break;
    case 'account': loadAccount(); break;
    case 'settings': loadSettings(); break;
  }
}

// ==================== API HELPERS ====================
async function authFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`
    }
  });
  if (response.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  return response;
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  try {
    const [statsRes, ordersRes, productsRes] = await Promise.all([
      authFetch(`${API_BASE}/admin/stats`),
      authFetch(`${API_BASE}/admin/orders`),
      authFetch(`${API_BASE}/products`)
    ]);

    const stats = await statsRes.json();
    const orders = await ordersRes.json();
    const products = await productsRes.json();

    updateStatsCards(stats);
    displayOrdersTable(orders.slice(0, 5), 'dashboard-orders-table');
    displayProductPhotos(products.slice(0, 8));
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

function displayProductPhotos(products) {
  const container = document.getElementById('dashboard-product-photos');
  if (!container) return;

  container.innerHTML = products.map(product => `
    <div class="product-photo-card">
      <img src="${product.images?.[0] || 'images/1.jpg'}" alt="${product.name}">
      <div class="product-photo-info">
        <h4>${product.name}</h4>
        <p>Stock: ${product.stock}</p>
      </div>
    </div>
  `).join('');
}

function updateStatsCards(stats) {
  const statNumbers = document.querySelectorAll('#dashboard .stat-number');
  if (statNumbers[0]) statNumbers[0].textContent = `$${(stats.monthlySales || 0).toLocaleString()}`;
  if (statNumbers[1]) statNumbers[1].textContent = (stats.totalCustomers || 0).toLocaleString();
  if (statNumbers[2]) statNumbers[2].textContent = (stats.totalProducts || 0).toLocaleString();
  if (statNumbers[3]) statNumbers[3].textContent = `$${(stats.totalValue || 0).toLocaleString()}`;
  if (document.getElementById('pending-orders')) {
    document.getElementById('pending-orders').textContent = stats.pendingOrders || 0;
  }
  if (document.getElementById('delivered-orders')) {
    document.getElementById('delivered-orders').textContent = stats.deliveredOrders || 0;
  }
}

// ==================== PRODUCTS ====================
async function loadProducts() {
  try {
    const response = await authFetch(`${API_BASE}/products`);
    const products = await response.json();
    displayProductsTable(products);
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function displayProductsTable(products) {
  const table = document.getElementById('products-table');
  if (!table) return;

  table.innerHTML = '';

  products.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product._id?.substring(0, 8)}</td>
      <td>${product.name}</td>
      <td><span class="category-badge ${product.category}">${product.category}</span></td>
      <td>$${product.price.toFixed(2)}</td>
      <td>${product.stock}</td>
      <td>
        <span class="status ${getStockStatus(product.stock)}">
          ${getStockStatusText(product.stock)}
        </span>
      </td>
      <td>
        <button class="btn-action btn-edit" onclick="editProduct('${product._id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-action btn-delete" onclick="deleteProduct('${product._id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    table.appendChild(row);
  });
}

function getStockStatus(stock) {
  if (stock > 20) return "active";
  if (stock > 0) return "low";
  return "out";
}

function getStockStatusText(stock) {
  if (stock > 20) return "In Stock";
  if (stock > 0) return "Low Stock";
  return "Out of Stock";
}

function openProductModal(product = null) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('modal-title');
  const submitBtn = document.getElementById('product-submit-btn');
  const form = document.getElementById('productForm');

  form.reset();
  document.getElementById('productId').value = '';

  if (product) {
    title.textContent = 'Edit Product';
    submitBtn.textContent = 'Update Product';
    document.getElementById('productId').value = product._id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productImages').value = product.images ? product.images.join('\n') : '';
    document.getElementById('productFeatured').checked = product.featured || false;
    document.getElementById('productNewArrival').checked = product.newArrival || false;
    document.getElementById('productOnSale').checked = product.onSale || false;
    document.getElementById('productDiscount').value = product.discount || 0;
    if (product.sizes) {
      document.querySelectorAll('.size-checkbox').forEach(cb => {
        cb.checked = product.sizes.includes(cb.value);
      });
    }
  } else {
    title.textContent = 'Add New Product';
    submitBtn.textContent = 'Add Product';
    document.getElementById('productFeatured').checked = false;
    document.getElementById('productNewArrival').checked = true;
    document.getElementById('productOnSale').checked = false;
    document.getElementById('productDiscount').value = 0;
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('productModal').style.display = 'none';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.querySelectorAll('.size-checkbox').forEach(cb => cb.checked = false);
}

async function handleProductSubmit(e) {
  e.preventDefault();

  const productId = document.getElementById('productId').value;
  const imagesText = document.getElementById('productImages').value;
  const images = imagesText ? imagesText.split('\n').map(url => url.trim()).filter(url => url) : [];

  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  const manualCategory = document.getElementById('productCategory').value;

  // Auto-detect category based on product name and description
  const category = detectCategory(name, description, manualCategory);

  const sizeCheckboxes = document.querySelectorAll('.size-checkbox:checked');
  const sizes = Array.from(sizeCheckboxes).map(cb => cb.value);

  const productData = {
    name: name,
    description: description,
    price: parseFloat(document.getElementById('productPrice').value),
    stock: parseInt(document.getElementById('productStock').value),
    category: category,
    images: images,
    sizes: sizes,
    featured: document.getElementById('productFeatured').checked,
    newArrival: document.getElementById('productNewArrival').checked,
    onSale: document.getElementById('productOnSale').checked,
    discount: parseInt(document.getElementById('productDiscount').value) || 0
  };

  try {
    let response;
    if (productId) {
      response = await authFetch(`${API_BASE}/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
    } else {
      response = await authFetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
    }

    if (response.ok) {
      closeModal();
      loadProducts();
      loadCategories();
      alert(productId ? 'Product updated successfully!' : 'Product added successfully!');
    } else {
      const error = await response.json();
      alert('Error: ' + (error.message || 'Failed to save product'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error saving product');
  }
}

function detectCategory(name, description, manualCategory) {
  const text = (name + ' ' + description).toLowerCase();
  
  // Keywords for each category
  const categoryKeywords = {
    men: ['men', "men's", 'man', 'male', 'groom', 'suit', 'tie', 'dress shirt', 'polo', 'briefs', 'trunks', 'vest', 'blazer', 'jeans men', 'shirt men'],
    women: ['women', "women's", 'woman', 'female', 'lady', 'dress', 'blouse', 'skirt', 'gown', 'saree', 'hijab', 'lingerie', 'bra', 'panties', 'jeans women', 'leggings', 'crop top', 'tunic'],
    kids: ['kids', 'children', 'child', 'baby', 'boy', 'girl', 'infant', 'toddler', 'youth', 'little'],
    accessories: ['accessory', 'accessories', 'jewelry', 'jewellery', 'watch', 'sunglasses', 'bag', 'purse', 'wallet', 'belt', 'hat', 'cap', 'scarf', 'ring', 'necklace', 'earring', 'bracelet', 'chain', 'pendant', 'brooch', 'hair accessory'],
    perfumes: ['perfume', 'perfumes', 'fragrance', 'cologne', 'scent', 'attar', 'oud', 'bakhoor', 'incense', 'spray', 'deodorant', 'body spray', 'essential oil', 'perfume oil']
  };

  // Check manual category first
  if (manualCategory && manualCategory !== 'other') {
    return manualCategory;
  }

  // Auto-detect based on keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  // Default category
  return 'other';
}

async function editProduct(productId) {
  try {
    const response = await fetch(`${API_BASE}/products/${productId}`);
    if (!response.ok) {
      alert('Product not found. It may have been deleted.');
      loadProducts();
      return;
    }
    const product = await response.json();
    openProductModal(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    alert('Error loading product');
  }
}

async function deleteProduct(productId) {
  if (confirm('Are you sure you want to delete this product?')) {
    try {
      const response = await authFetch(`${API_BASE}/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadProducts();
        alert('Product deleted successfully!');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting product');
    }
  }
}

// ==================== ORDERS ====================
async function loadOrders() {
  try {
    const response = await authFetch(`${API_BASE}/admin/orders`);
    const orders = await response.json();
    displayOrdersTable(orders, 'orders-table');
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

function displayOrdersTable(orders, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const statusLabels = {
    pending: 'Order Placed',
    payment_confirmed: 'Payment Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  table.innerHTML = '';

  orders.forEach(order => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.orderId || order._id?.substring(0, 8)}</td>
      <td>${order.customer?.name || 'Unknown'}</td>
      <td>${order.customer?.email || '-'}</td>
      <td>${new Date(order.orderDate).toLocaleDateString()}</td>
      <td>$${(order.totalAmount || 0).toFixed(2)}</td>
      <td>
        <span class="status ${order.status}">
          ${statusLabels[order.status] || order.status}
        </span>
      </td>
      <td class="actions-cell">
        <button class="btn-action btn-view" onclick="viewOrder('${order._id}')" title="View">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-action btn-edit" onclick="viewOrder('${order._id}')" title="Edit Status">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-action btn-delete" onclick="deleteOrder('${order._id}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    table.appendChild(row);
  });
}

async function viewOrder(orderId) {
  try {
    const response = await authFetch(`${API_BASE}/admin/orders/${orderId}`);
    if (!response.ok) {
      alert('Order not found');
      return;
    }
    const order = await response.json();

    const statusLabels = {
      pending: 'Order Placed',
      payment_confirmed: 'Payment Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };

    const statusOptions = Object.keys(statusLabels).map(s =>
      `<option value="${s}" ${order.status === s ? 'selected' : ''}>${statusLabels[s]}</option>`
    ).join('');

    const detailsHtml = `
      <div class="order-info">
        <p><strong>Order ID:</strong> ${order.orderId || order._id}</p>
        <p><strong>Customer:</strong> ${order.customer?.name || 'Unknown'}</p>
        <p><strong>Email:</strong> ${order.customer?.email || '-'}</p>
        <p><strong>Phone:</strong> ${order.customer?.phone || '-'}</p>
        <p><strong>Address:</strong> ${order.customer?.address || '-'}</p>
        <p><strong>Total:</strong> $${order.totalAmount?.toFixed(2)}</p>
        <p><strong>Payment:</strong> ${order.paymentMethod || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(order.orderDate).toLocaleString()}</p>
      </div>
      <div class="order-status-update">
        <label><strong>Update Status:</strong></label>
        <div class="status-selector">
          <select id="order-status-select">${statusOptions}</select>
          <button class="btn-submit" onclick="updateOrderStatus('${orderId}')">Update</button>
        </div>
      </div>
      <h4>Items:</h4>
      <ul class="order-items">
        ${order.items?.map(item => `
          <li>${item.name} x${item.quantity} - $${item.price}</li>
        `).join('') || '<li>No items</li>'}
      </ul>
    `;

    document.getElementById('order-details').innerHTML = detailsHtml;
    document.getElementById('orderModal').style.display = 'flex';
  } catch (error) {
    console.error('Error:', error);
    alert('Error loading order details');
  }
}

function closeOrderModal() {
  document.getElementById('orderModal').style.display = 'none';
}

async function updateOrderStatus(orderId) {
  const select = document.getElementById('order-status-select');
  if (!select) return;
  const newStatus = select.value;
  try {
    const response = await authFetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (response.ok) {
      loadOrders();
      loadDashboard();
      closeOrderModal();
      showToast('Order status updated successfully!');
    } else {
      const err = await response.json();
      alert('Error: ' + (err.message || 'Failed to update status'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error updating order status');
  }
}

async function deleteOrder(orderId) {
  if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
  try {
    const response = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
      loadOrders();
      loadDashboard();
      showToast('Order deleted successfully');
    } else {
      const text = await response.text();
      try {
        const err = JSON.parse(text);
        alert(err.message || 'Failed to delete order');
      } catch {
        alert('Failed to delete order (status ' + response.status + ')');
      }
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Network error - could not delete order');
  }
}

// ==================== CUSTOMERS ====================
async function loadCustomers() {
  try {
    const response = await authFetch(`${API_BASE}/admin/customers`);
    const customers = await response.json();
    displayCustomersTable(customers);
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

function displayCustomersTable(customers) {
  const table = document.getElementById('customers-table');
  if (!table) return;

  table.innerHTML = '';

  customers.forEach(customer => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${customer.name || 'Unknown'}</td>
      <td>${customer.email}</td>
      <td>${customer.phone || '-'}</td>
      <td>${customer.totalOrders}</td>
      <td>$${customer.totalSpent.toFixed(2)}</td>
      <td>${new Date(customer.lastOrder).toLocaleDateString()}</td>
      <td class="actions-cell">
        <button class="btn-action btn-view" onclick="viewCustomerOrders('${customer.email}')" title="View Orders">
          <i class="fas fa-history"></i>
        </button>
        <button class="btn-action btn-delete" onclick="deleteCustomer('${customer.email}')" title="Delete Customer">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    table.appendChild(row);
  });
}

function viewCustomerOrders(email) {
  switchSection('orders');
  const searchInput = document.querySelector('#orders .search-input');
  if (searchInput) {
    searchInput.value = email;
    filterOrders();
  }
}

async function deleteCustomer(email) {
  if (!confirm(`Delete all orders for ${email}? This cannot be undone.`)) return;
  try {
    const response = await authFetch(`${API_BASE}/admin/customers/${encodeURIComponent(email)}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      loadCustomers();
      loadOrders();
      loadDashboard();
      showToast('Customer deleted successfully');
    } else {
      const err = await response.json();
      alert('Error: ' + (err.message || 'Failed to delete customer'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error deleting customer');
  }
}

// ==================== CATEGORIES ====================
let categoryProducts = [];

async function loadCategories() {
  try {
    const response = await authFetch(`${API_BASE}/products`);
    categoryProducts = await response.json();
    setupCategoryTabs();
    displayCategoryProducts('all');
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function setupCategoryTabs() {
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      displayCategoryProducts(this.dataset.category);
    });
  });
}

function displayCategoryProducts(category) {
  const grid = document.getElementById('category-products-grid');
  const noProducts = document.getElementById('no-category-products');
  if (!grid) return;

  let products = category === 'all'
    ? categoryProducts
    : categoryProducts.filter(p => p.category === category);

  if (products.length === 0) {
    grid.innerHTML = '';
    noProducts.style.display = 'block';
    return;
  }

  noProducts.style.display = 'none';
  grid.innerHTML = products.map(product => `
    <div class="category-product-card">
      <img src="${product.images?.[0] || 'images/1.jpg'}" alt="${product.name}">
      <div class="category-product-info">
        <h4>${product.name}</h4>
        <p class="category-badge ${product.category}">${product.category}</p>
        <p class="price">$${product.price.toFixed(2)}</p>
        <p class="stock">Stock: ${product.stock}</p>
        <div class="category-product-actions">
          <button class="btn-action btn-edit" onclick="editProductFromCategory('${product._id}')">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn-action btn-delete" onclick="deleteProductFromCategory('${product._id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function editProductFromCategory(productId) {
  switchSection('products');
  const product = categoryProducts.find(p => p._id === productId);
  if (product) {
    openProductModal(product);
  }
}

async function deleteProductFromCategory(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const response = await authFetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('Product deleted successfully');
      loadCategories();
      loadProducts();
    } else {
      alert('Error deleting product');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error deleting product');
  }
}

// ==================== ANALYTICS ====================
async function loadAnalytics() {
  try {
    const response = await authFetch(`${API_BASE}/admin/analytics`);
    const data = await response.json();
    displayAnalytics(data);
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

function displayAnalytics(data) {
  if (document.getElementById('analytics-revenue')) {
    document.getElementById('analytics-revenue').textContent = `$${data.recentRevenue?.toLocaleString() || 0}`;
  }
  if (document.getElementById('analytics-orders')) {
    document.getElementById('analytics-orders').textContent = data.totalOrders || 0;
  }

  const statusGrid = document.getElementById('status-grid');
  if (statusGrid) {
    const statusColors = {
      pending: '#ffc107',
      payment_confirmed: '#17a2b8',
      processing: '#0dcaf0',
      shipped: '#6f42c1',
      out_for_delivery: '#e83e8c',
      delivered: '#198754',
      cancelled: '#dc3545'
    };

    const statusLabels = {
      pending: 'Order Placed',
      payment_confirmed: 'Payment Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };

    statusGrid.innerHTML = Object.entries(data.statusCounts || {}).map(([status, count]) => `
      <div class="status-card" style="border-left: 4px solid ${statusColors[status] || '#999'}">
        <h4>${statusLabels[status] || status}</h4>
        <p class="status-count">${count}</p>
      </div>
    `).join('');
  }

  const topProductsTable = document.getElementById('top-products-table');
  if (topProductsTable && data.topProducts) {
    topProductsTable.innerHTML = data.topProducts.map(product => `
      <tr>
        <td>${product.name}</td>
        <td><span class="category-badge ${product.category}">${product.category}</span></td>
        <td>$${product.price.toFixed(2)}</td>
        <td>${product.stock}</td>
      </tr>
    `).join('');
  }
}

// ==================== USERS (Admin Only) ====================
async function loadUsers() {
  if (currentUser?.role !== 'admin') {
    alert('Admin access required');
    switchSection('dashboard');
    return;
  }

  try {
    const response = await authFetch(`${API_BASE}/auth/users`);
    const users = await response.json();
    displayUsersTable(users);
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function displayUsersTable(users) {
  const table = document.getElementById('users-table');
  if (!table) return;

  table.innerHTML = '';

  users.forEach(user => {
    const isCurrentUser = user._id === currentUser?._id;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.name || '-'}</td>
      <td>${user.email}</td>
      <td><span class="category-badge ${user.role}">${user.role}</span></td>
      <td>
        <button class="btn-action ${user.isActive ? 'btn-active' : 'btn-inactive'}" onclick="toggleUserStatus('${user._id}', ${!user.isActive})">
          <i class="fas ${user.isActive ? 'fa-check-circle' : 'fa-times-circle'}"></i>
          ${user.isActive ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
      <td>
        <button class="btn-action btn-edit" onclick="editUser('${user._id}')">
          <i class="fas fa-edit"></i>
        </button>
        ${!isCurrentUser ? `
        <button class="btn-action btn-delete" onclick="deleteUser('${user._id}')">
          <i class="fas fa-trash"></i>
        </button>
        ` : '<span style="color:#999;font-size:12px;">You</span>'}
      </td>
    `;
    table.appendChild(row);
  });
}

async function toggleUserStatus(userId, newStatus) {
  try {
    const response = await authFetch(`${API_BASE}/auth/users/${userId}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: newStatus })
    });

    if (response.ok) {
      loadUsers();
      alert(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    } else {
      alert('Error updating user status');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error updating user status');
  }
}

function openUserModal(user = null) {
  const modal = document.getElementById('userModal');
  const title = document.getElementById('user-modal-title');
  const submitBtn = document.getElementById('user-submit-btn');
  const form = document.getElementById('userForm');
  const passwordGroup = document.getElementById('password-group');

  form.reset();
  document.getElementById('userId').value = '';

  if (user) {
    title.textContent = 'Edit User';
    submitBtn.textContent = 'Update User';
    document.getElementById('userId').value = user._id;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userName').value = user.name || '';
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    passwordGroup.style.display = 'none';
  } else {
    title.textContent = 'Add User';
    submitBtn.textContent = 'Add User';
    passwordGroup.style.display = 'block';
  }

  modal.style.display = 'flex';
}

function closeUserModal() {
  document.getElementById('userModal').style.display = 'none';
  document.getElementById('userForm').reset();
  document.getElementById('password-group').style.display = 'block';
}

async function editUser(userId) {
  try {
    const response = await authFetch(`${API_BASE}/auth/users`);
    const users = await response.json();
    const user = users.find(u => u._id === userId);
    if (user) openUserModal(user);
  } catch (error) {
    console.error('Error:', error);
    alert('Error loading user');
  }
}

async function deleteUser(userId) {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      const response = await authFetch(`${API_BASE}/auth/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadUsers();
        alert('User deleted successfully!');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting user');
    }
  }
}

async function handleUserSubmit(e) {
  e.preventDefault();

  const userId = document.getElementById('userId').value;
  const userData = {
    username: document.getElementById('userUsername').value,
    name: document.getElementById('userName').value,
    email: document.getElementById('userEmail').value,
    role: document.getElementById('userRole').value
  };

  if (!userId) {
    userData.password = document.getElementById('userPassword').value;
    if (!userData.password) {
      alert('Password is required for new users');
      return;
    }
  }

  try {
    let response;
    if (userId) {
      response = await authFetch(`${API_BASE}/auth/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    } else {
      response = await authFetch(`${API_BASE}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    }

    if (response.ok) {
      closeUserModal();
      loadUsers();
      alert(userId ? 'User updated successfully!' : 'User added successfully!');
    } else {
      const error = await response.json();
      alert('Error: ' + (error.message || 'Failed to save user'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error saving user');
  }
}

// ==================== ACCOUNT ====================
function loadAccount() {
  document.getElementById('account-name').value = currentUser.name || '';
  document.getElementById('account-email').value = currentUser.email || '';
  document.getElementById('account-phone').value = currentUser.phone || '';
}

async function handleAccountSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('account-name').value;
  const phone = document.getElementById('account-phone').value;
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (currentPassword || newPassword || confirmPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await authFetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (response.ok) {
        alert('Password updated successfully!');
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
      } else {
        const error = await response.json();
        alert('Error: ' + (error.message || 'Failed to update password'));
        return;
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating password');
      return;
    }
  }

  try {
    const response = await authFetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });

    if (response.ok) {
      currentUser = await response.json();
      document.getElementById('user-name').textContent = currentUser.name || currentUser.username;
      alert('Profile updated successfully!');
    } else {
      const error = await response.json();
      alert('Error: ' + (error.message || 'Failed to update profile'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error updating profile');
  }
}

// ==================== SETTINGS ====================
async function loadSettings() {
  try {
    const [settingsRes, pagesRes] = await Promise.all([
      authFetch(`${API_BASE}/admin/settings`),
      authFetch(`${API_BASE}/admin/pages`)
    ]);
    const settings = await settingsRes.json();
    const pages = await pagesRes.json();
    populateSettingsForm(settings);
    displayCustomerPages(pages);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function seedDefaultPages() {
  if (!confirm('This will create default customer service pages (Shipping Info, FAQs, etc.) if they do not exist. Continue?')) return;
  try {
    const response = await authFetch(`${API_BASE}/admin/seed-pages`, { method: 'POST' });
    if (response.ok) {
      showToast('Default pages created!');
      loadSettings();
    } else {
      const err = await response.json();
      alert('Error: ' + (err.message || 'Failed to seed pages'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error seeding pages');
  }
}

// ==================== HELPERS ====================
function htmlToPlainText(html) {
  if (!html) return '';
  let text = html
    .replace(/<\/?(p|h[1-6]|li|div|tr|td|th|ul|ol|br|table)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  text = text.split('\n').map(l => l.trim()).join('\n');
  return text;
}

function plainTextToHtml(text) {
  if (!text) return '';
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    const lines = p.split('\n');
    return lines.length === 1 ? `<p>${lines[0]}</p>` : `<p>${lines.join('<br>')}</p>`;
  }).join('\n');
}

// ==================== CUSTOMER SERVICE ====================
async function loadCustomerService() {
  try {
    const pagesRes = await authFetch(`${API_BASE}/admin/pages`);
    const pages = await pagesRes.json();
    displayCustomerServicePages(pages);
  } catch (error) {
    console.error('Error loading customer service pages:', error);
  }
}

async function seedCustomerServicePages() {
  if (!confirm('This will create default customer service pages (Customer Service, Shipping Info, Returns & Exchanges, About Us, Contact) if they do not exist. Continue?')) return;
  try {
    const response = await authFetch(`${API_BASE}/admin/seed-pages`, { method: 'POST' });
    if (response.ok) {
      showToast('Default pages created!');
      loadCustomerService();
    } else {
      const err = await response.json();
      alert('Error: ' + (err.message || 'Failed to seed pages'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error seeding pages');
  }
}

function displayCustomerServicePages(pages) {
  const container = document.getElementById('customer-service-pages-list');
  if (!container) return;

  const serviceSlugs = ['customer-service', 'shipping-info', 'returns-exchanges', 'about-us', 'contact'];
  const servicePages = serviceSlugs.map(slug => pages.find(p => p.slug === slug)).filter(Boolean);

  if (servicePages.length === 0) {
    container.innerHTML = '<p style="color:#888;padding:20px;">No pages found. Click "Seed Default Pages" to create them.</p>';
    return;
  }

  let html = '';
  servicePages.forEach(page => {
    const safeId = 'cs-page-content-' + page.slug.replace(/-/g, '_');
    const plainContent = htmlToPlainText(page.content || '');
    html += `
      <div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:0 20px 12px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <strong style="font-size:16px;">${page.title}</strong>
            <span style="font-size:12px;color:#888;margin-left:10px;"><code>${page.slug}</code></span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="status ${page.published ? 'active' : 'out'}" style="font-size:11px;padding:2px 8px;">${page.published ? 'Published' : 'Draft'}</span>
            <a href="/page?slug=${page.slug}" target="_blank" class="btn-action btn-view" style="font-size:12px;padding:4px 10px;text-decoration:none;">
              <i class="fas fa-eye"></i>
            </a>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:8px;">
          <textarea id="${safeId}" rows="6" style="width:100%;font-size:13px;padding:10px;border:1px solid #ddd;border-radius:6px;resize:vertical;">${plainContent}</textarea>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="checkbox" id="${safeId}-published" ${page.published ? 'checked' : ''}> Published
          </label>
          <label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="checkbox" id="${safeId}-footer" ${page.showInFooter ? 'checked' : ''}> Show in Footer
          </label>
          <button class="btn-submit" onclick="saveCustomerPageContent('${page._id}', '${safeId}')" style="padding:6px 18px;font-size:13px;margin-left:auto;">
            <i class="fas fa-save"></i> Save
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function displayCustomerPages(pages) {
  const container = document.getElementById('customer-pages-list');
  if (!container) return;

  const customerSlugs = ['shipping-info', 'returns-exchanges', 'order-tracking', 'faqs', 'size-guide', 'about-us', 'contact'];
  const customerPages = customerSlugs.map(slug => pages.find(p => p.slug === slug)).filter(Boolean);

  if (customerPages.length === 0) {
    container.innerHTML = '<p style="color:#888;padding:20px;">No pages found. Run seed or create pages from the Pages section.</p>';
    return;
  }

  let html = '';
  customerPages.forEach(page => {
    const safeId = 'page-content-' + page.slug.replace(/-/g, '_');
    html += `
      <div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:0 20px 12px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <strong style="font-size:16px;">${page.title}</strong>
            <span style="font-size:12px;color:#888;margin-left:10px;"><code>${page.slug}</code></span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="status ${page.published ? 'active' : 'out'}" style="font-size:11px;padding:2px 8px;">${page.published ? 'Published' : 'Draft'}</span>
            <a href="/page?slug=${page.slug}" target="_blank" class="btn-action btn-view" style="font-size:12px;padding:4px 10px;text-decoration:none;">
              <i class="fas fa-eye"></i>
            </a>
            <button class="btn-action btn-delete" onclick="deletePage('${page._id}')" style="font-size:12px;padding:4px 10px;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:8px;">
          <textarea id="${safeId}" rows="6" style="width:100%;font-size:13px;padding:10px;border:1px solid #ddd;border-radius:6px;resize:vertical;">${htmlToPlainText(page.content || '')}</textarea>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="checkbox" id="${safeId}-published" ${page.published ? 'checked' : ''}> Published
          </label>
          <label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="checkbox" id="${safeId}-footer" ${page.showInFooter ? 'checked' : ''}> Show in Footer
          </label>
          <button class="btn-submit" onclick="saveCustomerPageContent('${page._id}', '${safeId}')" style="padding:6px 18px;font-size:13px;margin-left:auto;">
            <i class="fas fa-save"></i> Save
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function saveCustomerPageContent(pageId, safeId) {
  const content = plainTextToHtml(document.getElementById(safeId).value);
  const published = document.getElementById(safeId + '-published').checked;
  const showInFooter = document.getElementById(safeId + '-footer').checked;

  try {
    const response = await authFetch(`${API_BASE}/admin/pages/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, published, showInFooter })
    });

    if (response.ok) {
      showToast('Page saved successfully!');
    } else {
      const err = await response.json();
      alert('Error: ' + (err.message || 'Failed to save page'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error saving page');
  }
}

function populateSettingsForm(settings) {
  document.getElementById('storeName').value = settings.storeName || '';
  document.getElementById('storeEmail').value = settings.storeEmail || '';
  document.getElementById('storePhone').value = settings.storePhone || '';
  document.getElementById('storeAddress').value = settings.storeAddress || '';
  document.getElementById('currency').value = settings.currency || 'USD';
  document.getElementById('taxRate').value = settings.taxRate || 0;
  document.getElementById('shippingCost').value = settings.shippingCost || 0;
  document.getElementById('freeShippingThreshold').value = settings.freeShippingThreshold || 0;
  document.querySelectorAll('#freeCountriesList input[type=checkbox]').forEach(cb => {
    cb.checked = (settings.freeCountries || []).includes(cb.value);
  });
  document.getElementById('socialFacebook').value = settings.socialFacebook || '';
  document.getElementById('socialTwitter').value = settings.socialTwitter || '';
  document.getElementById('socialInstagram').value = settings.socialInstagram || '';
  document.getElementById('socialYoutube').value = settings.socialYoutube || '';
  document.getElementById('orderEmail').checked = settings.notifications?.orderEmail || false;
  document.getElementById('orderSMS').checked = settings.notifications?.orderSMS || false;
  document.getElementById('marketingEmail').checked = settings.notifications?.marketingEmail || false;
}

async function handleSettingsSubmit(e) {
  e.preventDefault();

  const settings = {
    storeName: document.getElementById('storeName').value,
    storeEmail: document.getElementById('storeEmail').value,
    storePhone: document.getElementById('storePhone').value,
    storeAddress: document.getElementById('storeAddress').value,
    currency: document.getElementById('currency').value,
    taxRate: parseFloat(document.getElementById('taxRate').value),
    shippingCost: parseFloat(document.getElementById('shippingCost').value),
    freeShippingThreshold: parseFloat(document.getElementById('freeShippingThreshold').value),
    freeCountries: Array.from(document.querySelectorAll('#freeCountriesList input[type=checkbox]:checked')).map(cb => cb.value),
    socialFacebook: document.getElementById('socialFacebook').value,
    socialTwitter: document.getElementById('socialTwitter').value,
    socialInstagram: document.getElementById('socialInstagram').value,
    socialYoutube: document.getElementById('socialYoutube').value,
    notifications: {
      orderEmail: document.getElementById('orderEmail').checked,
      orderSMS: document.getElementById('orderSMS').checked,
      marketingEmail: document.getElementById('marketingEmail').checked
    }
  };

  try {
    const response = await authFetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    if (response.ok) {
      alert('Settings saved successfully!');
    } else {
      alert('Error saving settings');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error saving settings');
  }
}

// ==================== PAGES ====================
async function loadPages() {
  try {
    const response = await authFetch(`${API_BASE}/admin/pages`);
    const pages = await response.json();
    displayPagesTable(pages);
  } catch (error) {
    console.error('Error loading pages:', error);
  }
}

function displayPagesTable(pages) {
  const table = document.getElementById('pages-table');
  if (!table) return;

  table.innerHTML = '';

  pages.forEach(page => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${page.title}</strong></td>
      <td><code>${page.slug}</code></td>
      <td><span class="status ${page.published ? 'active' : 'out'}">${page.published ? 'Published' : 'Draft'}</span></td>
      <td>${page.showInFooter ? '<span style="color:#198754;">Footer</span>' : '-'}</td>
      <td>${new Date(page.updatedAt || page.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn-action btn-view" onclick="previewPage('${page.slug}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-action btn-edit" onclick="editPage('${page._id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-action btn-delete" onclick="deletePage('${page._id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    table.appendChild(row);
  });
}

function previewPage(slug) {
  window.open(`/page?slug=${slug}`, '_blank');
}

function autoSlug(value) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  document.getElementById('pageSlug').value = slug;
  document.getElementById('page-slug-preview').textContent = slug;
}

function openPageModal(page = null) {
  const modal = document.getElementById('pageModal');
  const title = document.getElementById('page-modal-title');
  const submitBtn = document.getElementById('page-submit-btn');
  const form = document.getElementById('pageForm');

  form.reset();
  document.getElementById('pageId').value = '';

  if (page) {
    title.textContent = 'Edit Page';
    submitBtn.textContent = 'Update Page';
    document.getElementById('pageId').value = page._id;
    document.getElementById('pageTitle').value = page.title;
    document.getElementById('pageSlug').value = page.slug;
    document.getElementById('page-slug-preview').textContent = page.slug;
    document.getElementById('pageMetaDescription').value = page.metaDescription || '';
    document.getElementById('pageContent').value = page.content || '';
    document.getElementById('pagePublished').checked = page.published !== false;
    document.getElementById('pageShowInFooter').checked = page.showInFooter || false;
    document.getElementById('pageFooterColumn').value = page.footerColumn || 'customer-service';
  } else {
    title.textContent = 'Add New Page';
    submitBtn.textContent = 'Add Page';
    document.getElementById('pagePublished').checked = true;
    document.getElementById('pageShowInFooter').checked = false;
  }

  modal.style.display = 'flex';
}

function closePageModal() {
  document.getElementById('pageModal').style.display = 'none';
  document.getElementById('pageForm').reset();
  document.getElementById('pageId').value = '';
}

async function handlePageSubmit(e) {
  e.preventDefault();

  const pageId = document.getElementById('pageId').value;
  const pageData = {
    title: document.getElementById('pageTitle').value,
    slug: document.getElementById('pageSlug').value,
    metaDescription: document.getElementById('pageMetaDescription').value,
    content: document.getElementById('pageContent').value,
    published: document.getElementById('pagePublished').checked,
    showInFooter: document.getElementById('pageShowInFooter').checked,
    footerColumn: document.getElementById('pageFooterColumn').value
  };

  try {
    let response;
    if (pageId) {
      response = await authFetch(`${API_BASE}/admin/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData)
      });
    } else {
      response = await authFetch(`${API_BASE}/admin/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData)
      });
    }

    if (response.ok) {
      closePageModal();
      loadPages();
      alert(pageId ? 'Page updated successfully!' : 'Page added successfully!');
    } else {
      const error = await response.json();
      alert('Error: ' + (error.message || 'Failed to save page'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error saving page');
  }
}

async function editPage(pageId) {
  try {
    const response = await authFetch(`${API_BASE}/admin/pages`);
    const pages = await response.json();
    const page = pages.find(p => p._id === pageId);
    if (page) openPageModal(page);
  } catch (error) {
    console.error('Error:', error);
    alert('Error loading page');
  }
}

async function deletePage(pageId) {
  if (!confirm('Are you sure you want to delete this page?')) return;

  try {
    const response = await authFetch(`${API_BASE}/admin/pages/${pageId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      loadPages();
      alert('Page deleted successfully!');
    } else {
      alert('Error deleting page');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error deleting page');
  }
}

// Close modals when clicking outside
window.onclick = function (event) {
  const productModal = document.getElementById('productModal');
  const orderModal = document.getElementById('orderModal');
  const userModal = document.getElementById('userModal');
  const pageModal = document.getElementById('pageModal');
  if (event.target === productModal) closeModal();
  if (event.target === orderModal) closeOrderModal();
  if (event.target === userModal) closeUserModal();
  if (event.target === pageModal) closePageModal();
};

const API_BASE = 'http://localhost:5000/api';
let currentUser = null;
let authToken = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', function () {
  checkAuth();

  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('settings-form')?.addEventListener('submit', handleSettingsSubmit);
  document.getElementById('account-form')?.addEventListener('submit', handleAccountSubmit);
  document.getElementById('userForm')?.addEventListener('submit', handleUserSubmit);
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
    accessories: ['accessory', 'accessories', 'jewelry', 'jewellery', 'watch', 'sunglasses', 'bag', 'purse', 'wallet', 'belt', 'hat', 'cap', 'scarf', 'ring', 'necklace', 'earring', 'bracelet', 'chain', 'pendant', 'brooch', 'hair accessory']
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
    const response = await authFetch(`${API_BASE}/products/${productId}`);
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
          ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </td>
      <td>
        <button class="btn-action btn-view" onclick="viewOrder('${order._id}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-action btn-edit" onclick="updateOrderStatus('${order._id}')">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    `;
    table.appendChild(row);
  });
}

async function viewOrder(orderId) {
  try {
    const response = await authFetch(`${API_BASE}/orders/${orderId}`);
    const order = await response.json();

    const detailsHtml = `
      <div class="order-info">
        <p><strong>Order ID:</strong> ${order.orderId || order._id}</p>
        <p><strong>Customer:</strong> ${order.customer?.name || 'Unknown'}</p>
        <p><strong>Email:</strong> ${order.customer?.email || '-'}</p>
        <p><strong>Phone:</strong> ${order.customer?.phone || '-'}</p>
        <p><strong>Address:</strong> ${order.customer?.address || '-'}</p>
        <p><strong>Total:</strong> $${order.totalAmount?.toFixed(2)}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Payment:</strong> ${order.paymentMethod || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(order.orderDate).toLocaleString()}</p>
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
  const newStatus = prompt('Enter new status:\npending, processing, shipped, delivered, cancelled');
  if (newStatus && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(newStatus.toLowerCase())) {
    try {
      const response = await authFetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus.toLowerCase() })
      });

      if (response.ok) {
        loadOrders();
        loadDashboard();
        alert('Order status updated successfully!');
      } else {
        const err = await response.json();
        alert('Error: ' + (err.message || 'Failed to update status'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating order status');
    }
  } else if (newStatus) {
    alert('Invalid status');
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
      <td>
        <button class="btn-action btn-view" onclick="viewCustomerOrders('${customer.email}')">
          <i class="fas fa-history"></i>
        </button>
      </td>
    `;
    table.appendChild(row);
  });
}

function viewCustomerOrders(email) {
  alert(`Order history for: ${email}`);
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
      pending: '#ffc107', processing: '#0dcaf0', shipped: '#6f42c1', delivered: '#198754', cancelled: '#dc3545'
    };

    statusGrid.innerHTML = Object.entries(data.statusCounts || {}).map(([status, count]) => `
      <div class="status-card" style="border-left: 4px solid ${statusColors[status]}">
        <h4>${status.charAt(0).toUpperCase() + status.slice(1)}</h4>
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
    const response = await authFetch(`${API_BASE}/admin/settings`);
    const settings = await response.json();
    populateSettingsForm(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
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

// Close modals when clicking outside
window.onclick = function (event) {
  const productModal = document.getElementById('productModal');
  const orderModal = document.getElementById('orderModal');
  const userModal = document.getElementById('userModal');
  if (event.target === productModal) closeModal();
  if (event.target === orderModal) closeOrderModal();
  if (event.target === userModal) closeUserModal();
};

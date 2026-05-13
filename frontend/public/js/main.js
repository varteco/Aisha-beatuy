const API_BASE = '/api';
let currentUser = null;
let authToken = localStorage.getItem('customerToken');
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas fa-check"></i></div>
      <div class="toast-message"></div>
    `;
    document.body.appendChild(toast);
  }
  toast.querySelector('.toast-message').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

  document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    loadProducts();
    loadFlashSaleProducts();
    updateCartCount();
  });

  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart')) {
      const btn = e.target;
      const card = btn.closest('.product-card, .sale-product-card');
      let size = null;
      if (card) {
        const selectedSizeBtn = card.querySelector('.size-btn.selected');
        if (card.querySelector('.size-btn') && !selectedSizeBtn) {
          showToast('Please select a size');
          return;
        }
        if (selectedSizeBtn) size = selectedSizeBtn.dataset.size;
      }
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const image = btn.dataset.image;
      addToCart(id, name, price, image, size);
    }
  });

function checkAuth() {
  if (authToken) {
    try {
      const storedUser = localStorage.getItem('customerUser');
      if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showLoggedInState();
      }
    } catch (e) {
      console.error('Auth error:', e);
    }
  }
}

function showLoggedInState() {
  const userIcon = document.getElementById('user-icon');
  const userMenu = document.getElementById('user-menu');
  if (userIcon) userIcon.style.display = 'none';
  if (userMenu) userMenu.style.display = 'inline-block';
  
  const userIconTop = document.getElementById('user-icon-top');
  const userMenuTop = document.getElementById('user-menu-top');
  const userNameTop = document.getElementById('user-name-top');
  if (userIconTop) userIconTop.style.display = 'none';
  if (userMenuTop) {
    userMenuTop.style.display = 'inline-block';
    if (userNameTop) userNameTop.textContent = currentUser.name || currentUser.email;
  }

  const navOrders = document.getElementById('nav-orders');
  if (navOrders) navOrders.style.display = 'inline-block';
}

function showLoggedOutState() {
  const userIcon = document.getElementById('user-icon');
  const userMenu = document.getElementById('user-menu');
  if (userIcon) userIcon.style.display = 'inline-block';
  if (userMenu) userMenu.style.display = 'none';
  
  const userIconTop = document.getElementById('user-icon-top');
  const userMenuTop = document.getElementById('user-menu-top');
  if (userIconTop) userIconTop.style.display = 'flex';
  if (userMenuTop) userMenuTop.style.display = 'none';

  const navOrders = document.getElementById('nav-orders');
  if (navOrders) navOrders.style.display = 'none';
}

// ==================== AUTH ====================
function openAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (!authModal) return;
  authModal.classList.add('show');
  showLogin();
}

function showLogin() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');

  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue('--primary').trim();
  const black = styles.getPropertyValue('--black').trim();

  if (loginForm) loginForm.classList.remove('hidden');
  if (registerForm) registerForm.classList.add('hidden');
  
  if (loginTab) {
    loginTab.classList.remove('inactive');
    loginTab.style.backgroundColor = primary;
    loginTab.style.color = black;
  }
  if (registerTab) {
    registerTab.classList.add('inactive');
    registerTab.style.backgroundColor = black;
    registerTab.style.color = primary;
  }
}

function showRegister() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');

  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue('--primary').trim();
  const black = styles.getPropertyValue('--black').trim();

  if (registerForm) registerForm.classList.remove('hidden');
  if (loginForm) loginForm.classList.add('hidden');

  if (registerTab) {
    registerTab.classList.remove('inactive');
    registerTab.style.backgroundColor = primary;
    registerTab.style.color = black;
  }
  if (loginTab) {
    loginTab.classList.add('inactive');
    loginTab.style.backgroundColor = black;
    loginTab.style.color = primary;
  }
}

function closeAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (!authModal) return;
  authModal.classList.remove('show');
}

function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    alert('Please fill in all fields');
    return;
  }

  fetch(`${API_BASE}/auth/customer-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('customerToken', authToken);
      localStorage.setItem('customerUser', JSON.stringify(currentUser));
      closeAuthModal();
      showLoggedInState();
      window.location.href = '/orders';
    } else {
      alert(data.message || 'Login failed');
    }
  })
  .catch(err => {
    alert('Connection error. Please try again.');
  });
}

function handleSignup() {
  const email = document.getElementById('signup-email').value;
  const name = document.getElementById('signup-name').value;
  const phone = document.getElementById('signup-phone').value;
  const password = document.getElementById('signup-password').value;
  
  if (!email || !name || !phone || !password) {
    alert('Please fill in all fields');
    return;
  }

  fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, phone, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('customerToken', authToken);
      localStorage.setItem('customerUser', JSON.stringify(currentUser));
      closeAuthModal();
      showLoggedInState();
      alert('Account created successfully!');
    } else {
      alert(data.message || 'Registration failed');
    }
  })
  .catch(err => {
    alert('Connection error. Please try again.');
  });
}

function showForgotPassword() {
  closeAuthModal();
  const modal = document.getElementById('forgot-password-modal');
  if (modal) {
    modal.classList.add('show');
    document.getElementById('forgot-form').style.display = 'block';
    document.getElementById('forgot-success').style.display = 'none';
    document.getElementById('forgot-email').value = '';
  }
}

function closeForgotPassword() {
  const modal = document.getElementById('forgot-password-modal');
  if (modal) modal.classList.remove('show');
  const successEl = document.getElementById('forgot-success');
  const formEl = document.getElementById('forgot-form');
  if (successEl) successEl.style.display = 'none';
  if (formEl) formEl.style.display = 'block';
}

function handleForgotPassword() {
  const email = document.getElementById('forgot-email').value;
  const btn = document.getElementById('forgot-btn');
  
  if (!email) {
    alert('Please enter your email');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      document.getElementById('forgot-form').style.display = 'none';
      document.getElementById('forgot-success').style.display = 'block';
    } else {
      alert(data.message || 'Failed to send reset link');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
    }
  })
  .catch(err => {
    alert('Connection error. Please try again.');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
  });
}

function logout() {
  localStorage.removeItem('customerToken');
  localStorage.removeItem('customerUser');
  authToken = null;
  currentUser = null;
  showLoggedOutState();
}

function viewOrders() {
  if (!currentUser) {
    window.location.href = 'cart-login.html';
    return;
  }
  window.location.href = '/admin.html';
}

// ==================== PRODUCTS ====================
let allHomeProducts = [];

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    const products = await response.json();
    allHomeProducts = products;
    displayProducts(products);
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function homeFilterByCategory(category, btn) {
  document.querySelectorAll('.home-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyHomeFilters();
}

function homeSearchProducts() {
  applyHomeFilters();
}

function applyHomeFilters() {
  const searchInput = document.getElementById('home-search-input');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const activeBtn = document.querySelector('.home-filter-btn.active');
  const category = activeBtn ? activeBtn.dataset.category : 'all';

  let filtered = allHomeProducts;
  if (category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }
  if (searchTerm) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
  }
  displayProducts(filtered);
}

async function loadFlashSaleProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    const products = await response.json();
    const saleProducts = products.filter(p => p.onSale === true && p.discount > 0);
    displayFlashSaleProducts(saleProducts);
  } catch (error) {
    console.error('Error loading flash sale products:', error);
  }
}

function displayFlashSaleProducts(products) {
  const container = document.getElementById('flash-sale-container');
  if (!container) return;

  container.innerHTML = '';

  if (products.length === 0) {
    const flashSection = document.querySelector('.flash-sale');
    if (flashSection) flashSection.style.display = 'none';
    return;
  }

  products.forEach(product => {
    const discount = product.discount || 0;
    const originalPrice = product.price;
    const salePrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;

    const card = document.createElement('div');
    card.className = 'product-card sale-product-card';
    const imgUrl = product.images && product.images[0] ? product.images[0] : 'images/1.jpg';
    const hasSizes = product.sizes && product.sizes.length > 0;
    const sizesHtml = hasSizes
      ? `<div class="product-sizes">${product.sizes.map(s => `<button type="button" class="size-btn" data-size="${s}" onclick="selectSize(this)">${s}</button>`).join('')}</div>`
      : '';
    card.innerHTML = `
      <img src="${imgUrl}" alt="${product.name}" class="product-img">
      <div class="sale-badge">-${discount}%</div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.description || ''}</p>
        <div class="price-container">
          <span class="original-price">$${originalPrice.toFixed(2)}</span>
          <span class="sale-price">$${salePrice.toFixed(2)}</span>
        </div>
        ${sizesHtml}
        <button class="btn add-to-cart" data-id="${product._id}" data-name="${product.name}" data-price="${salePrice}" data-image="${imgUrl}">
          ${t('addToCart')}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function displayProducts(products) {
  const container = document.getElementById('products-container');
  if (!container) return;

  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = '<div class="no-products-msg">No products found</div>';
    return;
  }

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    let stockStatus, stockClass;
    if (product.stock > 5) {
      stockStatus = `${product.stock} ${t('inStock')}`;
      stockClass = 'in-stock';
    } else if (product.stock > 0) {
      stockStatus = `${product.stock} ${t('lowStock')}`;
      stockClass = 'low-stock';
    } else {
      stockStatus = t('outOfStock');
      stockClass = 'out-of-stock';
    }
    const imgUrl = product.images && product.images[0] ? product.images[0] : 'images/1.jpg';

    if (product.onSale && product.discount > 0) {
      const discount = product.discount || 0;
      const originalPrice = product.price;
      const salePrice = originalPrice * (1 - discount / 100);
      card.className = 'product-card sale-product-card';
      const hasSizes = product.sizes && product.sizes.length > 0;
      const sizesHtml = hasSizes
        ? `<div class="product-sizes">${product.sizes.map(s => `<button type="button" class="size-btn" data-size="${s}" onclick="selectSize(this)">${s}</button>`).join('')}</div>`
        : '';
      card.innerHTML = `
        <img src="${imgUrl}" alt="${product.name}" class="product-img">
        <div class="sale-badge">-${discount}%</div>
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.description || ''}</p>
          <div class="price-container">
            <span class="original-price">$${originalPrice.toFixed(2)}</span>
            <span class="sale-price">$${salePrice.toFixed(2)}</span>
          </div>
          ${sizesHtml}
          <p class="stock-info ${stockClass}">${stockStatus}</p>
          <button class="btn add-to-cart" data-id="${product._id}" data-name="${product.name}" data-price="${salePrice}" data-image="${imgUrl}">
            ${t('addToCart')}
          </button>
        </div>
      `;
    } else {
      const hasSizes = product.sizes && product.sizes.length > 0;
      const sizesHtml = hasSizes
        ? `<div class="product-sizes">${product.sizes.map(s => `<button type="button" class="size-btn" data-size="${s}" onclick="selectSize(this)">${s}</button>`).join('')}</div>`
        : '';
      card.innerHTML = `
        <img src="${imgUrl}" alt="${product.name}" class="product-img">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.description || ''}</p>
          <div class="price">$${product.price.toFixed(2)}</div>
          ${sizesHtml}
          <p class="stock-info ${stockClass}">${stockStatus}</p>
          <button class="btn add-to-cart" data-id="${product._id}" data-name="${product.name}" data-price="${product.price}" data-image="${imgUrl}">
            ${t('addToCart')}
          </button>
        </div>
      `;
    }
    container.appendChild(card);
  });
}

function selectSize(btn) {
  const parent = btn.parentElement;
  if (parent) {
    parent.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  }
  btn.classList.add('selected');
}

// ==================== CART ====================
function openCart() {
  document.getElementById('cart-modal').classList.add('show');
  displayCart();
}

function closeCart() {
  document.getElementById('cart-modal').classList.remove('show');
}

function addToCart(id, name, price, image, size) {
  const key = size ? id + '_' + size : id;
  const existingItem = cart.find(item => item.id === key);
  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({ id: key, name: name + (size ? ' (' + size + ')' : ''), price, image: image || 'images/1.jpg', qty: 1, size, productId: id });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  showToast('Item Added To Cart Successfully');
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById('cart-count');
  const mobileCartCountEl = document.getElementById('mobile-cart-count');
  if (cartCountEl) cartCountEl.textContent = count;
  if (mobileCartCountEl) mobileCartCountEl.textContent = count;
}

function displayCart() {
  const container = document.getElementById('cart-items');
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = '<p>Your cart is empty</p>';
    document.getElementById('cart-total').textContent = '0.00';
    return;
  }
  
  let subtotal = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}${item.size ? ` <span class="cart-item-size">(${item.size})</span>` : ''}</h4>
          <p>$${item.price.toFixed(2)}</p>
          <div class="cart-item-qty">
            <button onclick="changeQty('${item.id}', -1)">-</button>
            <span>${item.qty}</span>
            <button onclick="changeQty('${item.id}', 1)">+</button>
          </div>
        </div>
        <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">&times;</button>
      </div>
    `;
  }).join('');
  
  // Fetch settings for tax/shipping display
  fetch(`${API_BASE}/settings/public`)
    .then(r => r.json())
    .then(s => {
      const taxRate = parseFloat(s.taxRate) || 0;
      const shippingCost = parseFloat(s.shippingCost) || 0;
      const freeThreshold = parseFloat(s.freeShippingThreshold) || 0;
      const userCountry = localStorage.getItem('aisha_country') || 'SD';
      const isFreeCountry = (s.freeCountries || []).includes(userCountry);
      const tax = subtotal * (taxRate / 100);
      const shipping = (subtotal >= freeThreshold && freeThreshold > 0) || isFreeCountry ? 0 : shippingCost;
      const total = subtotal + tax + shipping;
      
      const totalEl = document.getElementById('cart-total');
      if (totalEl) {
        let breakdown = `$${subtotal.toFixed(2)}`;
        if (tax > 0) breakdown += ` + tax $${tax.toFixed(2)}`;
        if (shipping > 0) breakdown += ` + shipping $${shipping.toFixed(2)}`;
        breakdown += ` = $${total.toFixed(2)}`;
        totalEl.textContent = breakdown;
      }
    })
    .catch(() => {
      document.getElementById('cart-total').textContent = '$' + subtotal.toFixed(2);
    });
}

function changeQty(id, delta) {
  const item = cart.find(item => item.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) {
      removeFromCart(id);
    } else {
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      displayCart();
    }
  }
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  displayCart();
}

async function checkout() {
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  const token = localStorage.getItem('customerToken');
  if (!token) {
    alert('Please login to checkout');
    window.location.href = '/cart-login.html';
    return;
  }
  
  closeCart();
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  // Fetch store settings for tax & shipping
  let taxRate = 0, shippingCost = 0, freeShippingThreshold = 0;
  let freeCountries = [];
  try {
    const res = await fetch(`${API_BASE}/settings/public`);
    const s = await res.json();
    taxRate = parseFloat(s.taxRate) || 0;
    shippingCost = parseFloat(s.shippingCost) || 0;
    freeShippingThreshold = parseFloat(s.freeShippingThreshold) || 0;
    freeCountries = s.freeCountries || [];
  } catch (e) {}
  
  const userCountry = localStorage.getItem('aisha_country') || 'SD';
  const isFreeCountry = freeCountries.includes(userCountry);
  const tax = subtotal * (taxRate / 100);
  const shipping = (subtotal >= freeShippingThreshold && freeShippingThreshold > 0) || isFreeCountry ? 0 : shippingCost;
  const total = subtotal + tax + shipping;
  
  const orderData = {
    items: cart.map(item => ({
      productId: item.productId || item.id,
      name: item.name,
      price: item.price,
      quantity: item.qty,
      image: item.image,
      size: item.size || ''
    })),
    subtotal,
    tax,
    shipping,
    total
  };
  
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });
    
    if (response.ok) {
      cart = [];
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      alert('Order placed successfully! You can view it in your account.');
      window.location.href = '/profile.html';
    } else {
      alert('Failed to place order. Please try again.');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Connection error. Please try again.');
  }
}

function viewCartProducts() {
  window.location.href = '/cart.html';
}

function goToCheckout() {
  const authToken = localStorage.getItem('customerToken');
  if (!authToken) {
    window.location.href = '/cart-login.html';
  } else {
    checkout();
  }
}

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('show');
  }
};

// Search functionality
function performSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput && searchInput.value.trim()) {
    window.location.href = `/shop.html?search=${encodeURIComponent(searchInput.value.trim())}`;
  } else {
    window.location.href = '/shop.html';
  }
}

// Allow search on Enter key
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }
});

// Newsletter subscription
function subscribeNewsletter(e) {
  e.preventDefault();
  const email = e.target.querySelector('input[type="email"]').value;
  if (email) {
    alert('Thank you for subscribing!');
    e.target.reset();
  }
}

// Mobile menu toggle
function toggleMobileMenu() {
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) {
    mobileNav.classList.toggle('active');
  }
}

// Load footer from settings
function loadFooter() {
  const storeNameEl = document.getElementById('footer-store-name');
  const taglineEl = document.getElementById('footer-tagline');
  const socialContainer = document.getElementById('footer-social');
  const addressEl = document.getElementById('footer-address');
  const phoneEl = document.getElementById('footer-phone');
  const emailEl = document.getElementById('footer-email');
  const yearEl = document.getElementById('footer-year');
  const companyEl = document.getElementById('footer-company');

  if (!storeNameEl && !addressEl) return;

  fetch(`${API_BASE}/settings/public`)
    .then(r => r.json())
    .then(s => {
      if (storeNameEl) storeNameEl.textContent = s.storeName || 'Aisha Beauty';
      if (taglineEl) taglineEl.textContent = 'Your trusted destination for premium fashion and lifestyle products.';
      if (companyEl) companyEl.textContent = s.storeName || 'Aisha Beauty';
      if (yearEl) yearEl.textContent = new Date().getFullYear();
      if (addressEl) addressEl.textContent = s.storeAddress || '';
      if (phoneEl) phoneEl.textContent = s.storePhone || '';
      if (emailEl) emailEl.textContent = s.storeEmail || '';

      if (socialContainer) {
        const platforms = [
          { key: 'socialFacebook', icon: 'fab fa-facebook-f' },
          { key: 'socialTwitter', icon: 'fab fa-twitter' },
          { key: 'socialInstagram', icon: 'fab fa-instagram' },
          { key: 'socialYoutube', icon: 'fab fa-youtube' }
        ];
        const links = platforms
          .filter(p => s[p.key])
          .map(p => `<a href="${s[p.key]}" target="_blank" rel="noopener"><i class="${p.icon}"></i></a>`)
          .join('');
        if (links) {
          socialContainer.innerHTML = links;
        } else {
          socialContainer.innerHTML = `
            <a href="#"><i class="fab fa-facebook-f"></i></a>
            <a href="#"><i class="fab fa-twitter"></i></a>
            <a href="#"><i class="fab fa-instagram"></i></a>
            <a href="#"><i class="fab fa-youtube"></i></a>
          `;
        }
      }
    })
    .catch(() => {});
}

// Load footer pages from CMS
function loadFooterPages() {
  const footerPagesList = document.getElementById('footer-pages-list');
  if (!footerPagesList) return;

  fetch(`${API_BASE}/pages`)
    .then(r => r.json())
    .then(pages => {
      const footerPages = pages.filter(p => p.showInFooter);
      if (footerPages.length === 0) {
        const defaults = [
          { title: 'Shipping Info', slug: 'shipping-info' },
          { title: 'Returns & Exchanges', slug: 'returns-exchanges' },
          { title: 'About Us', slug: 'about-us' },
          { title: 'Contact', slug: 'contact' }
        ];
        footerPagesList.innerHTML = defaults.map(p =>
          `<li><a href="/page?slug=${p.slug}">${p.title}</a></li>`
        ).join('');
      } else {
        footerPagesList.innerHTML = footerPages.map(p =>
          `<li><a href="/page?slug=${p.slug}">${p.title}</a></li>`
        ).join('');
      }
    })
    .catch(() => {});
}

// Run on every page
document.addEventListener('DOMContentLoaded', function() {
  loadFooter();
  loadFooterPages();
});

// Run on every page
document.addEventListener('DOMContentLoaded', loadFooter);

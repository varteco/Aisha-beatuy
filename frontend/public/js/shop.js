const API_BASE = 'http://localhost:5000/api';
let currentUser = null;
let authToken = localStorage.getItem('customerToken');
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentCategory = 'all';
let currentSearch = '';
let currentMinPrice = 0;
let currentMaxPrice = 0;
let inStockOnly = false;

document.addEventListener('DOMContentLoaded', function () {
  checkAuth();
  loadProducts();
  updateCartCount();
  setupSearch();
  checkUrlParams();
  highlightActiveCategory();
  
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart')) {
      const btn = e.target;
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const image = btn.dataset.image;
      addToCart(id, name, price, image);
    }
  });
});

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const search = params.get('search');
  
  if (category) {
    currentCategory = category;
    updateBreadcrumb(category);
  }
  
  if (search) {
    currentSearch = search;
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = search;
  }
}

function updateBreadcrumb(category) {
  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  const categoryTitle = document.getElementById('category-title');
  
  const categoryNames = {
    men: "Men's Fashion",
    women: "Women's Fashion",
    kids: 'Kids Fashion',
    accessories: 'Accessories'
  };
  
  if (category && category !== 'all') {
    const name = categoryNames[category] || category;
    if (breadcrumbTitle) breadcrumbTitle.textContent = name;
    if (categoryTitle) categoryTitle.textContent = name;
  } else {
    if (breadcrumbTitle) breadcrumbTitle.textContent = 'Shop';
    if (categoryTitle) categoryTitle.textContent = 'All Products';
  }
}

function highlightActiveCategory() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category') || 'all';
  
  document.querySelectorAll('.filter-link').forEach(link => {
    if (link.dataset.category === category) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function setupSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }
}

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
  const userIconTop = document.getElementById('user-icon-top');
  const userMenuTop = document.getElementById('user-menu-top');
  const userNameTop = document.getElementById('user-name-top');
  
  if (userIcon) userIcon.style.display = 'none';
  if (userMenu) userMenu.style.display = 'inline-block';
  if (userIconTop) userIconTop.style.display = 'none';
  if (userMenuTop) {
    userMenuTop.style.display = 'inline-block';
    if (userNameTop) userNameTop.textContent = currentUser.name || currentUser.email;
  }
}

function showLoggedOutState() {
  const userIcon = document.getElementById('user-icon');
  const userMenu = document.getElementById('user-menu');
  const userIconTop = document.getElementById('user-icon-top');
  const userMenuTop = document.getElementById('user-menu-top');
  
  if (userIcon) userIcon.style.display = 'inline-block';
  if (userMenu) userMenu.style.display = 'none';
  if (userIconTop) userIconTop.style.display = 'flex';
  if (userMenuTop) userMenuTop.style.display = 'none';
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    allProducts = await response.json();
    applyFilters();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function applyFilters() {
  let products = [...allProducts];
  
  // Category filter - handle both 'men' and 'Men's Fashion' formats
  if (currentCategory && currentCategory !== 'all') {
    const categoryMap = {
      men: ['men', "men's fashion", "men's", 'male'],
      women: ['women', "women's fashion", "women's", 'female'],
      kids: ['kids', "kids fashion", 'children', 'child'],
      accessories: ['accessories', 'accessory', 'jewelry', 'jewellery']
    };
    
    const validCategories = categoryMap[currentCategory] || [currentCategory];
    products = products.filter(p => {
      if (!p.category) return false;
      const productCategory = p.category.toLowerCase();
      return validCategories.some(cat => productCategory.includes(cat.toLowerCase()));
    });
  }
  
  // Search filter - name only
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchLower)
    );
  }
  
  // Price filter
  if (currentMinPrice > 0) {
    products = products.filter(p => p.price >= currentMinPrice);
  }
  if (currentMaxPrice > 0) {
    products = products.filter(p => p.price <= currentMaxPrice);
  }
  
  // Stock filter
  if (inStockOnly) {
    products = products.filter(p => p.stock > 0);
  }
  
  // Sort
  const sortSelect = document.getElementById('sort-select');
  const sortBy = sortSelect ? sortSelect.value : 'featured';
  
  if (sortBy === 'price-low') {
    products.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortBy === 'price-high') {
    products.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortBy === 'newest') {
    products.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  } else {
    products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }
  
  displayProducts(products);
  updateResultsCount(products.length);
}

function displayProducts(products) {
  const container = document.getElementById('products-container');
  const noProducts = document.getElementById('no-products');
  if (!container) return;

  container.innerHTML = '';

  if (products.length === 0) {
    container.style.display = 'none';
    if (noProducts) noProducts.style.display = 'block';
    return;
  }

  container.style.display = 'grid';
  if (noProducts) noProducts.style.display = 'none';

  products.forEach(product => {
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
    
    const card = document.createElement('div');
    card.className = 'product-card';
    const imgUrl = product.images && product.images[0] ? product.images[0] : 'images/1.jpg';

    if (product.onSale && product.discount > 0) {
      const discount = product.discount || 0;
      const originalPrice = product.price;
      const salePrice = originalPrice * (1 - discount / 100);
      card.className = 'product-card sale-product-card';
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
          <p class="stock-info ${stockClass}">${stockStatus}</p>
          <button class="add-to-cart" data-id="${product._id}" data-name="${product.name}" data-price="${salePrice}" data-image="${imgUrl}">
            ${t('addToCart')}
          </button>
        </div>
      `;
    } else {
      card.innerHTML = `
        <img src="${imgUrl}" alt="${product.name}" class="product-img">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.description || ''}</p>
          <div class="price">$${product.price.toFixed(2)}</div>
          <p class="stock-info ${stockClass}">${stockStatus}</p>
          <button class="add-to-cart" data-id="${product._id}" data-name="${product.name}" data-price="${product.price}" data-image="${imgUrl}">
            ${t('addToCart')}
          </button>
        </div>
      `;
    }
    container.appendChild(card);
  });
}

function updateResultsCount(count) {
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    const categoryText = currentCategory && currentCategory !== 'all' ? ` in ${currentCategory}` : '';
    resultsCount.textContent = `Showing ${count} product${count !== 1 ? 's' : ''}${categoryText}`;
  }
}

function filterByPrice() {
  const minInput = document.getElementById('min-price');
  const maxInput = document.getElementById('max-price');
  currentMinPrice = minInput ? parseFloat(minInput.value) || 0 : 0;
  currentMaxPrice = maxInput ? parseFloat(maxInput.value) || 0 : 0;
  applyFilters();
}

function filterByStock() {
  const checkbox = document.getElementById('in-stock-only');
  inStockOnly = checkbox ? checkbox.checked : false;
  applyFilters();
}

function sortProducts() {
  applyFilters();
}

function filterByCategory(category, event) {
  if (event) event.preventDefault();
  currentCategory = category;
  applyFilters();
  
  // Update active state
  document.querySelectorAll('.filter-link').forEach(link => {
    if (link.dataset.category === category) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function openCart() {
  document.getElementById('cart-modal').classList.add('show');
  displayCart();
}

function closeCart() {
  document.getElementById('cart-modal').classList.remove('show');
}

function addToCart(id, name, price, image) {
  const existingItem = cart.find(item => item.id === id);
  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({ id, name, price, image: image || 'images/1.jpg', qty: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  showToast('Item Added To Cart Successfully');
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) cartCountEl.textContent = count;
}

function displayCart() {
  const container = document.getElementById('cart-items');
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = '<p>Your cart is empty</p>';
    document.getElementById('cart-total').textContent = '0.00';
    return;
  }
  
  let total = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
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
  
  document.getElementById('cart-total').textContent = total.toFixed(2);
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


function checkout() {
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  closeCart();
  alert('Payment feature coming soon! Please contact us to complete your order.');
}

function viewCartProducts() {
  window.location.href = '/cart';
}

function goToCheckout() {
  const authToken = localStorage.getItem('customerToken');
  if (!authToken) {
    window.location.href = '/cart-login';
  } else {
    checkout();
  }
}

function subscribeNewsletter(e) {
  e.preventDefault();
  const email = e.target.querySelector('input[type="email"]').value;
  if (email) {
    alert('Thank you for subscribing!');
    e.target.reset();
  }
}

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('show');
  }
};

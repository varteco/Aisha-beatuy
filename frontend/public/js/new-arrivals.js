const API_BASE = '/api';
let currentUser = null;
let authToken = localStorage.getItem('customerToken');
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', function () {
  checkAuth();
  loadNewArrivals();
  updateCartCount();
  
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart')) {
      const btn = e.target;
      const card = btn.closest('.product-card, .sale-product-card');
      let size = null;
      if (card) {
        const selectedSizeBtn = card.querySelector('.size-btn.selected');
        if (card.querySelector('.size-btn') && !selectedSizeBtn) {
          alert('Please select a size');
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
  const userIconTop = document.getElementById('user-icon-top');
  const userMenuTop = document.getElementById('user-menu-top');
  const userNameTop = document.getElementById('user-name-top');
  if (userIconTop) userIconTop.style.display = 'none';
  if (userMenuTop) {
    userMenuTop.style.display = 'inline-block';
    if (userNameTop) userNameTop.textContent = currentUser.name || currentUser.email;
  }
}

function showLoggedOutState() {
  const userIconTop = document.getElementById('user-icon-top');
  const userMenuTop = document.getElementById('user-menu-top');
  if (userIconTop) userIconTop.style.display = 'flex';
  if (userMenuTop) userMenuTop.style.display = 'none';
}

async function loadNewArrivals() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    const products = await response.json();
    
    allProducts = products.filter(function(p) { return p.newArrival === true; });
    applyFilters();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function applyFilters() {
  let products = [...allProducts];
  
  // Category filter
  if (currentCategory && currentCategory !== 'all') {
    const categoryMap = {
      men: ['men', "men's fashion", "men's", 'male'],
      women: ['women', "women's fashion", "women's", 'female'],
      kids: ['kids', "kids fashion", 'children', 'child'],
      accessories: ['accessories', 'accessory', 'jewelry', 'jewellery'],
      perfumes: ['perfumes', 'perfume', 'fragrance', 'scent']
    };
    
    const validCategories = categoryMap[currentCategory] || [currentCategory];
    products = products.filter(p => {
      if (!p.category) return false;
      const productCategory = p.category.toLowerCase();
      return validCategories.some(cat => productCategory.includes(cat.toLowerCase()));
    });
  }
  
  // Sort by newest first
  const sortSelect = document.getElementById('sort-select');
  const sortBy = sortSelect ? sortSelect.value : 'newest';
  
  if (sortBy === 'price-low') {
    products.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortBy === 'price-high') {
    products.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else {
    products.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }
  
  displayProducts(products);
  updateResultsCount(products.length);
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

function sortProducts() {
  applyFilters();
}

function updateResultsCount(count) {
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    const categoryText = currentCategory && currentCategory !== 'all' ? ` in ${currentCategory}` : '';
    const sortSelect = document.getElementById('sort-select');
    const sortLabels = { newest: 'Newest', featured: 'Featured', 'price-low': 'Price Low-High', 'price-high': 'Price High-Low' };
    const sortLabel = sortSelect && sortSelect.value ? sortLabels[sortSelect.value] || '' : '';
    const sortText = sortLabel ? ` sorted by ${sortLabel}` : '';
    resultsCount.textContent = `Showing ${count} product${count !== 1 ? 's' : ''}${categoryText}${sortText}`;
  }
}

function productCardHtml(product) {
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
  const hasSizes = product.sizes && product.sizes.length > 0;
  var priceHtml = '';
  if (product.onSale && product.discount > 0) {
    var salePrice = product.price * (1 - product.discount / 100);
    priceHtml = '<div class="price-container"><span class="original-price">$' + product.price.toFixed(2) + '</span><span class="sale-price">$' + salePrice.toFixed(2) + '</span></div>';
  } else {
    priceHtml = '<div class="price">$' + product.price.toFixed(2) + '</div>';
  }
  return '<div class="product-card' + (product.onSale && product.discount > 0 ? ' sale-product-card' : '') + '">' +
    '<img src="' + imgUrl + '" alt="' + product.name + '" class="product-img">' +
    (product.onSale && product.discount > 0 ? '<div class="sale-badge">-' + product.discount + '%</div>' : '<div class="new-badge">NEW</div>') +
    '<button class="wishlist-btn" data-id="' + product._id + '" data-name="' + product.name + '" data-price="' + (product.onSale && product.discount > 0 ? (product.price * (1 - product.discount / 100)) : product.price) + '" data-image="' + imgUrl + '" >' +
      '<i class="far fa-heart"></i>' +
    '</button>' +
    '<div class="product-info">' +
      '<h3>' + product.name + '</h3>' +
      '<p>' + (product.description || 'Premium fashion item') + '</p>' +
      priceHtml +
      (hasSizes ? '<div class="product-sizes">' + product.sizes.map(function(s) { return '<button type="button" class="size-btn" data-size="' + s + '" onclick="selectSize(this)">' + s + '</button>'; }).join('') + '</div>' : '') +
      '<p class="stock-info ' + stockClass + '">' + stockStatus + '</p>' +
      '<button class="add-to-cart" data-id="' + product._id + '" data-name="' + product.name + '" data-price="' + (product.onSale && product.discount > 0 ? (product.price * (1 - product.discount / 100)) : product.price) + '" data-image="' + imgUrl + '">' +
        t('addToCart') +
      '</button>' +
    '</div>' +
  '</div>';
}

function displayProducts(products) {
  const container = document.getElementById('products-container');
  const noProducts = document.getElementById('no-products');
  if (!container) return;

  if (products.length === 0) {
    container.style.display = 'none';
    if (noProducts) noProducts.style.display = 'block';
    return;
  }

  container.style.display = 'block';
  if (noProducts) noProducts.style.display = 'none';

  var categoryLabels = {
    men: "Men's Fashion",
    women: "Women's Fashion",
    kids: 'Kids Fashion',
    accessories: 'Accessories',
    perfumes: 'Perfumes'
  };

  var categoryMap = {
    men: ['men', "men's fashion", "men's", 'male'],
    women: ['women', "women's fashion", "women's", 'female'],
    kids: ['kids', "kids fashion", 'children', 'child'],
    accessories: ['accessories', 'accessory', 'jewelry', 'jewellery'],
    perfumes: ['perfumes', 'perfume', 'fragrance', 'scent']
  };

  function getCategoryKey(product) {
    if (!product.category) return 'other';
    var cat = product.category.toLowerCase();
    for (var key in categoryMap) {
      if (categoryMap[key].some(function(k) { return cat.includes(k); })) {
        return key;
      }
    }
    return 'other';
  }

  if (currentCategory && currentCategory !== 'all') {
    container.innerHTML = '<div class="products-grid-main">' + products.map(productCardHtml).join('') + '</div>';
  } else {
    var grouped = {};
    for (var key in categoryLabels) grouped[key] = [];
    grouped['other'] = [];

    products.forEach(function(p) {
      var k = getCategoryKey(p);
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(p);
    });

    var html = '';
    for (var key in categoryLabels) {
      if (grouped[key] && grouped[key].length > 0) {
        html += '<div class="category-section">' +
          '<h2 class="category-heading">' + categoryLabels[key] + '</h2>' +
          '<div class="products-grid-main">' + grouped[key].map(productCardHtml).join('') + '</div>' +
        '</div>';
      }
    }
    if (grouped['other'] && grouped['other'].length > 0) {
      html += '<div class="category-section">' +
        '<h2 class="category-heading">Other</h2>' +
        '<div class="products-grid-main">' + grouped['other'].map(productCardHtml).join('') + '</div>' +
      '</div>';
    }
    container.innerHTML = html;
  }
  updateWishlistHearts();
}

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
    cart.push({ id: key, name: name + (size ? ' (' + size + ')' : ''), price: price, image: image || 'images/1.jpg', qty: 1, size: size, productId: id });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  showToast('Item Added To Cart Successfully');
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById('cart-count');
  const bottomCartCountEl = document.getElementById('bottom-cart-count');
  if (cartCountEl) cartCountEl.textContent = count;
  if (bottomCartCountEl) bottomCartCountEl.textContent = count;
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

async function checkout() {
  if (!currentUser) {
    closeCart();
    openAuthModal();
    return;
  }
  
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  const orderData = {
    customer: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone || '' },
    items: cart.map(item => ({ productId: item.id, name: item.name, price: item.price, quantity: item.qty })),
    paymentMethod: 'credit_card'
  };
  
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(orderData)
    });
    
    if (response.ok) {
      alert('Order placed successfully!');
      cart = [];
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      closeCart();
    } else {
      alert('Error placing order');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error placing order');
  }
}

function logout() {
  localStorage.removeItem('customerToken');
  localStorage.removeItem('customerUser');
  authToken = null;
  currentUser = null;
  showLoggedOutState();
}

function performSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput && searchInput.value.trim()) {
    window.location.href = `/shop?search=${encodeURIComponent(searchInput.value.trim())}`;
  } else {
    window.location.href = '/shop';
  }
}

function subscribeNewsletter(e) {
  e.preventDefault();
  alert('Thank you for subscribing!');
  e.target.reset();
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

function selectSize(btn) {
  const parent = btn.parentElement;
  if (parent) {
    parent.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  }
  btn.classList.add('selected');
}

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('show');
  }
};

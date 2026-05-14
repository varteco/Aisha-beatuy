const API_BASE = '/api';
let currentUser = null;
let authToken = localStorage.getItem('customerToken');
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];

document.addEventListener('DOMContentLoaded', function () {
  checkAuth();
  updateCartCount();
  loadFeaturedProducts();
  
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

async function loadFeaturedProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    allProducts = await response.json();
    let featuredProducts = allProducts.filter(p => p.featured);
    
    // If no featured products, show all products
    if (featuredProducts.length === 0) {
      featuredProducts = allProducts.slice(0, 10);
    }
    
    displayFeaturedProducts(featuredProducts);
  } catch (error) {
    console.error('Error loading featured products:', error);
  }
}

function displayFeaturedProducts(products) {
  const container = document.getElementById('featured-products-container');
  const noFeatured = document.getElementById('no-featured');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '';
    noFeatured.style.display = 'block';
    return;
  }

  noFeatured.style.display = 'none';
  container.innerHTML = products.map(product => {
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
    return `
      <div class="product-card">
        <img src="${imgUrl}" alt="${product.name}" class="product-img">
        <button class="wishlist-btn" data-id="${product._id}" data-name="${product.name}" data-price="${product.price}" data-image="${imgUrl}" >
          <i class="far fa-heart"></i>
        </button>
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.description || 'Premium fashion item'}</p>
          <div class="price">$${product.price.toFixed(2)}</div>
          ${hasSizes ? `<div class="product-sizes">${product.sizes.map(s => `<button type="button" class="size-btn" data-size="${s}" onclick="selectSize(this)">${s}</button>`).join('')}</div>` : ''}
          <p class="stock-info ${stockClass}">${stockStatus}</p>
          <button class="btn add-to-cart" data-id="${product._id}" data-name="${product.name}" data-price="${product.price}" data-image="${imgUrl}">
            ${t('addToCart')}
          </button>
        </div>
      </div>
    `;
  }).join('');
  updateWishlistHearts();
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
  document.getElementById('user-icon').style.display = 'none';
  document.getElementById('user-menu').style.display = 'inline-block';
  document.getElementById('user-name').textContent = currentUser.name || currentUser.email;
}

function showLoggedOutState() {
  document.getElementById('user-icon').style.display = 'inline-block';
  document.getElementById('user-menu').style.display = 'none';
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cart-count').textContent = count;
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

function openCart() {
  document.getElementById('cart-modal').classList.add('show');
  displayCart();
}

function closeCart() {
  document.getElementById('cart-modal').classList.remove('show');
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

function logout() {
  localStorage.removeItem('customerToken');
  localStorage.removeItem('customerUser');
  authToken = null;
  currentUser = null;
  showLoggedOutState();
}

function viewOrders() {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  window.location.href = '/admin';
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
    customer: {
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || ''
    },
    items: cart.map(item => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.qty
    })),
    paymentMethod: 'credit_card'
  };
  
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
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

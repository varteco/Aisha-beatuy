/* Amazon-style UI Enhancements */

document.addEventListener('DOMContentLoaded', function() {

  /* 1. Sticky Header Shadow */
  var header = document.querySelector('.main-header');
  if (header) {
    window.addEventListener('scroll', function() {
      header.classList.toggle('header-shadow', window.scrollY > 10);
    });
  }

  /* 2. Product Badge Generator */
  document.querySelectorAll('[data-price]').forEach(function(el) {
    var orig = parseFloat(el.getAttribute('data-original-price'));
    var price = parseFloat(el.getAttribute('data-price'));
    if (orig && price && orig > price) {
      var pct = Math.round((1 - price / orig) * 100);
      var badge = document.createElement('div');
      badge.className = 'product-badge';
      badge.textContent = '-' + pct + '%';
      var container = el.closest('.product-card, .product-item, [class*="product"]');
      if (container) {
        container.style.position = 'relative';
        container.appendChild(badge);
      }
    }
  });

  /* 3. Star Rating Generator */
  document.querySelectorAll('[data-rating]').forEach(function(el) {
    var rating = parseFloat(el.getAttribute('data-rating'));
    if (isNaN(rating)) return;
    var count = el.getAttribute('data-rating-count') || '';
    var full = Math.floor(rating);
    var half = rating - full >= 0.3 ? 1 : 0;
    var empty = 5 - full - half;
    var html = '<span class="stars">';
    for (var i = 0; i < full; i++) html += '<i class="fas fa-star"></i>';
    if (half) html += '<i class="fas fa-star-half-alt"></i>';
    for (var i = 0; i < empty; i++) html += '<i class="fas fa-star empty"></i>';
    html += '</span>';
    if (count) html += '<span class="stars-count">' + count + '</span>';
    el.innerHTML = html;
  });

  /* 4. Deal Price Display */
  document.querySelectorAll('[data-deal-price]').forEach(function(el) {
    var orig = el.getAttribute('data-original-price');
    var deal = el.getAttribute('data-deal-price');
    if (orig && deal) {
      var origP = parseFloat(orig), dealP = parseFloat(deal);
      if (origP > dealP) {
        var pct = Math.round((1 - dealP / origP) * 100);
        el.innerHTML = '<span class="price-deal">$' + dealP.toFixed(2) + '</span>' +
          ' <span class="price-original">$' + origP.toFixed(2) + '</span>' +
          ' <span class="price-deal-percent">-' + pct + '%</span>';
      }
    }
  });

  /* 5. Breadcrumb Auto-generator */
  var bc = document.getElementById('breadcrumb');
  if (bc && !bc.hasChildNodes()) {
    var path = window.location.pathname.replace('.html', '').split('/').filter(Boolean);
    var html = '<a href="/">Home</a>';
    path.forEach(function(seg, i) {
      html += ' <span class="separator">›</span> ';
      var label = seg.replace(/-/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
      if (i === path.length - 1) {
        html += '<span class="current">' + label + '</span>';
      } else {
        html += '<a href="/' + seg + '">' + label + '</a>';
      }
    });
    bc.innerHTML = html;
  }

  /* 6. "Buy Again" on Orders */
  document.querySelectorAll('.btn-buy-again').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var pid = this.getAttribute('data-product-id');
      if (pid) {
        var cart = JSON.parse(localStorage.getItem('cart') || '[]');
        var existing = cart.find(function(item) { return item._id === pid || item.id === pid; });
        if (existing) {
          existing.quantity = (existing.quantity || 1) + 1;
        } else {
          cart.push({ _id: pid, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        if (typeof updateCartCount === 'function') updateCartCount();
        if (typeof showToast === 'function') showToast('Added to cart');
      }
    });
  });

});
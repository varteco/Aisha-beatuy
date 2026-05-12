const COUNTRIES = [
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', flag: '🇸🇩', currency: 'SDG', ship: true },
  { code: 'AE', name: 'UAE', nameAr: 'الإمارات', flag: '🇦🇪', currency: 'AED', ship: true },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', flag: '🇸🇦', currency: 'SAR', ship: true },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', currency: 'EGP', ship: true },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', currency: 'QAR', ship: false },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', currency: 'KWD', ship: false },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', currency: 'BHD', ship: false },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', currency: 'OMR', ship: false },
];

let currentCountryCode = localStorage.getItem('aisha_country') || 'SD';
let detecting = false;

function getCountry() {
  return COUNTRIES.find(c => c.code === currentCountryCode) || COUNTRIES[0];
}

function setCountry(code) {
  currentCountryCode = code;
  localStorage.setItem('aisha_country', code);
  updateLocationUI();
  updateShippingNotice();
  closeLocationModal();
}

function detectLocation() {
  if (detecting) return;
  detecting = true;
  const btn = document.getElementById('detect-location-btn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...'; btn.disabled = true; }

  if (!navigator.geolocation) {
    fallbackDetect();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`)
        .then(r => r.json())
        .then(data => {
          const detected = data.countryCode || data.countryName;
          const match = COUNTRIES.find(c => c.code === detected || c.name === detected);
          if (match) {
            setCountry(match.code);
          } else {
            showDetectResult('Detected: ' + (data.countryName || 'Unknown') + ' — not in our service area yet.');
          }
          detecting = false;
          if (btn) { btn.innerHTML = '<i class="fas fa-location-dot"></i> Detect my location'; btn.disabled = false; }
        })
        .catch(function() {
          fallbackDetect();
        });
    },
    function() {
      fallbackDetect();
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
}

function fallbackDetect() {
  detecting = false;
  const btn = document.getElementById('detect-location-btn');
  if (btn) { btn.innerHTML = '<i class="fas fa-location-dot"></i> Detect my location'; btn.disabled = false; }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMap = {
      'Africa/Khartoum': 'SD', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
      'Africa/Cairo': 'EG', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW',
      'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM'
    };
    const code = tzMap[tz];
    if (code) { setCountry(code); showDetectResult('📍 Location set to ' + getCountry().name + ' (based on your timezone).'); }
    else { showDetectResult('Could not detect your country. Please select manually.'); }
  } catch(e) {
    showDetectResult('Could not detect your country. Please select manually.');
  }
}

function showDetectResult(msg) {
  const el = document.getElementById('detect-result');
  if (el) { el.textContent = msg; el.style.display = 'block'; setTimeout(function() { el.style.display = 'none'; }, 5000); }
}

function updateShippingNotice() {
  const country = getCountry();
  document.querySelectorAll('.ship-notice').forEach(function(el) {
    if (country.ship) {
      el.innerHTML = '<i class="fas fa-check-circle" style="color:#4CAF50"></i> We ship to <strong>' + country.name + '</strong>';
    } else {
      el.innerHTML = '<i class="fas fa-times-circle" style="color:#f44336"></i> We don\'t ship to <strong>' + country.name + '</strong> yet';
    }
  });
}

function updateLocationUI() {
  const country = getCountry();
  document.querySelectorAll('.location-display').forEach(el => {
    el.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${country.flag} ${country.name}`;
  });
  document.querySelectorAll('.location-name').forEach(el => {
    el.textContent = country.name;
  });
}

function openLocationModal() {
  const modal = document.getElementById('location-modal');
  if (modal) modal.style.display = 'flex';
}

function closeLocationModal() {
  const modal = document.getElementById('location-modal');
  if (modal) modal.style.display = 'none';
}

function renderLocationModal() {
  const existing = document.getElementById('location-modal');
  if (existing) return;

  const modal = document.createElement('div');
  modal.id = 'location-modal';
  modal.className = 'modal';
  modal.onclick = function(e) { if (e.target === this) closeLocationModal(); };

  const countryList = COUNTRIES.map(c => `
    <div class="location-option${c.code === currentCountryCode ? ' active' : ''}" onclick="setCountry('${c.code}')">
      <span class="location-flag">${c.flag}</span>
      <span class="location-name-option">${c.name}</span>
      <span class="location-name-ar">${c.nameAr}</span>
      ${c.code === currentCountryCode ? '<span class="location-check"><i class="fas fa-check"></i></span>' : ''}
    </div>
  `).join('');

  modal.innerHTML = `
    <div class="modal-content location-modal-content">
      <span class="modal-close" onclick="closeLocationModal()">&times;</span>
      <h3><i class="fas fa-map-marker-alt"></i> Choose your location</h3>
      <p id="detect-result" style="display:none;color:#FFD700;font-size:13px;margin-bottom:8px;"></p>
      <p>Select your country to see shipping options and availability.</p>
      <button id="detect-location-btn" class="detect-btn" onclick="detectLocation()"><i class="fas fa-location-dot"></i> Detect my location</button>
      <div class="location-list">
        ${countryList}
      </div>
      <p class="ship-notice" style="margin-top:12px;font-size:13px;"><i class="fas fa-check-circle" style="color:#4CAF50"></i> We ship to <strong>${getCountry().name}</strong></p>
    </div>
  `;

  document.body.appendChild(modal);
}

document.addEventListener('DOMContentLoaded', function() {
  renderLocationModal();
  updateLocationUI();
  updateShippingNotice();
  const lang = localStorage.getItem('language') || 'en';
  var h3 = document.getElementById('location-modal')?.querySelector('h3');
  var pp = document.getElementById('location-modal')?.querySelector('p');
  var detectBtn = document.getElementById('detect-location-btn');
  if (h3) h3.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + (lang === 'ar' ? 'اختر موقعك' : 'Choose your location');
  if (pp) pp.textContent = lang === 'ar' ? 'حدد بلدك لرؤية خيارات الشحن والتوفر.' : 'Select your country to see shipping options and availability.';
  if (detectBtn) detectBtn.innerHTML = '<i class="fas fa-location-dot"></i> ' + (lang === 'ar' ? 'كشف موقعي' : 'Detect my location');
  if (!localStorage.getItem('aisha_country')) {
    setTimeout(detectLocation, 500);
  }
});

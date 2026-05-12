const translations = {
  en: {
    home: "Home",
    shop: "Shop",
    categories: "Categories",
    newArrivals: "New Arrivals",
    sale: "Sale",
    cart: "Cart",
    login: "Login",
    register: "Register",
    logout: "Logout",
    myOrders: "My Orders",
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    name: "Name",
    username: "Username",
    phone: "Phone",
    enterEmail: "Enter your email",
    enterPassword: "Enter your password",
    chooseUsername: "Choose a username",
    enterYourName: "Enter your name",
    enterYourPhone: "Enter your phone",
    createPassword: "Create a password",
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: "Already have an account?",
    registerLink: "Register",
    loginLink: "Login",
    eleganceMeetsStyle: "Elegance Meets Style",
    discoverPremiumFashion: "Discover premium fashion for every occasion",
    shopNow: "Shop Now",
    featuredProducts: "Featured Products",
    shopByCategory: "Shop by Category",
    mensFashion: "Men's Fashion",
    womensFashion: "Women's Fashion",
    kidsFashion: "Kids Fashion",
    accessories: "Accessories",
    quickLinks: "Quick Links",
    aboutUs: "About Us",
    contact: "Contact",
    contactInfo: "Contact Info",
    address: "Uganda, Kampala",
    phone: "+256 767 886 480",
    email: "infoaishabeauty@gmail.com",
    allRightsReserved: "All rights reserved.",
    shoppingCart: "Shopping Cart",
    yourCartIsEmpty: "Your cart is empty",
    total: "Total",
    checkout: "Checkout",
    addToCart: "Add to Cart",
    inStock: "in stock",
    outOfStock: "Out of stock",
    lowStock: "low stock",
    allProducts: "All Products",
    filter: "Filter",
    noProductsFound: "No products found in this category.",
    exploreCollection: "Explore our collection of stylish men's clothing",
    discoverElegant: "Discover elegant women's wear and accessories",
    cuteComfortable: "Cute and comfortable outfits for children",
    completeYourLook: "Complete your look with our accessories"
  },
  ar: {
    home: "الرئيسية",
    shop: "المتجر",
    categories: "الفئات",
    newArrivals: "الوافدون الجدد",
    sale: "التخفيضات",
    cart: "السلة",
    login: "تسجيل الدخول",
    register: "حساب جديد",
    logout: "تسجيل الخروج",
    myOrders: "طلباتي",
    welcomeBack: "مرحباً بعودتك",
    createAccount: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    name: "الاسم",
    username: "اسم المستخدم",
    phone: "الهاتف",
    enterEmail: "أدخل بريدك الإلكتروني",
    enterPassword: "أدخل كلمة المرور",
    chooseUsername: "اختر اسم مستخدم",
    enterYourName: "أدخل اسمك",
    enterYourPhone: "أدخل رقم هاتفك",
    createPassword: "أنشئ كلمة مرور",
    dontHaveAccount: "ليس لديك حساب؟",
    alreadyHaveAccount: "لديك حساب بالفعل؟",
    registerLink: "سجل الآن",
    loginLink: "تسجيل الدخول",
    eleganceMeetsStyle: "الأناقة تلتقي بالأسلوب",
    discoverPremiumFashion: "اكتشف الأزياء المتميزة لكل مناسبة",
    shopNow: "تسوق الآن",
    featuredProducts: "المنتجات المميزة",
    shopByCategory: "تسوق حسب الفئة",
    mensFashion: "أزياء رجالية",
    womensFashion: "أزياء نسائية",
    kidsFashion: "أزياء أطفال",
    accessories: "الإكسسوارات",
    quickLinks: "روابط سريعة",
    aboutUs: "من نحن",
    contact: "اتصل بنا",
    contactInfo: "معلومات الاتصال",
    address: "123 شارع الأزياء، مدينة الأناقة",
    phone: "+256 767 886 480",
    email: "infoaishabeauty@gmail.com",
    allRightsReserved: "جميع الحقوق محفوظة.",
    shoppingCart: "سلة التسوق",
    yourCartIsEmpty: "سلتك فارغة",
    total: "المجموع",
    checkout: "الدفع",
    addToCart: "أضف إلى السلة",
    inStock: "متوفر",
    outOfStock: "غير متوفر",
    lowStock: "مخزون منخفض",
    allProducts: "جميع المنتجات",
    filter: "تصفية",
    noProductsFound: "لا توجد منتجات في هذه الفئة.",
    exploreCollection: "استكشف مجموعتنا من ملابس الرجال العصرية",
    discoverElegant: "اكتشف أزياء النساء والإكسسوارات الأنيقة",
    cuteComfortable: "ملابس أطفال جميلة ومريحة",
    completeYourLook: "أكمل إطلالتك بإكسسواراتنا"
  }
};

let currentLang = localStorage.getItem('language') || 'en';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('language', lang);
  
  document.documentElement.lang = lang;
  
  if (lang === 'ar') {
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl');
  } else {
    document.documentElement.dir = 'ltr';
    document.body.classList.remove('rtl');
  }
  
  translatePage();
  if (typeof updateUI === 'function') updateUI();
}

function t(key) {
  return translations[currentLang][key] || key;
}

function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
}

function getLanguage() {
  return currentLang;
}

document.addEventListener('DOMContentLoaded', function() {
  setLanguage(currentLang);
});

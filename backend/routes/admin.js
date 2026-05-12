const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const Page = require('../models/Page');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'aisha-beauty-secret-key-2024';
    const decoded = jwt.verify(token, JWT_SECRET);
    const User = require('../models/User');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Get admin stats
router.get('/stats', auth, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await Order.distinct('customer.email').then((emails) => emails.length);
    
    const orders = await Order.find();
    let monthlySales = 0;
    let totalValue = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;

    orders.forEach((order) => {
      if (order.status === 'delivered') {
        monthlySales += order.totalAmount;
        deliveredOrders++;
      }
      if (order.status === 'pending') pendingOrders++;
      totalValue += order.totalAmount;
    });

    res.json({
      totalProducts,
      totalCustomers,
      monthlySales,
      totalValue,
      pendingOrders,
      deliveredOrders,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// Get all orders (admin view)
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.product')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get single order (admin view)
router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Delete customer orders by email
router.delete('/customers/:email', auth, async (req, res) => {
  try {
    const { email } = req.params;
    const result = await Order.deleteMany({ 'customer.email': email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No orders found for this customer' });
    }
    res.json({ message: `Deleted ${result.deletedCount} order(s) for ${email}` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting customer', error: error.message });
  }
});

// Get all customers
router.get('/customers', auth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderDate: -1 });
    const customerMap = new Map();
    
    orders.forEach(order => {
      if (order.customer?.email) {
        const email = order.customer.email;
        if (!customerMap.has(email)) {
          customerMap.set(email, {
            email: order.customer.email,
            name: order.customer.name,
            phone: order.customer.phone,
            address: order.customer.address,
            totalOrders: 0,
            totalSpent: 0,
            lastOrder: order.orderDate,
          });
        }
        const customer = customerMap.get(email);
        customer.totalOrders++;
        customer.totalSpent += order.totalAmount;
        if (new Date(order.orderDate) > new Date(customer.lastOrder)) {
          customer.lastOrder = order.orderDate;
        }
      }
    });

    res.json(Array.from(customerMap.values()));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

// Get categories with counts
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      }
    ]);
    
    const allCategories = ['men', 'women', 'kids', 'accessories', 'perfumes'];
    const result = allCategories.map(cat => {
      const existing = categories.find(c => c._id === cat);
      return {
        name: cat,
        count: existing ? existing.count : 0,
        totalStock: existing ? existing.totalStock : 0,
        totalValue: existing ? existing.totalValue : 0
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Get analytics data
router.get('/analytics', auth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = await Order.find({
      orderDate: { $gte: thirtyDaysAgo }
    }).sort({ orderDate: -1 });

    const dailySales = {};
    const statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    let recentRevenue = 0;

    recentOrders.forEach(order => {
      const date = new Date(order.orderDate).toISOString().split('T')[0];
      if (!dailySales[date]) dailySales[date] = { orders: 0, revenue: 0 };
      dailySales[date].orders++;
      dailySales[date].revenue += order.totalAmount;
      
      if (statusCounts[order.status] !== undefined) {
        statusCounts[order.status]++;
      }

      if (order.status === 'delivered') {
        recentRevenue += order.totalAmount;
      }
    });

    const topProducts = await Product.find()
      .sort({ stock: -1 })
      .limit(5)
      .select('name category stock price');

    res.json({
      dailySales: Object.entries(dailySales).map(([date, data]) => ({ date, ...data })),
      statusCounts,
      recentRevenue,
      topProducts,
      totalOrders: recentOrders.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

// Update order status (admin)
router.patch('/orders/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'payment_confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid status: "' + (status || '') + '"' });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: status.toLowerCase(), updatedAt: new Date() },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// Delete order (admin only)
router.delete('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
});

// Get settings (from DB with fallback defaults)
router.get('/settings', auth, async (req, res) => {
  try {
    let settings = await Setting.findOne({ key: 'store' });
    if (!settings) {
      settings = await Setting.create({
        key: 'store',
        storeName: 'Aisha Beauty',
        storeEmail: 'contact@aishabeauty.com',
        storePhone: '+1 234 567 8900',
        storeAddress: '123 Beauty Street, Fashion City',
        currency: 'USD',
        taxRate: 10,
        shippingCost: 15,
        freeShippingThreshold: 100,
        allowGuestCheckout: true,
        notifications: { orderEmail: true, orderSMS: false, marketingEmail: true }
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
  }
});

// Update settings (persisted to DB)
router.put('/settings', auth, async (req, res) => {
  try {
    const settings = await Setting.findOneAndUpdate(
      { key: 'store' },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
});

// ==================== PAGE CRUD ====================

// Get all pages
router.get('/pages', auth, async (req, res) => {
  try {
    const pages = await Page.find().sort({ order: 1, createdAt: -1 });
    res.json(pages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pages', error: error.message });
  }
});

// Create page
router.post('/pages', auth, async (req, res) => {
  try {
    const page = new Page(req.body);
    await page.save();
    res.status(201).json(page);
  } catch (error) {
    res.status(500).json({ message: 'Error creating page', error: error.message });
  }
});

// Update page
router.put('/pages/:id', auth, async (req, res) => {
  try {
    const page = await Page.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: 'Error updating page', error: error.message });
  }
});

// Delete page
router.delete('/pages/:id', auth, async (req, res) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting page', error: error.message });
  }
});

// Seed default Customer Service pages
router.post('/seed-pages', auth, async (req, res) => {
  try {
    const defaultPages = [
      {
        title: 'Shipping Info',
        slug: 'shipping-info',
        content: '<h2>Shipping Information</h2><p>We offer fast and reliable shipping to all MENA countries.</p><h3>Delivery Times</h3><ul><li>Standard: 5-7 business days</li><li>Express: 2-3 business days</li></ul><h3>Shipping Costs</h3><p>Free shipping on orders over $100. Standard shipping is $10, Express shipping is $20.</p><h3>International Shipping</h3><p>We ship to all countries in the Middle East and North Africa region.</p>',
        published: true,
        showInFooter: true,
        footerColumn: 'customer-service',
        order: 1
      },
      {
        title: 'Returns & Exchanges',
        slug: 'returns-exchanges',
        content: '<h2>Returns & Exchanges</h2><p>We want you to be completely satisfied with your purchase.</p><h3>Return Policy</h3><p>You may return unused items within 30 days of delivery for a full refund.</p><h3>How to Return</h3><ol><li>Contact our customer service team</li><li>Pack the item securely in original packaging</li><li>Ship the item back to us</li><li>Refund will be processed within 5-7 business days</li></ol>',
        published: true,
        showInFooter: true,
        footerColumn: 'customer-service',
        order: 2
      },
      {
        title: 'Order Tracking',
        slug: 'order-tracking',
        content: '<h2>Order Tracking</h2><p>Track your order easily using your order ID.</p><p>Visit our <a href="/tracking">tracking page</a> and enter your order ID to see real-time updates on your shipment.</p><h3>What You Need</h3><ul><li>Your order ID (found in your order confirmation email)</li><li>The email address used for the order</li></ul>',
        published: true,
        showInFooter: true,
        footerColumn: 'customer-service',
        order: 3
      },
      {
        title: 'FAQs',
        slug: 'faqs',
        content: '<h2>Frequently Asked Questions</h2><h3>How do I place an order?</h3><p>Simply browse our catalog, add items to your cart, and follow the checkout process.</p><h3>What payment methods do you accept?</h3><p>We accept Cash on Delivery (COD) and Credit/Debit cards.</p><h3>Can I change or cancel my order?</h3><p>Please contact us within 1 hour of placing your order to make changes.</p><h3>How do I contact customer service?</h3><p>Email us at info@aishabeauty.com or use the contact form.</p>',
        published: true,
        showInFooter: true,
        footerColumn: 'customer-service',
        order: 4
      },
      {
        title: 'Size Guide',
        slug: 'size-guide',
        content: '<h2>Size Guide</h2><p>Find your perfect fit with our size guide.</p><h3>Clothing Sizes</h3><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;"><tr style="background:#f5f5f5;"><th>Size</th><th>Chest (in)</th><th>Waist (in)</th><th>Hips (in)</th></tr><tr><td>XS</td><td>32-34</td><td>26-28</td><td>34-36</td></tr><tr><td>S</td><td>34-36</td><td>28-30</td><td>36-38</td></tr><tr><td>M</td><td>36-38</td><td>30-32</td><td>38-40</td></tr><tr><td>L</td><td>38-40</td><td>32-34</td><td>40-42</td></tr><tr><td>XL</td><td>40-42</td><td>34-36</td><td>42-44</td></tr><tr><td>XXL</td><td>42-44</td><td>36-38</td><td>44-46</td></tr></table>',
        published: true,
        showInFooter: true,
        footerColumn: 'customer-service',
        order: 5
      },
      {
        title: 'About Us',
        slug: 'about-us',
        content: '<h2>About Aisha Beauty</h2><p>Welcome to Aisha Beauty — your trusted destination for premium fashion and lifestyle products.</p><p>We are dedicated to bringing you the latest trends in fashion, beauty, and accessories at affordable prices. Our curated collection features everything from elegant dresses to everyday essentials.</p><h3>Our Mission</h3><p>To provide high-quality products that make our customers feel confident and beautiful.</p><h3>Why Shop With Us?</h3><ul><li>Premium quality products</li><li>Affordable prices</li><li>Fast shipping across MENA</li><li>Easy returns</li><li>Dedicated customer support</li></ul>',
        published: true,
        showInFooter: true,
        footerColumn: 'customer-service',
        order: 6
      },
      {
        title: 'Contact',
        slug: 'contact',
        content: '<h2>Contact Us</h2><p>We\'d love to hear from you! Reach out to us using any of the methods below.</p><h3>Email</h3><p><a href="mailto:info@aishabeauty.com">info@aishabeauty.com</a></p><h3>Phone</h3><p>+1 234 567 8900</p><h3>Address</h3><p>123 Beauty Street, Fashion City</p><h3>Business Hours</h3><p>Monday - Friday: 9:00 AM - 6:00 PM</p><p>Saturday: 10:00 AM - 4:00 PM</p><p>Sunday: Closed</p>',
        published: true,
        showInFooter: true,
        footerColumn: 'customer-service',
        order: 7
      }
    ];

    let created = 0;
    for (const pageData of defaultPages) {
      const exists = await Page.findOne({ slug: pageData.slug });
      if (!exists) {
        await Page.create(pageData);
        created++;
      }
    }

    res.json({ message: `Seeded ${created} default pages`, total: defaultPages.length });
  } catch (error) {
    res.status(500).json({ message: 'Error seeding pages', error: error.message });
  }
});

module.exports = router;

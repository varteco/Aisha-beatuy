const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');

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
    
    const allCategories = ['men', 'women', 'kids', 'accessories'];
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
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// Get settings
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = {
      storeName: 'Aisha Beauty',
      storeEmail: 'contact@aishabeauty.com',
      storePhone: '+1 234 567 8900',
      storeAddress: '123 Beauty Street, Fashion City',
      currency: 'USD',
      taxRate: 10,
      freeShippingThreshold: 100,
      shippingCost: 15,
      allowGuestCheckout: true,
      notifications: {
        orderEmail: true,
        orderSMS: false,
        marketingEmail: true
      }
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
  }
});

// Update settings
router.put('/settings', auth, async (req, res) => {
  try {
    const settings = req.body;
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
});

module.exports = router;

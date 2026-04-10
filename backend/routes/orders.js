const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const Product = require('../models/Product');

const JWT_SECRET = process.env.JWT_SECRET || 'aisha-beauty-secret-key-2024';

// Customer auth middleware
const customerAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Get orders for logged-in customer
router.get('/', customerAuth, async (req, res) => {
  try {
    const orders = await Order.find({ 'customer.userId': req.userId })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get single order
router.get('/:id', customerAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      'customer.userId': req.userId 
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Create order (customer)
router.post('/', customerAuth, async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      let product = null;
      let productId = item.productId || item.product;
      
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        try {
          product = await Product.findById(productId);
        } catch (e) {
          product = null;
        }
      }

      if (product) {
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;
        processedItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          image: product.images?.[0] || '',
        });
      } else {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        totalAmount += itemTotal;
        processedItems.push({
          product: null,
          name: item.name || 'Unknown Product',
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || '',
        });
      }
    }

    const count = await Order.countDocuments();
    const orderId = 'ORD' + String(count + 1).padStart(6, '0');
    
    // Get customer info from token (we'll fetch user details if needed)
    const order = new Order({
      orderId,
      customer: {
        userId: req.userId,
        name: req.body.customerName || '',
        email: req.body.customerEmail || '',
        phone: req.body.customerPhone || '',
        address: req.body.customerAddress || '',
      },
      items: processedItems,
      total: totalAmount,
      status: 'pending',
      paymentMethod: paymentMethod || 'cod',
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// Update order status (customer can only cancel pending orders)
router.patch('/:id', customerAuth, async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findOne({ 
      _id: req.params.id, 
      'customer.userId': req.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Customer can only cancel pending orders
    if (order.status !== 'pending' && status === 'cancelled') {
      return res.status(400).json({ message: 'Can only cancel pending orders' });
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

module.exports = router;

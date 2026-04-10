const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/', async (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: customer, items' });
    }

    if (!customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({ message: 'Please fill in all customer details' });
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      let product = null;
      if (item.productId && item.productId.length === 24) {
        try {
          product = await Product.findById(item.productId);
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
        });
      } else {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        totalAmount += itemTotal;
        processedItems.push({
          product: null,
          name: item.name || 'Unknown Product',
          price: item.price || 0,
          quantity: item.quantity || 1,
        });
      }
    }

    const count = await Order.countDocuments();
    const orderId = 'ORD' + String(count + 1).padStart(6, '0');

    const order = new Order({
      orderId,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || ''
      },
      items: processedItems,
      totalAmount,
      paymentMethod: 'stripe',
      status: 'pending',
    });

    await order.save();

    // If Stripe is not configured, return order info so frontend can handle it
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_your_stripe_secret_key') {
      return res.json({ 
        success: true, 
        orderId: order._id,
        orderIdFormatted: orderId,
        totalAmount,
        message: 'Order created successfully. Payment integration pending.'
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: processedItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/order-success.html?orderId=${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/pay.html?orderId=${order._id}`,
      metadata: { orderId: order._id.toString() },
    });

    res.json({ sessionId: session.id, url: session.url, orderId: order._id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ message: 'Error creating checkout session', error: error.message });
  }
});

module.exports = router;
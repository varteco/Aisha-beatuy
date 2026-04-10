const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    try {
      await Order.findByIdAndUpdate(orderId, {
        status: 'processing',
        paymentStatus: 'paid',
        stripePaymentId: session.payment_intent
      });
      console.log(`Order ${orderId} updated to processing`);
    } catch (error) {
      console.error('Error updating order:', error);
    }
  }

  res.json({ received: true });
});

module.exports = router;
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    userId: String,
    name: String,
    email: String,
    phone: String,
    address: String,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      name: String,
      price: Number,
      quantity: Number,
      image: String,
    },
  ],
  total: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'payment_confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    default: 'cod',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  stripePaymentId: {
    type: String,
    default: '',
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

orderSchema.pre('save', async function () {
  if (!this.orderId) {
    this.orderId = 'ORD' + Date.now().toString(36).toUpperCase() + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  }
  if (this.total && !this.totalAmount) {
    this.totalAmount = this.total;
  }
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
});

module.exports = mongoose.model('Order', orderSchema);

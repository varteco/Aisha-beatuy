const mongoose = require('mongoose');

const sellRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestType: {
    type: String,
    enum: ['sell', 'supplier'],
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  businessName: {
    type: String,
    default: '',
  },
  businessType: {
    type: String,
    default: '',
  },
  country: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'approved', 'rejected'],
    default: 'pending',
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

sellRequestSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('SellRequest', sellRequestSchema);

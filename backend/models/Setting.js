const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'store' },
  storeName: { type: String, default: 'Aisha Beauty' },
  storeEmail: { type: String, default: 'contact@aishabeauty.com' },
  storePhone: { type: String, default: '+1 234 567 8900' },
  storeAddress: { type: String, default: '123 Beauty Street, Fashion City' },
  currency: { type: String, default: 'USD' },
  taxRate: { type: Number, default: 10 },
  shippingCost: { type: Number, default: 15 },
  freeShippingThreshold: { type: Number, default: 100 },
  freeCountries: { type: [String], default: [] },
  allowGuestCheckout: { type: Boolean, default: true },
  socialFacebook: { type: String, default: '' },
  socialTwitter: { type: String, default: '' },
  socialInstagram: { type: String, default: '' },
  socialYoutube: { type: String, default: '' },
  notifications: {
    orderEmail: { type: Boolean, default: true },
    orderSMS: { type: Boolean, default: false },
    marketingEmail: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);

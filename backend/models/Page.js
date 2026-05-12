const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  showInFooter: { type: Boolean, default: false },
  footerColumn: { type: String, default: 'customer-service' }
}, { timestamps: true });

pageSchema.pre('validate', function() {
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
});

module.exports = mongoose.model('Page', pageSchema);

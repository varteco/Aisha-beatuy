const express = require('express');
const router = express.Router();
const Page = require('../models/Page');

// Get all published pages
router.get('/', async (req, res) => {
  try {
    const pages = await Page.find({ published: true }).sort({ order: 1 });
    res.json(pages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pages', error: error.message });
  }
});

// Get single page by slug
router.get('/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, published: true });
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching page', error: error.message });
  }
});

module.exports = router;

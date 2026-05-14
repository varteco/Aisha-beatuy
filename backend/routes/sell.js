const express = require('express');
const router = express.Router();
const SellRequest = require('../models/SellRequest');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aisha-beauty-secret-key-2024';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

router.post('/', auth, async (req, res) => {
  try {
    const { requestType, fullName, email, phone, businessName, businessType, country, message } = req.body;

    if (!requestType || !fullName || !email || !phone) {
      return res.status(400).json({ message: 'requestType, fullName, email, and phone are required' });
    }

    const sellRequest = new SellRequest({
      userId: req.user._id,
      requestType,
      fullName,
      email,
      phone,
      businessName: businessName || '',
      businessType: businessType || '',
      country: country || '',
      message: message || '',
    });

    await sellRequest.save();

    res.status(201).json({ success: true, message: 'Your request has been submitted. We will contact you within 24 hours.' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting request', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const requests = await SellRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { status } = req.body;
    const request = await SellRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error updating request status', error: error.message });
  }
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect to MongoDB
connectDB();

// Stripe webhook - must be before body-parser
app.use('/api/webhook', require('./routes/webhook'));

// Middleware
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://aishabeautyfrontend.vercel.app',
    'http://localhost:9000',
    'http://localhost:8888'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/pages', require('./routes/pages'));

// Public settings endpoint (no auth)
app.get('/api/settings/public', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    let settings = await Setting.findOne({ key: 'store' });
    if (!settings) {
      settings = {
        storeName: 'Aisha Beauty',
        storeEmail: 'contact@aishabeauty.com',
        storePhone: '+1 234 567 8900',
        storeAddress: '123 Beauty Street, Fashion City',
        currency: 'USD',
        taxRate: 10,
        shippingCost: 15,
        freeShippingThreshold: 100,
        freeCountries: []
      };
      return res.json(settings);
    }
    res.json({
      storeName: settings.storeName,
      storeEmail: settings.storeEmail,
      storePhone: settings.storePhone,
      storeAddress: settings.storeAddress,
      currency: settings.currency,
      taxRate: settings.taxRate,
      shippingCost: settings.shippingCost,
      freeShippingThreshold: settings.freeShippingThreshold,
      freeCountries: settings.freeCountries,
      socialFacebook: settings.socialFacebook,
      socialTwitter: settings.socialTwitter,
      socialInstagram: settings.socialInstagram,
      socialYoutube: settings.socialYoutube
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Serve frontend static files (auto-resolve .html extension)
app.use(express.static('../frontend/public', { extensions: ['html'] }));

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

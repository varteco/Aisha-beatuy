require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Order = require('./models/Order');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aisha_beauty');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing data');

    const products = await Product.insertMany([
      {
        name: 'Premium Jacket',
        description: 'High-quality leather jacket for men',
        price: 129.99,
        category: 'men',
        stock: 45,
        images: ['/images/1.jpg'],
      },
      {
        name: 'Elegant Dress',
        description: 'Beautiful evening dress for women',
        price: 89.99,
        category: 'women',
        stock: 32,
        images: ['/images/2.jpg'],
      },
      {
        name: 'Designer Handbag',
        description: 'Luxury leather handbag',
        price: 199.99,
        category: 'accessories',
        stock: 15,
        images: ['/images/3.jpg'],
      },
      {
        name: 'Casual Shirt',
        description: 'Comfortable casual shirt for everyday wear',
        price: 49.99,
        category: 'men',
        stock: 0,
        images: ['/images/4.jpg'],
      },
      {
        name: 'Summer Dress',
        description: 'Light and breezy summer dress',
        price: 65.99,
        category: 'women',
        stock: 28,
        images: ['/images/5.jpg'],
      },
      {
        name: 'Leather Belt',
        description: 'Premium leather belt',
        price: 39.99,
        category: 'accessories',
        stock: 50,
        images: ['/images/6.jpg'],
      },
    ]);

    console.log(`Created ${products.length} products`);

    const orders = await Order.insertMany([
      {
        orderId: 'ORD000001',
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-0001',
          address: '123 Main St, City, State',
        },
        items: [
          {
            product: products[0]._id,
            name: products[0].name,
            price: products[0].price,
            quantity: 2,
          },
        ],
        totalAmount: products[0].price * 2,
        status: 'delivered',
        paymentMethod: 'credit_card',
      },
      {
        orderId: 'ORD000002',
        customer: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-0002',
          address: '456 Oak Ave, City, State',
        },
        items: [
          {
            product: products[1]._id,
            name: products[1].name,
            price: products[1].price,
            quantity: 1,
          },
        ],
        totalAmount: products[1].price,
        status: 'processing',
        paymentMethod: 'credit_card',
      },
      {
        orderId: 'ORD000003',
        customer: {
          name: 'Bob Johnson',
          email: 'bob@example.com',
          phone: '555-0003',
          address: '789 Pine Rd, City, State',
        },
        items: [
          {
            product: products[2]._id,
            name: products[2].name,
            price: products[2].price,
            quantity: 1,
          },
        ],
        totalAmount: products[2].price,
        status: 'pending',
        paymentMethod: 'credit_card',
      },
    ]);

    console.log(`Created ${orders.length} orders`);
    console.log('\nDatabase seeding completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
};

seedDatabase();

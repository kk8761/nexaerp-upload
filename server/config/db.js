/**
 * NexaERP — MongoDB Atlas Connection
 * Auto-reconnect with retry logic
 */

const mongoose = require('mongoose');

let retryCount = 0;
const MAX_RETRIES = 5;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not set in .env file');
    console.log('📋 Instructions:');
    console.log('   1. Go to https://cloud.mongodb.com/');
    console.log('   2. Create a FREE M0 cluster');
    console.log('   3. Click Connect → Drivers → Copy connection string');
    console.log('   4. Add MONGODB_URI=<your_string> to server/.env');
    process.exit(1);
  }

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    retryCount = 0;

    // Seed demo data if empty
    await seedDemoData();

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    retryCount++;

    if (retryCount <= MAX_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`🔄 Retrying in ${delay / 1000}s... (${retryCount}/${MAX_RETRIES})`);
      setTimeout(connectDB, delay);
    } else {
      console.error('💀 Max retries exceeded. Exiting...');
      process.exit(1);
    }
  }
};

// ─── Demo Data Seeder ─────────────────────────────────────
async function seedDemoData() {
  const User = require('../models/User');

  const existingAdmin = await User.findOne({ role: 'owner' });
  if (existingAdmin) return; // Already seeded

  console.log('🌱 Seeding demo data...');

  const bcrypt = require('bcryptjs');
  const Product = require('../models/Product');
  const Customer = require('../models/Customer');
  const Supplier = require('../models/Supplier');

  // ── Demo Owner ────────────────────────────────────────────
  const ownerPass = await bcrypt.hash('demo123', 12);
  const owner = await User.create({
    name: 'Arjun Sharma',
    email: 'owner@nexaerp.demo',
    password: ownerPass,
    role: 'owner',
    businessName: 'Sharma Grocery & Provisions',
    businessType: 'grocery',
    phone: '+91 9876543210',
    storeId: 'store-001',
    avatar: 'AS'
  });

  // ── Demo Cashier ──────────────────────────────────────────
  const staffPass = await bcrypt.hash('demo123', 12);
  await User.create({
    name: 'Priya Patel',
    email: 'cashier@nexaerp.demo',
    password: staffPass,
    role: 'cashier',
    businessName: 'Sharma Grocery & Provisions',
    businessType: 'grocery',
    phone: '+91 9765432109',
    storeId: 'store-001',
    avatar: 'PP'
  });

  // ── Demo Suppliers ────────────────────────────────────────
  const suppliers = await Supplier.insertMany([
    { name:'Tata Consumer Products', contact:'Vijay Kumar', phone:'9111222333', email:'sales@tataconsumer.com', gst:'27AABCT3518Q1ZS', city:'Mumbai', storeId:'store-001' },
    { name:'Hindustan Unilever', contact:'Sanjay Mehta', phone:'9333444555', email:'trade@hul.com', gst:'27AAACH5350N2ZF', city:'Mumbai', storeId:'store-001' },
    { name:'Nestle India', contact:'Priti Shah', phone:'9444555666', email:'sales@nestle.in', gst:'07AAACN5312B1ZD', city:'Delhi', storeId:'store-001' },
    { name:'ITC Foods', contact:'Rekha Nair', phone:'9222333444', email:'orders@itcfoods.com', gst:'19AAACI1681G1ZK', city:'Kolkata', storeId:'store-001' },
  ]);

  // ── Demo Products ─────────────────────────────────────────
  await Product.insertMany([
    { name:'Tata Salt', sku:'TST001', category:'Staples', unit:'1 kg', price:22, cost:18, stock:145, minStock:20, barcode:'8901030123456', gst:5, supplier:suppliers[0]._id, supplierName:'Tata Consumer Products', expiry:new Date('2026-12-31'), storeId:'store-001', image:'🧂' },
    { name:'Aashirvaad Atta', sku:'AAT002', category:'Staples', unit:'5 kg', price:245, cost:210, stock:78, minStock:15, barcode:'8901030098765', gst:5, supplier:suppliers[3]._id, supplierName:'ITC Foods', expiry:new Date('2026-08-15'), storeId:'store-001', image:'🌾' },
    { name:'Amul Butter', sku:'ABT003', category:'Dairy', unit:'500g', price:252, cost:230, stock:32, minStock:10, barcode:'8901030001234', gst:12, supplierName:'Amul', expiry:new Date('2026-06-30'), storeId:'store-001', image:'🧈' },
    { name:'Surf Excel', sku:'SXL004', category:'Household', unit:'1 kg', price:185, cost:155, stock:60, minStock:20, barcode:'8901030654321', gst:18, supplier:suppliers[1]._id, supplierName:'HUL', storeId:'store-001', image:'🫧' },
    { name:'Maggi Noodles', sku:'MGN005', category:'Ready to Cook', unit:'70g', price:14, cost:11, stock:200, minStock:50, barcode:'8901030567890', gst:12, supplier:suppliers[2]._id, supplierName:'Nestle', expiry:new Date('2026-09-30'), storeId:'store-001', image:'🍜' },
    { name:'Dettol Soap', sku:'DSP006', category:'Personal Care', unit:'75g', price:48, cost:38, stock:6, minStock:15, barcode:'8901030112233', gst:18, supplier:suppliers[1]._id, supplierName:'HUL', storeId:'store-001', image:'🧼' },
    { name:'Parle-G Biscuits', sku:'PGB007', category:'Snacks', unit:'800g', price:58, cost:48, stock:95, minStock:25, barcode:'8901030445566', gst:12, supplierName:'Parle', storeId:'store-001', image:'🍪' },
    { name:'Tropicana Juice', sku:'TRJ008', category:'Beverages', unit:'1L', price:99, cost:82, stock:42, minStock:20, barcode:'8901030778899', gst:12, supplierName:'Tropicana', storeId:'store-001', image:'🧃' },
    { name:'Dettol Handwash', sku:'DHW011', category:'Personal Care', unit:'250ml', price:72, cost:58, stock:4, minStock:12, barcode:'8901030221122', gst:18, supplier:suppliers[1]._id, supplierName:'HUL', storeId:'store-001', image:'🧴' },
    { name:'Basmati Rice', sku:'BSR010', category:'Staples', unit:'5 kg', price:399, cost:340, stock:30, minStock:10, barcode:'8901030990011', gst:5, supplierName:'India Gate', storeId:'store-001', image:'🍚' },
  ]);

  // ── Demo Customers ────────────────────────────────────────
  await Customer.insertMany([
    { name:'Ramesh Gupta', phone:'9876543210', email:'ramesh@gmail.com', address:'12, MG Road, Mumbai', totalOrders:24, totalSpent:12450, loyaltyPoints:124, type:'regular', storeId:'store-001' },
    { name:'Sunita Devi', phone:'9765432109', email:'sunita@gmail.com', address:'45, Shivaji Nagar, Pune', totalOrders:56, totalSpent:34200, loyaltyPoints:342, type:'vip', storeId:'store-001' },
    { name:'Vikram Singh', phone:'9654321098', email:'vikram@gmail.com', totalOrders:8, totalSpent:4800, loyaltyPoints:48, type:'new', storeId:'store-001' },
  ]);

  console.log('✅ Demo data seeded successfully!');
  console.log('   📧 owner@nexaerp.demo / demo123 (Owner)');
  console.log('   📧 cashier@nexaerp.demo / demo123 (Cashier)');
}

// Mongoose events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting reconnect...');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

module.exports = connectDB;

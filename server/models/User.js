const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true, maxlength: 100 },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 6, select: false },
  role:         { type: String, enum: ['owner', 'manager', 'cashier', 'storekeeper', 'delivery', 'accountant'], default: 'cashier' },
  businessName: { type: String, trim: true },
  businessType: { type: String, enum: ['grocery', 'pharmacy', 'restaurant', 'hostel', 'school', 'retail'], default: 'grocery' },
  phone:        { type: String, trim: true },
  avatar:       { type: String, maxlength: 4 },
  storeId:      { type: String, required: true, default: 'store-001' },
  plan:         { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
  isActive:     { type: Boolean, default: true },
  lastLogin:    { type: Date },
  preferences: {
    theme:        { type: String, enum: ['dark', 'light', 'ocean', 'forest', 'sunset', 'system'], default: 'dark' },
    language:     { type: String, default: 'en' },
    currency:     { type: String, default: 'INR' },
    timezone:     { type: String, default: 'Asia/Kolkata' },
    notifications: {
      lowStock:   { type: Boolean, default: true },
      newOrder:   { type: Boolean, default: true },
      payment:    { type: Boolean, default: true },
      email:      { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

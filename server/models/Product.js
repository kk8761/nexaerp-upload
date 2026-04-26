const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  sku:          { type: String, trim: true, uppercase: true },
  barcode:      { type: String, trim: true },
  category:     { type: String, required: true, trim: true },
  unit:         { type: String, trim: true, default: 'pcs' },
  price:        { type: Number, required: true, min: 0 },  // Selling price
  cost:         { type: Number, required: true, min: 0 },  // Purchase cost
  stock:        { type: Number, default: 0, min: 0 },
  minStock:     { type: Number, default: 10, min: 0 },     // Reorder point
  maxStock:     { type: Number, default: 500 },
  gst:          { type: Number, default: 12, enum: [0, 5, 12, 18, 28] },
  supplier:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String, trim: true },
  expiry:       { type: Date },
  image:        { type: String, default: '📦' },           // Emoji or URL
  isActive:     { type: Boolean, default: true },
  storeId:      { type: String, required: true, default: 'store-001' },
  
  // Stock tracking
  stockHistory: [{
    date:     { type: Date, default: Date.now },
    type:     { type: String, enum: ['add', 'remove', 'sale', 'adjustment', 'return'] },
    quantity: Number,
    reason:   String,
    userId:   String,
  }],

  // Metadata
  hsn:         { type: String },  // HSN code for GST
  brand:       { type: String },
  location:    { type: String },  // Shelf/rack location
  tags:        [String],
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual: margin %
productSchema.virtual('margin').get(function () {
  if (!this.price || !this.cost) return 0;
  return Math.round(((this.price - this.cost) / this.price) * 100);
});

// Virtual: stock status
productSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.minStock) return 'low';
  return 'normal';
});

// Indexes for fast search
productSchema.index({ storeId: 1, isActive: 1 });
productSchema.index({ name: 'text', sku: 'text', barcode: 'text' });
productSchema.index({ storeId: 1, stock: 1, minStock: 1 }); // For low stock queries

module.exports = mongoose.model('Product', productSchema);

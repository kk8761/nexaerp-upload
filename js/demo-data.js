/**
 * NexaERP — Demo Data
 * Realistic sample data for all modules
 */

window.DemoData = {

  // ─── Products / Inventory ────────────────────────────────
  products: [
    { id:'p001', name:'Tata Salt', sku:'TST001', category:'Staples', unit:'1 kg', price:22, cost:18, stock:145, minStock:20, barcode:'8901030123456', gst:5, supplier:'Tata Consumer', expiry:'2026-12-31', image:'🧂' },
    { id:'p002', name:'Aashirvaad Atta', sku:'AAT002', category:'Staples', unit:'5 kg', price:245, cost:210, stock:78, minStock:15, barcode:'8901030098765', gst:5, supplier:'ITC Foods', expiry:'2026-08-15', image:'🌾' },
    { id:'p003', name:'Amul Butter', sku:'ABT003', category:'Dairy', unit:'500g', price:252, cost:230, stock:32, minStock:10, barcode:'8901030001234', gst:12, supplier:'Amul', expiry:'2026-06-30', image:'🧈' },
    { id:'p004', name:'Surf Excel', sku:'SXL004', category:'Household', unit:'1 kg', price:185, cost:155, stock:60, minStock:20, barcode:'8901030654321', gst:18, supplier:'HUL', expiry:'2027-12-31', image:'🫧' },
    { id:'p005', name:'Maggi Noodles', sku:'MGN005', category:'Ready to Cook', unit:'70g', price:14, cost:11, stock:200, minStock:50, barcode:'8901030567890', gst:12, supplier:'Nestle', expiry:'2026-09-30', image:'🍜' },
    { id:'p006', name:'Dettol Soap', sku:'DSP006', category:'Personal Care', unit:'75g', price:48, cost:38, stock:8, minStock:15, barcode:'8901030112233', gst:18, supplier:'Reckitt', expiry:'2027-03-31', image:'🧼' },
    { id:'p007', name:'Parle-G Biscuits', sku:'PGB007', category:'Snacks', unit:'800g', price:58, cost:48, stock:95, minStock:25, barcode:'8901030445566', gst:12, supplier:'Parle', expiry:'2026-11-30', image:'🍪' },
    { id:'p008', name:'Tropicana Juice', sku:'TRJ008', category:'Beverages', unit:'1L', price:99, cost:82, stock:42, minStock:20, barcode:'8901030778899', gst:12, supplier:'Tropicana', expiry:'2026-07-15', image:'🧃' },
    { id:'p009', name:'Coconut Oil', sku:'CNL009', category:'Oils & Fats', unit:'500ml', price:195, cost:165, stock:55, minStock:15, barcode:'8901030334455', gst:5, supplier:'Parachute', expiry:'2027-01-31', image:'🥥' },
    { id:'p010', name:'Basmati Rice', sku:'BSR010', category:'Staples', unit:'5 kg', price:399, cost:340, stock:30, minStock:10, barcode:'8901030990011', gst:5, supplier:'India Gate', expiry:'2026-10-31', image:'🍚' },
    { id:'p011', name:'Dettol Handwash', sku:'DHW011', category:'Personal Care', unit:'250ml', price:72, cost:58, stock:5, minStock:12, barcode:'8901030221122', gst:18, supplier:'Reckitt', expiry:'2027-06-30', image:'🧴' },
    { id:'p012', name:'Colgate Toothpaste', sku:'CGT012', category:'Personal Care', unit:'200g', price:92, cost:76, stock:48, minStock:20, barcode:'8901030667788', gst:12, supplier:'Colgate-Palmolive', expiry:'2027-12-31', image:'🪥' },
  ],

  // ─── Categories ──────────────────────────────────────────
  categories: ['Staples','Dairy','Household','Ready to Cook','Personal Care','Snacks','Beverages','Oils & Fats'],

  // ─── Orders ──────────────────────────────────────────────
  orders: [
    { id:'ORD-2401', customer:'Ramesh Gupta', items:['Tata Salt x2','Maggi Noodles x4'], total:84, status:'completed', date:'2026-04-24', payment:'cash', invoiceNo:'INV-101' },
    { id:'ORD-2402', customer:'Sunita Devi', items:['Amul Butter','Coconut Oil'], total:447, status:'completed', date:'2026-04-24', payment:'upi', invoiceNo:'INV-102' },
    { id:'ORD-2403', customer:'Walk-in Customer', items:['Parle-G Biscuits x3','Tropicana Juice x2'], total:372, status:'completed', date:'2026-04-24', payment:'upi', invoiceNo:'INV-103' },
    { id:'ORD-2404', customer:'Vikram Singh', items:['Aashirvaad Atta','Basmati Rice'], total:644, status:'pending', date:'2026-04-24', payment:'credit', invoiceNo:'INV-104' },
    { id:'ORD-2405', customer:'Priya Mehra', items:['Dettol Soap x3','Dettol Handwash x2'], total:288, status:'processing', date:'2026-04-24', payment:'card', invoiceNo:'INV-105' },
    { id:'ORD-2406', customer:'Mohit Jain', items:['Colgate Toothpaste x2','Surf Excel'], total:369, status:'completed', date:'2026-04-23', payment:'cash', invoiceNo:'INV-100' },
  ],

  // ─── Customers ───────────────────────────────────────────
  customers: [
    { id:'c001', name:'Ramesh Gupta', phone:'9876543210', email:'ramesh@gmail.com', address:'12, MG Road, Mumbai', totalOrders:24, totalSpent:12450, loyaltyPoints:124, lastVisit:'2026-04-24', type:'regular' },
    { id:'c002', name:'Sunita Devi', phone:'9765432109', email:'sunita@gmail.com', address:'45, Shivaji Nagar, Pune', totalOrders:56, totalSpent:34200, loyaltyPoints:342, lastVisit:'2026-04-24', type:'vip' },
    { id:'c003', name:'Vikram Singh', phone:'9654321098', email:'vikram@gmail.com', address:'7, Park Street, Delhi', totalOrders:8, totalSpent:4800, loyaltyPoints:48, lastVisit:'2026-04-24', type:'new' },
    { id:'c004', name:'Priya Mehra', phone:'9543210987', email:'priya@gmail.com', address:'23, Anna Nagar, Chennai', totalOrders:33, totalSpent:19500, loyaltyPoints:195, lastVisit:'2026-04-23', type:'regular' },
    { id:'c005', name:'Mohit Jain', phone:'9432109876', email:'mohit@gmail.com', address:'56, Brigade Road, Bangalore', totalOrders:17, totalSpent:9800, loyaltyPoints:98, lastVisit:'2026-04-23', type:'regular' },
  ],

  // ─── Staff / Employees ────────────────────────────────────
  staff: [
    { id:'s001', name:'Priya Patel', role:'cashier', dept:'Operations', salary:18000, phone:'9999888877', email:'priya.p@store.com', joinDate:'2024-01-15', status:'active', attendance:96, avatar:'PP' },
    { id:'s002', name:'Rahul Kumar', role:'manager', dept:'Management', salary:35000, phone:'9888777766', email:'rahul.k@store.com', joinDate:'2023-06-01', status:'active', attendance:98, avatar:'RK' },
    { id:'s003', name:'Anita Sharma', role:'storekeeper', dept:'Inventory', salary:16000, phone:'9777666655', email:'anita.s@store.com', joinDate:'2024-05-20', status:'active', attendance:92, avatar:'AS' },
    { id:'s004', name:'Deepak Rao', role:'delivery', dept:'Logistics', salary:14000, phone:'9666555544', email:'deepak.r@store.com', joinDate:'2025-01-10', status:'active', attendance:88, avatar:'DR' },
  ],

  // ─── Suppliers ────────────────────────────────────────────
  suppliers: [
    { id:'sup001', name:'Tata Consumer Products', contact:'Mr. Vijay', phone:'9111222333', email:'sales@tataconsumer.com', gst:'27AABCT3518Q1ZS', city:'Mumbai', products:12, outstanding:8500, lastOrder:'2026-04-20', status:'active' },
    { id:'sup002', name:'ITC Foods Limited', contact:'Ms. Rekha', phone:'9222333444', email:'orders@itcfoods.com', gst:'19AAACI1681G1ZK', city:'Kolkata', products:8, outstanding:0, lastOrder:'2026-04-18', status:'active' },
    { id:'sup003', name:'Hindustan Unilever', contact:'Mr. Sanjay', phone:'9333444555', email:'trade@hul.com', gst:'27AAACH5350N2ZF', city:'Mumbai', products:25, outstanding:15200, lastOrder:'2026-04-22', status:'active' },
    { id:'sup004', name:'Nestle India', contact:'Ms. Priti', phone:'9444555666', email:'sales@nestle.in', gst:'07AAACN5312B1ZD', city:'Delhi', products:6, outstanding:3400, lastOrder:'2026-04-19', status:'active' },
  ],

  // ─── Transactions (Accounting) ────────────────────────────
  transactions: [
    { id:'T001', date:'2026-04-24', type:'income', category:'Sales', description:'POS Sales — Morning shift', amount:8420, ref:'INV-101 to INV-110' },
    { id:'T002', date:'2026-04-24', type:'expense', category:'Purchase', description:'Stock purchase — ITC Foods', amount:18500, ref:'PO-2024' },
    { id:'T003', date:'2026-04-23', type:'income', category:'Sales', description:'POS Sales — Full day', amount:22450, ref:'INV-090 to INV-100' },
    { id:'T004', date:'2026-04-23', type:'expense', category:'Utilities', description:'Electricity bill — April', amount:3200, ref:'BILL-ELEC-04' },
    { id:'T005', date:'2026-04-22', type:'income', category:'Sales', description:'POS Sales — Full day', amount:19800, ref:'INV-075 to INV-089' },
    { id:'T006', date:'2026-04-22', type:'expense', category:'Rent', description:'Monthly shop rent', amount:25000, ref:'RENT-04' },
    { id:'T007', date:'2026-04-21', type:'income', category:'Sales', description:'POS Sales — Full day', amount:24100, ref:'INV-060 to INV-074' },
    { id:'T008', date:'2026-04-21', type:'expense', category:'Salary', description:'Staff salaries advance', amount:40000, ref:'SAL-ADV-04' },
  ],

  // ─── Sales Trend (last 7 days) ────────────────────────────
  salesTrend: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data:   [18200, 22450, 19800, 24100, 21300, 28500, 8420]
  },

  // ─── Category Sales Distribution ──────────────────────────
  categorySales: [
    { category: 'Staples',       value: 35 },
    { category: 'Dairy',         value: 18 },
    { category: 'Personal Care', value: 22 },
    { category: 'Snacks',        value: 12 },
    { category: 'Others',        value: 13 },
  ],

  // ─── Notifications ────────────────────────────────────────
  notifications: [
    { id:'n001', type:'warning', title:'Low Stock Alert', message:'Dettol Soap (6 units) is below reorder point (15 units)', time: new Date(Date.now()-300000), read: false, icon:'📦' },
    { id:'n002', type:'success', title:'New Order Received', message:'Order ORD-2405 placed by Priya Mehra — ₹288', time: new Date(Date.now()-900000), read: false, icon:'🛍️' },
    { id:'n003', type:'warning', title:'Low Stock Alert', message:'Dettol Handwash (5 units) is below reorder point', time: new Date(Date.now()-1800000), read: false, icon:'📦' },
    { id:'n004', type:'info', title:'Daily Summary Ready', message:'Your sales report for April 23 is ready to view', time: new Date(Date.now()-7200000), read: false, icon:'📊' },
    { id:'n005', type:'info', title:'Supplier Payment Due', message:'Payment of ₹8,500 to Tata Consumer Products is due in 3 days', time: new Date(Date.now()-86400000), read: true, icon:'💳' },
  ],

  // ─── KPIs ─────────────────────────────────────────────────
  kpis: {
    todaySales:       { value: 8420,  delta: +12.4, label: "Today's Sales" },
    todayOrders:      { value: 47,    delta: +8.2,  label: "Today's Orders" },
    lowStockItems:    { value: 3,     delta: 0,     label: "Low Stock Alerts" },
    monthlyRevenue:   { value: 142800,delta: +18.7, label: "Monthly Revenue" },
    totalCustomers:   { value: 1284,  delta: +5.2,  label: "Total Customers" },
    avgOrderValue:    { value: 179,   delta: +3.8,  label: "Avg Order Value" },
    outstandingPayable:{ value:27100, delta: 0,     label: "Payable to Suppliers" },
    grossMargin:      { value: 21.4,  delta: +0.8,  label: "Gross Margin %" },
  },

  // ─── AI Responses ─────────────────────────────────────────
  aiResponses: {
    default: "Based on your business data, I can help you with sales trends, inventory insights, and smart reorder suggestions. What would you like to know? 📊",
    sales: "Your sales are up 18.7% this month compared to last month. Best selling days are Saturday (₹28,500 avg) and Friday (₹21,300 avg). Best selling category is Staples at 35% of revenue. 📈",
    inventory: "You have 3 items needing reorder: Dettol Soap (6 units), Dettol Handwash (5 units), and Coconut Oil approaching minimum. I recommend placing a purchase order for ₹4,200 today. 📦",
    forecast: "Based on 30-day patterns, expect sales of ~₹24,000-26,000 tomorrow (Thursday). Weekend (Sat-Sun) typically sees 30% higher footfall. Consider stocking up on Staples and Beverages. 🔮",
    profit: "This month's gross margin is 21.4%. Your most profitable category is Personal Care (28% margin). Least profitable is Staples (14.5% margin). Consider optimizing Staples purchasing. 💰",
  }
};

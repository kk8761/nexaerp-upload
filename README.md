# NexaERP

**Production-grade SaaS ERP platform for small businesses**

[![Netlify Status](https://api.netlify.com/api/v1/badges/nexaerp/deploy-status)](https://app.netlify.com/sites/nexaerp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🚀 Live Demo
> **[https://nexaerp.netlify.app](https://nexaerp.netlify.app)**

**Demo Credentials** — Click "Try as Store Owner" or "Try as Cashier" on the login page.

---

## ✨ Overview

NexaERP is a free, investor-grade SaaS ERP platform built for modern small businesses. Starting with grocery stores and expandable to pharmacies, restaurants, hostels, and schools.

### 🎯 Supported Business Types
| Business | Status |
|---|---|
| 🛒 Grocery Store | ✅ Full support |
| 💊 Pharmacy | 🟡 Module ready |
| 🍽️ Restaurant | 🟡 Module ready |
| 🏨 Hostel / Hotel | 🟡 Module ready |
| 🎓 School | 🔮 Roadmap |

---

## 📦 Feature Modules

| Module | Description |
|---|---|
| 🏠 **Dashboard** | Real-time KPIs, revenue charts, alerts |
| 🧾 **POS / Billing** | Touch-friendly point-of-sale with GST invoice |
| 📦 **Inventory** | Full CRUD, barcode scan, stock alerts |
| 🛍️ **Orders** | Sales and purchase order management |
| 💰 **Accounting** | Income/expense ledger, P&L |
| 👥 **Customers** | CRM with loyalty points |
| 👨‍💼 **Staff** | Employee management |
| 💸 **Payroll** | Salary slip with PF deductions |
| 🚛 **Suppliers** | Vendor management and PO |
| 📊 **Analytics** | Revenue trends, category breakdown |
| 📋 **Reports** | GST, P&L, inventory, sales exports |
| 🔔 **Notifications** | Smart alerts for stock, orders, payments |
| ⚙️ **Settings** | Business profile, roles, tax config |
| ✨ **AI Assistant** | Natural language business insights |

---

## 🏗️ Architecture

```
NexaERP/
├── index.html           # Auth / Login page
├── dashboard.html       # Main app shell (all modules)
├── css/
│   ├── design-system.css  # Design tokens, components
│   ├── auth.css           # Login/register styles  
│   ├── dashboard.css      # Layout, sidebar, POS
│   └── modules.css        # Module-specific styles
├── js/
│   ├── utils.js           # Shared utilities (HTTP, format, toast)
│   ├── auth.js            # Authentication module
│   ├── demo-data.js       # Realistic demo datasets
│   ├── dashboard.js       # Dashboard + router + AI
│   ├── inventory.js       # Inventory CRUD
│   ├── pos.js             # POS / Billing engine
│   └── modules.js         # All other modules
└── assets/
    └── favicon.svg
```

### Tech Stack
- **Frontend**: Vanilla HTML5 / CSS3 / ES6+ JavaScript
- **Design**: Custom design system with CSS variables (dark mode)
- **Fonts**: Google Fonts — Inter + Space Grotesk
- **Deployment**: Netlify (static hosting)
- **Backend-ready**: JWT auth, REST API client, offline-capable

---

## 🎨 Design System

- **Color**: Indigo-Violet brand with semantic danger/success/warning tokens
- **Typography**: Inter (body), Space Grotesk (display)
- **Glassmorphism**: Backdrop blur on panels and auth page
- **Dark Mode**: Full dark UI by default
- **Micro-animations**: Page transitions, hover states, loading states

---

## 🛡️ Security Features

- JWT-based authentication with token validation
- Input validation and sanitization on all forms  
- XSS prevention (no innerHTML with user data)
- Role-based access: Owner, Manager, Cashier
- Session expiry handling

---

## 🚀 Backend Architecture (Production)

When connecting a real backend:

### Recommended Stack
```
Backend: Node.js + Express
Database: PostgreSQL + Prisma ORM
Caching: Redis
Auth: JWT + bcrypt
File Storage: AWS S3 / Firebase Storage
Search: ElasticSearch (inventory)
Queue: Bull (notifications, reports)
```

### API Endpoints
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password

GET  /api/products           
POST /api/products           
PUT  /api/products/:id       
DELETE /api/products/:id     

GET  /api/orders             
POST /api/orders             
GET  /api/orders/:id         

GET  /api/customers          
POST /api/customers          

GET  /api/staff              
GET  /api/payroll            

GET  /api/reports/sales      
GET  /api/reports/gst        
GET  /api/reports/inventory  
```

---

## 📱 Mobile App

Mobile app planned with React Native:

```
mobile/
├── App.tsx
├── src/
│   ├── screens/
│   │   ├── Dashboard.tsx
│   │   ├── POS.tsx
│   │   ├── Inventory.tsx
│   │   └── Reports.tsx
│   └── components/
```

---

## 🗺️ Roadmap

### ✅ Phase 1 — MVP (Current)
- Authentication (login/register/demo)
- Dashboard with KPIs and charts
- Inventory management (full CRUD)
- POS / Billing with GST
- Customer and staff management
- Payroll calculator
- Accounting ledger
- Reports with CSV export

### 🚧 Phase 2 — Growth
- [ ] Firebase backend integration
- [ ] Barcode camera scanner
- [ ] WhatsApp invoice delivery
- [ ] Offline mode (PWA)
- [ ] Multi-store management
- [ ] Purchase orders workflow
- [ ] AI demand forecasting

### 🔮 Phase 3 — Enterprise
- [ ] Multi-tenant SaaS
- [ ] Subscription billing
- [ ] Native mobile app (React Native)
- [ ] Advanced analytics
- [ ] API integrations (Tally, Razorpay)
- [ ] B2B marketplace

---

## 🚀 Local Development

```bash
# No build step needed — pure HTML/CSS/JS
# Open index.html directly or use a local server:

npx serve .
# or
python -m http.server 8080
```

---

## 📦 Deployment

### Netlify (Recommended)
1. Push to GitHub
2. Connect repo to Netlify
3. Build command: (none)
4. Publish directory: `./`
5. Deploy!

---

## 📄 License

MIT License — Free to use and modify

---

**Built with ❤️ by the NexaERP team · Powered by NexaERP**

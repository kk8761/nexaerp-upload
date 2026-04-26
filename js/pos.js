/**
 * NexaERP — POS / Billing Module
 * Full point-of-sale with cart, billing, GST, payment modes
 */

let cart = [];
let posTaxRate = 0;
let posCustomer = null;
let posDiscount = 0;

function renderPOS() {
  document.getElementById('page-body').innerHTML = `
    <div class="pos-layout" style="height:calc(100vh - var(--header-height) - var(--space-12))">

      <!-- Product Search & Grid -->
      <div style="display:flex;flex-direction:column;gap:var(--space-4);overflow:hidden">

        <!-- Quick Search -->
        <div style="display:flex;gap:var(--space-3)">
          <div class="search-bar" style="flex:1">
            <span class="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input type="text" class="form-input" id="pos-search" placeholder="Search products or scan barcode..." oninput="filterPOSProducts()" />
          </div>
          <select class="form-select" id="pos-category" style="width:160px" onchange="filterPOSProducts()">
            <option value="">All Categories</option>
            ${DemoData.categories.map(c=>`<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>

        <!-- Category Pills -->
        <div style="display:flex;gap:var(--space-2);overflow-x:auto;padding-bottom:4px;flex-shrink:0">
          <button class="btn btn-primary btn-sm" onclick="filterPOSCategory('')">All</button>
          ${DemoData.categories.map(c => `
            <button class="btn btn-secondary btn-sm" onclick="filterPOSCategory('${c}')" style="white-space:nowrap">${c}</button>
          `).join('')}
        </div>

        <!-- Product Grid -->
        <div class="product-grid" id="pos-product-grid">
          ${renderPOSProductGrid()}
        </div>
      </div>

      <!-- Cart Panel -->
      <div class="cart-panel">
        <div class="cart-header">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
            <div style="font-weight:700;font-size:var(--text-base)">🛒 Cart <span class="badge badge-primary" id="cart-count">0</span></div>
            <button class="btn btn-sm btn-ghost" style="color:var(--color-danger-400)" onclick="clearCart()">Clear All</button>
          </div>
          <!-- Customer Select -->
          <div style="display:flex;gap:var(--space-2)">
            <select class="form-select" id="pos-customer" style="font-size:var(--text-xs)" onchange="setCustomer(this.value)">
              <option value="">👤 Walk-in Customer</option>
              ${DemoData.customers.map(c=>`<option value="${c.id}">${c.name} · ${c.phone}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-secondary" onclick="newCustomerQuick()" title="Add new customer">+</button>
          </div>
        </div>

        <!-- Cart Items -->
        <div class="cart-items" id="cart-items">
          <div id="cart-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:var(--color-text-tertiary)">
            <div style="font-size:48px;margin-bottom:var(--space-3)">🛒</div>
            <div style="font-size:var(--text-sm);text-align:center">Add products to start billing</div>
          </div>
          <div id="cart-list"></div>
        </div>

        <!-- Cart Summary -->
        <div class="cart-summary">
          <!-- Discount -->
          <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4)">
            <input type="number" id="pos-discount" class="form-input" style="font-size:var(--text-xs)" placeholder="Discount %" min="0" max="100" step="0.5" onchange="updateCartTotals()" />
            <select class="form-select" id="pos-discount-type" style="font-size:var(--text-xs);width:auto" onchange="updateCartTotals()">
              <option value="percent">% Disc</option>
              <option value="flat">₹ Flat</option>
            </select>
          </div>

          <!-- Summary Lines -->
          <div class="summary-row">
            <span>Subtotal</span>
            <span id="pos-subtotal">₹0.00</span>
          </div>
          <div class="summary-row">
            <span>Discount</span>
            <span id="pos-discount-val" style="color:var(--color-success-400)">-₹0.00</span>
          </div>
          <div class="summary-row">
            <span>GST</span>
            <span id="pos-tax">₹0.00</span>
          </div>
          <div class="summary-total">
            <span>Total</span>
            <span id="pos-total" style="background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">₹0.00</span>
          </div>

          <!-- Payment Modes -->
          <div style="margin-top:var(--space-4);margin-bottom:var(--space-4)">
            <div style="font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-secondary);margin-bottom:var(--space-2)">Payment Method</div>
            <div style="display:flex;gap:var(--space-2)">
              ${['Cash','UPI','Card','Credit'].map(mode => `
                <button class="btn btn-sm ${mode==='Cash'?'btn-primary':'btn-secondary'} payment-mode-btn" data-mode="${mode.toLowerCase()}" onclick="selectPaymentMode(this)">
                  ${{Cash:'💵',UPI:'📱',Card:'💳',Credit:'📋'}[mode]} ${mode}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Checkout Button -->
          <button class="btn btn-primary btn-full btn-lg" id="checkout-btn" onclick="processCheckout()" style="font-size:var(--text-base);letter-spacing:0.01em">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            Checkout — <span id="btn-total">₹0.00</span>
          </button>
          <button class="btn btn-ghost btn-full" style="margin-top:var(--space-2)" onclick="holdOrder()">⏸ Hold Order</button>
        </div>
      </div>
    </div>
  `;

  cart = [];
  updateCartDisplay();
}

function renderPOSProductGrid(filterCategory = '', search = '') {
  let products = DemoData.products;
  if (filterCategory) products = products.filter(p => p.category === filterCategory);
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return products.map(p => `
    <div class="product-tile" onclick="addToCart('${p.id}')" tabindex="0" role="button"
         onkeydown="if(event.key==='Enter')addToCart('${p.id}')"
         title="${p.name} — ${Format.currency(p.price)} — Stock: ${p.stock}">
      <div class="product-tile-icon">${p.image}</div>
      <div class="product-tile-name">${p.name}</div>
      <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">${p.unit}</div>
      <div class="product-tile-price">${Format.currency(p.price)}</div>
      ${p.stock <= p.minStock ? `<div class="badge badge-warning" style="font-size:9px;margin-top:4px">Low Stock</div>` : ''}
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--color-text-secondary)">No products found</div>';
}

function filterPOSProducts() {
  const search = document.getElementById('pos-search')?.value || '';
  const cat    = document.getElementById('pos-category')?.value || '';
  document.getElementById('pos-product-grid').innerHTML = renderPOSProductGrid(cat, search);
}

function filterPOSCategory(cat) {
  const catSelect = document.getElementById('pos-category');
  if (catSelect) catSelect.value = cat;
  document.getElementById('pos-product-grid').innerHTML = renderPOSProductGrid(cat);
}

function addToCart(productId) {
  const product = DemoData.products.find(p => p.id === productId);
  if (!product) return;
  if (product.stock === 0) { Toast.error(`${product.name} is out of stock!`); return; }

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) { Toast.warning('Cannot add more than available stock'); return; }
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  updateCartDisplay();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  updateCartDisplay();
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  } else {
    const product = DemoData.products.find(p => p.id === productId);
    if (product && item.qty > product.stock) {
      item.qty = product.stock;
      Toast.warning('Cannot exceed available stock');
    }
  }
  updateCartDisplay();
}

function clearCart() {
  cart = [];
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartList  = document.getElementById('cart-list');
  const cartEmpty = document.getElementById('cart-empty');
  const countBadge = document.getElementById('cart-count');

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  if (countBadge) countBadge.textContent = totalItems;

  if (!cart.length) {
    if (cartEmpty) cartEmpty.style.display = 'flex';
    if (cartList)  cartList.innerHTML = '';
  } else {
    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartList) {
      cartList.innerHTML = cart.map(item => `
        <div class="cart-item">
          <span style="font-size:20px">${item.image}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:var(--text-xs);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${Format.currency(item.price)} each</div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
            <span style="font-size:var(--text-sm);font-weight:700;min-width:20px;text-align:center">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
          </div>
          <div style="font-weight:700;font-size:var(--text-sm);min-width:60px;text-align:right">${Format.currency(item.price * item.qty)}</div>
          <button class="btn btn-icon btn-ghost" onclick="removeFromCart('${item.id}')" style="color:var(--color-danger-400)">×</button>
        </div>
      `).join('');
    }
  }

  updateCartTotals();
}

function updateCartTotals() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountInput = parseFloat(document.getElementById('pos-discount')?.value || 0);
  const discountType  = document.getElementById('pos-discount-type')?.value || 'percent';
  const discountAmt   = discountType === 'percent' ? (subtotal * discountInput / 100) : discountInput;

  const taxableAmt = subtotal - discountAmt;
  const gstAmt = cart.reduce((s, i) => s + (i.price * i.qty * i.gst / 100), 0);
  const total = taxableAmt + gstAmt;

  DOM.setText('#pos-subtotal', Format.currency(subtotal));
  DOM.setText('#pos-discount-val', `-${Format.currency(discountAmt)}`);
  DOM.setText('#pos-tax', Format.currency(gstAmt));
  DOM.setText('#pos-total', Format.currency(total));
  DOM.setText('#btn-total', Format.currency(total));
}

let selectedPaymentMode = 'cash';

function selectPaymentMode(btn) {
  document.querySelectorAll('.payment-mode-btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-secondary');
  });
  btn.classList.remove('btn-secondary');
  btn.classList.add('btn-primary');
  selectedPaymentMode = btn.dataset.mode;
}

function setCustomer(id) {
  posCustomer = DemoData.customers.find(c => c.id === id) || null;
}

function newCustomerQuick() {
  Modal.create({
    title: 'Quick Add Customer',
    body: `
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input type="text" id="qc-name" class="form-input" placeholder="Customer name" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input type="tel" id="qc-phone" class="form-input" placeholder="+91 9876543210" />
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveQuickCustomer()">Add & Select</button>
    `
  });
}

function saveQuickCustomer() {
  const name  = document.getElementById('qc-name')?.value?.trim();
  const phone = document.getElementById('qc-phone')?.value?.trim();
  if (!name) { Toast.error('Customer name is required'); return; }

  const newCustomer = {
    id: generateId(), name, phone,
    email: '', totalOrders: 0, totalSpent: 0, loyaltyPoints: 0,
    lastVisit: new Date().toISOString().split('T')[0], type: 'new'
  };
  DemoData.customers.push(newCustomer);

  const sel = document.getElementById('pos-customer');
  if (sel) {
    const opt = document.createElement('option');
    opt.value = newCustomer.id;
    opt.textContent = `${name} · ${phone}`;
    opt.selected = true;
    sel.appendChild(opt);
  }
  posCustomer = newCustomer;
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success(`Customer ${name} added!`);
}

function processCheckout() {
  if (!cart.length) { Toast.error('Cart is empty. Add products first.'); return; }

  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountInput = parseFloat(document.getElementById('pos-discount')?.value || 0);
  const discountType  = document.getElementById('pos-discount-type')?.value || 'percent';
  const discountAmt   = discountType === 'percent' ? (subtotal * discountInput / 100) : discountInput;
  const gstAmt  = cart.reduce((s, i) => s + (i.price * i.qty * i.gst / 100), 0);
  const total   = subtotal - discountAmt + gstAmt;
  const invNo   = `INV-${Date.now().toString().slice(-6)}`;

  // Generate Invoice
  showInvoice({
    invoiceNo: invNo,
    date: new Date().toLocaleDateString('en-IN', { year:'numeric',month:'long',day:'numeric' }),
    customer: posCustomer || { name: 'Walk-in Customer', phone: '' },
    items: cart,
    subtotal, discountAmt, gstAmt, total,
    paymentMode: selectedPaymentMode,
    business: Auth.getUser()?.business || 'My Business',
    cashier: Auth.getUser()?.name || 'Cashier',
  });

  // Deduct stock (in demo mode)
  cart.forEach(item => {
    const pidx = DemoData.products.findIndex(p => p.id === item.id);
    if (pidx > -1) DemoData.products[pidx].stock -= item.qty;
  });

  // Update customer stats
  if (posCustomer) {
    const cidx = DemoData.customers.findIndex(c => c.id === posCustomer.id);
    if (cidx > -1) {
      DemoData.customers[cidx].totalOrders++;
      DemoData.customers[cidx].totalSpent += total;
      DemoData.customers[cidx].loyaltyPoints += Math.floor(total / 100);
      DemoData.customers[cidx].lastVisit = new Date().toISOString().split('T')[0];
    }
  }

  // Add to orders
  DemoData.orders.unshift({
    id: `ORD-${Date.now().toString().slice(-4)}`,
    customer: posCustomer?.name || 'Walk-in Customer',
    items: cart.map(i => `${i.name} x${i.qty}`),
    total, status: 'completed',
    date: new Date().toISOString().split('T')[0],
    payment: selectedPaymentMode,
    invoiceNo: invNo
  });

  cart = [];
  posCustomer = null;
  document.getElementById('pos-customer').value = '';
  updateCartDisplay();
}

function showInvoice(data) {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #333">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;text-align:center">${item.unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;text-align:center">${item.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;text-align:right">₹${item.price.toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;text-align:center">${item.gst}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;text-align:right">₹${(item.price * item.qty).toFixed(2)}</td>
    </tr>
  `).join('');

  Modal.create({
    title: `Invoice ${data.invoiceNo}`,
    size: '',
    body: `
      <div id="invoice-print-area" style="background:#fff;color:#111;padding:24px;border-radius:8px;font-family:Arial,sans-serif">
        <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #6366f1;padding-bottom:16px">
          <div style="font-size:24px;font-weight:800;color:#6366f1">NexaERP</div>
          <div style="font-size:16px;font-weight:700;margin-top:4px">${data.business}</div>
          <div style="font-size:12px;color:#555">GSTIN: 27AABCN1234Z1ZI</div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px">
          <div>
            <div><strong>Invoice:</strong> ${data.invoiceNo}</div>
            <div><strong>Date:</strong> ${data.date}</div>
            <div><strong>Payment:</strong> ${data.paymentMode.toUpperCase()}</div>
            <div><strong>Cashier:</strong> ${data.cashier}</div>
          </div>
          <div style="text-align:right">
            <div><strong>Customer:</strong> ${data.customer.name}</div>
            ${data.customer.phone ? `<div>${data.customer.phone}</div>` : ''}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
          <thead>
            <tr style="background:#f0f0f0">
              <th style="padding:8px 12px;text-align:left">Item</th>
              <th style="padding:8px 12px;text-align:center">Unit</th>
              <th style="padding:8px 12px;text-align:center">Qty</th>
              <th style="padding:8px 12px;text-align:right">Rate</th>
              <th style="padding:8px 12px;text-align:center">GST</th>
              <th style="padding:8px 12px;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align:right;font-size:13px">
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:4px">
            <span style="color:#555">Subtotal:</span>
            <span style="min-width:80px">₹${data.subtotal.toFixed(2)}</span>
          </div>
          ${data.discountAmt > 0 ? `
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:4px;color:#059669">
            <span>Discount:</span>
            <span style="min-width:80px">-₹${data.discountAmt.toFixed(2)}</span>
          </div>` : ''}
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:4px">
            <span style="color:#555">GST:</span>
            <span style="min-width:80px">₹${data.gstAmt.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;border-top:2px solid #6366f1;margin-top:8px;padding-top:8px;font-size:16px;font-weight:800">
            <span>TOTAL:</span>
            <span style="color:#6366f1;min-width:80px">₹${data.total.toFixed(2)}</span>
          </div>
        </div>
        <div style="text-align:center;margin-top:20px;font-size:11px;color:#777;border-top:1px solid #eee;padding-top:12px">
          Thank you for shopping with us! · Powered by NexaERP
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Close</button>
      <button class="btn btn-secondary" onclick="printElement(document.getElementById('invoice-print-area'))">🖨️ Print</button>
      <button class="btn btn-primary" onclick="Toast.success('Invoice sent via WhatsApp!');document.querySelector('.modal-backdrop').remove()">📱 WhatsApp</button>
    `
  });
}

function holdOrder() {
  if (!cart.length) { Toast.error('No items in cart to hold'); return; }
  Toast.info('Order held. You can resume from the Orders module.');
  cart = [];
  updateCartDisplay();
}

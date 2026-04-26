/**
 * NexaERP — Inventory Module
 * Full CRUD for products with search, filter, barcode, categories
 */

let inventoryProducts = [];
let inventoryFilter = { search: '', category: '', status: '' };

function renderInventory() {
  inventoryProducts = [...DemoData.products];

  document.getElementById('page-body').innerHTML = `
    <!-- Stats Row -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
      ${[
        { label:'Total Products', value: DemoData.products.length, icon:'📦', color:'rgba(99,102,241,0.15)' },
        { label:'Low Stock Items', value: DemoData.products.filter(p=>p.stock<=p.minStock).length, icon:'⚠️', color:'rgba(239,68,68,0.15)' },
        { label:'Total Stock Value', value: Format.currency(DemoData.products.reduce((s,p)=>s+(p.cost*p.stock),0)), icon:'💰', color:'rgba(34,197,94,0.15)' },
        { label:'Categories', value: DemoData.categories.length, icon:'🏷️', color:'rgba(168,85,247,0.15)' },
      ].map(s => `
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-1)">${s.label}</div>
              <div style="font-size:var(--text-2xl);font-weight:700;margin-top:4px">${s.value}</div>
            </div>
            <div style="width:44px;height:44px;border-radius:var(--radius-xl);background:${s.color};display:flex;align-items:center;justify-content:center;font-size:22px">${s.icon}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Toolbar -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-5)">
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;flex:1">
        <div class="search-bar" style="min-width:280px">
          <span class="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input type="search" class="form-input" id="inv-search" placeholder="Search by name, SKU, barcode..." oninput="filterInventory()" />
        </div>
        <select class="form-select" id="inv-category" style="width:175px" onchange="filterInventory()">
          <option value="">All Categories</option>
          ${DemoData.categories.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
        <select class="form-select" id="inv-status" style="width:155px" onchange="filterInventory()">
          <option value="">All Status</option>
          <option value="low">Low Stock</option>
          <option value="normal">Normal</option>
          <option value="outofstock">Out of Stock</option>
        </select>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="exportInventory()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
        <button class="btn btn-secondary" onclick="openBarcodeScanner()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9V5a2 2 0 012-2h4M9 21H5a2 2 0 01-2-2v-4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4"/><line x1="7" y1="12" x2="7" y2="12.01"/><line x1="12" y1="7" x2="12" y2="7.01"/><line x1="17" y1="12" x2="17" y2="12.01"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>
          Scan Barcode
        </button>
        <button class="btn btn-primary" id="add-product-btn" onclick="openProductModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>
    </div>

    <!-- Products Table -->
    <div class="panel-card">
      <div style="overflow-x:auto">
        <table class="data-table" id="inv-table">
          <thead>
            <tr>
              <th style="width:40px"><input type="checkbox" id="select-all-inv" onchange="toggleAllProducts(this.checked)" /></th>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Unit Price</th>
              <th>Cost Price</th>
              <th>GST</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="inv-table-body">
          </tbody>
        </table>
      </div>
      <div id="inv-empty" style="display:none;text-align:center;padding:var(--space-12);color:var(--color-text-secondary)">
        <div style="font-size:48px;margin-bottom:var(--space-4)">📭</div>
        <div style="font-weight:600;margin-bottom:var(--space-2)">No products found</div>
        <div style="font-size:var(--text-sm)">Try adjusting your search or filters</div>
      </div>
    </div>

    <!-- Bulk Actions (hidden by default) -->
    <div id="bulk-actions" style="display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--color-bg-elevated);border:1px solid var(--color-border-brand);border-radius:var(--radius-2xl);padding:var(--space-4) var(--space-6);display:none;align-items:center;gap:var(--space-4);box-shadow:var(--shadow-2xl);z-index:100">
      <span id="selected-count" style="font-size:var(--text-sm);font-weight:600"></span>
      <button class="btn btn-sm btn-secondary" onclick="bulkUpdateStock()">Update Stock</button>
      <button class="btn btn-sm btn-danger" onclick="bulkDelete()">Delete</button>
      <button class="btn btn-sm btn-ghost" onclick="clearSelection()">Cancel</button>
    </div>
  `;

  renderInventoryTable();
}

function renderInventoryTable() {
  const search = document.getElementById('inv-search')?.value?.toLowerCase() || '';
  const category = document.getElementById('inv-category')?.value || '';
  const status = document.getElementById('inv-status')?.value || '';

  let filtered = DemoData.products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search) ||
      p.sku.toLowerCase().includes(search) ||
      p.barcode.includes(search);
    const matchCat = !category || p.category === category;
    const matchStatus =
      !status ||
      (status === 'low' && p.stock <= p.minStock) ||
      (status === 'outofstock' && p.stock === 0) ||
      (status === 'normal' && p.stock > p.minStock);
    return matchSearch && matchCat && matchStatus;
  });

  const tbody = document.getElementById('inv-table-body');
  const empty = document.getElementById('inv-empty');

  if (!filtered.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filtered.map(p => {
    const stockStatus = p.stock === 0 ? 'outofstock' : p.stock <= p.minStock ? 'low' : 'normal';
    const statusBadge = {
      outofstock: '<span class="badge badge-danger">Out of Stock</span>',
      low:        '<span class="badge badge-warning">Low Stock</span>',
      normal:     '<span class="badge badge-success">In Stock</span>',
    }[stockStatus];

    return `
      <tr>
        <td><input type="checkbox" class="product-checkbox" data-id="${p.id}" onchange="updateSelection()" /></td>
        <td>
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <span style="font-size:24px">${p.image}</span>
            <div>
              <div style="font-weight:600;font-size:var(--text-sm)">${p.name}</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${p.supplier}</div>
            </div>
          </div>
        </td>
        <td><code style="font-size:var(--text-xs);background:var(--color-bg-elevated);padding:2px 6px;border-radius:4px">${p.sku}</code></td>
        <td><span class="chip">${p.category}</span></td>
        <td>
          <div style="font-weight:600;${stockStatus==='low'?'color:var(--color-warning-400)':stockStatus==='outofstock'?'color:var(--color-danger-400)':''}">${p.stock} ${p.unit}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary)">Min: ${p.minStock}</div>
        </td>
        <td style="font-weight:600">${Format.currency(p.price)}</td>
        <td style="color:var(--color-text-secondary)">${Format.currency(p.cost)}</td>
        <td><span class="badge badge-info">${p.gst}%</span></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:var(--space-1)">
            <button class="btn btn-icon btn-ghost" onclick="viewProduct('${p.id}')" title="View">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost" onclick="openProductModal('${p.id}')" title="Edit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost" onclick="quickAdjustStock('${p.id}')" title="Adjust Stock" style="color:var(--color-brand-400)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost" onclick="deleteProduct('${p.id}')" title="Delete" style="color:var(--color-danger-400)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterInventory() {
  renderInventoryTable();
}

function openProductModal(productId = null) {
  const product = productId ? DemoData.products.find(p => p.id === productId) : null;
  const isEdit = !!product;

  Modal.create({
    title: isEdit ? `Edit — ${product.name}` : 'Add New Product',
    size: 'modal-large',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Product Name *</label>
          <input type="text" id="p-name" class="form-input" value="${product?.name||''}" placeholder="e.g. Tata Salt 1kg" required />
        </div>
        <div class="form-group">
          <label class="form-label">SKU</label>
          <input type="text" id="p-sku" class="form-input" value="${product?.sku||''}" placeholder="AUTO-GENERATED" />
        </div>
        <div class="form-group">
          <label class="form-label">Category *</label>
          <select id="p-category" class="form-select">
            ${DemoData.categories.map(c=>`<option value="${c}" ${product?.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Unit</label>
          <input type="text" id="p-unit" class="form-input" value="${product?.unit||''}" placeholder="e.g. 1 kg, 500ml" />
        </div>
        <div class="form-group">
          <label class="form-label">Selling Price (₹) *</label>
          <input type="number" id="p-price" class="form-input" value="${product?.price||''}" min="0" step="0.01" required />
        </div>
        <div class="form-group">
          <label class="form-label">Cost Price (₹) *</label>
          <input type="number" id="p-cost" class="form-input" value="${product?.cost||''}" min="0" step="0.01" required />
        </div>
        <div class="form-group">
          <label class="form-label">Current Stock</label>
          <input type="number" id="p-stock" class="form-input" value="${product?.stock||0}" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Minimum Stock (Reorder Point)</label>
          <input type="number" id="p-minstock" class="form-input" value="${product?.minStock||10}" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">GST Rate (%)</label>
          <select id="p-gst" class="form-select">
            ${[0,5,12,18,28].map(g=>`<option value="${g}" ${product?.gst===g?'selected':''}>${g}%</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Barcode</label>
          <input type="text" id="p-barcode" class="form-input" value="${product?.barcode||''}" placeholder="Scan or enter barcode" />
        </div>
        <div class="form-group">
          <label class="form-label">Supplier</label>
          <select id="p-supplier" class="form-select">
            ${DemoData.suppliers.map(s=>`<option value="${s.name}" ${product?.supplier===s.name?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Expiry Date</label>
          <input type="date" id="p-expiry" class="form-input" value="${product?.expiry||''}" />
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveProduct(${isEdit ? `'${productId}'` : 'null'})">${isEdit ? 'Save Changes' : 'Add Product'}</button>
    `
  });
}

function saveProduct(productId) {
  const name     = document.getElementById('p-name')?.value?.trim();
  const sku      = document.getElementById('p-sku')?.value?.trim();
  const category = document.getElementById('p-category')?.value;
  const unit     = document.getElementById('p-unit')?.value?.trim();
  const price    = parseFloat(document.getElementById('p-price')?.value);
  const cost     = parseFloat(document.getElementById('p-cost')?.value);
  const stock    = parseInt(document.getElementById('p-stock')?.value);
  const minStock = parseInt(document.getElementById('p-minstock')?.value);
  const gst      = parseInt(document.getElementById('p-gst')?.value);
  const barcode  = document.getElementById('p-barcode')?.value?.trim();
  const supplier = document.getElementById('p-supplier')?.value;
  const expiry   = document.getElementById('p-expiry')?.value;

  if (!name) { Toast.error('Product name is required'); return; }
  if (!price || !cost) { Toast.error('Enter valid price and cost'); return; }

  if (productId) {
    const idx = DemoData.products.findIndex(p => p.id === productId);
    if (idx > -1) {
      DemoData.products[idx] = { ...DemoData.products[idx], name, sku, category, unit, price, cost, stock, minStock, gst, barcode, supplier, expiry };
      Toast.success(`Product "${name}" updated successfully!`);
    }
  } else {
    DemoData.products.push({
      id: generateId(),
      name, sku: sku || `SKU-${Math.random().toString(36).substr(2,6).toUpperCase()}`,
      category, unit, price, cost, stock: stock||0, minStock: minStock||10,
      gst: gst||12, barcode, supplier, expiry,
      image: '📦'
    });
    Toast.success(`Product "${name}" added successfully!`);
  }

  document.querySelector('.modal-backdrop')?.remove();
  renderInventoryTable();
}

function deleteProduct(id) {
  const p = DemoData.products.find(pr => pr.id === id);
  if (!confirm(`Delete "${p?.name}"? This cannot be undone.`)) return;
  DemoData.products = DemoData.products.filter(pr => pr.id !== id);
  Toast.success('Product deleted');
  renderInventoryTable();
}

function viewProduct(id) {
  const p = DemoData.products.find(pr => pr.id === id);
  if (!p) return;
  Modal.create({
    title: p.name,
    body: `
      <div style="text-align:center;margin-bottom:var(--space-6)">
        <div style="font-size:72px">${p.image}</div>
        <span class="badge badge-${p.stock<=p.minStock?'warning':'success'}" style="margin-top:var(--space-2)">${p.stock <= p.minStock ? 'Low Stock' : 'In Stock'}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        ${[
          ['SKU', p.sku],
          ['Category', p.category],
          ['Unit', p.unit],
          ['Selling Price', Format.currency(p.price)],
          ['Cost Price', Format.currency(p.cost)],
          ['Gross Margin', Format.percent(p.price-p.cost, p.price)],
          ['Current Stock', `${p.stock} units`],
          ['Min Stock', `${p.minStock} units`],
          ['GST Rate', `${p.gst}%`],
          ['Barcode', p.barcode],
          ['Supplier', p.supplier],
          ['Expiry', Format.date(p.expiry)],
        ].map(([k,v]) => `
          <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-3)">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:2px">${k}</div>
            <div style="font-weight:600;font-size:var(--text-sm)">${v}</div>
          </div>
        `).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Close</button>
      <button class="btn btn-primary" onclick="document.querySelector('.modal-backdrop').remove();openProductModal('${p.id}')">Edit Product</button>
    `
  });
}

function quickAdjustStock(id) {
  const p = DemoData.products.find(pr => pr.id === id);
  if (!p) return;
  Modal.create({
    title: `Adjust Stock — ${p.name}`,
    body: `
      <div style="text-align:center;margin-bottom:var(--space-4)">
        <div style="font-size:48px">${p.image}</div>
        <div style="font-size:var(--text-2xl);font-weight:700;margin-top:var(--space-2)">${p.stock} ${p.unit}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Current Stock</div>
      </div>
      <div class="form-group">
        <label class="form-label">Adjustment Type</label>
        <select id="adj-type" class="form-select">
          <option value="add">➕ Add Stock (Received from supplier)</option>
          <option value="remove">➖ Remove Stock (Damaged / Expired)</option>
          <option value="set">🔄 Set Stock (Physical count)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Quantity *</label>
        <input type="number" id="adj-qty" class="form-input" min="0" placeholder="Enter quantity" />
      </div>
      <div class="form-group">
        <label class="form-label">Reason</label>
        <input type="text" id="adj-reason" class="form-input" placeholder="e.g. Stock received from Tata Consumer" />
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="applyStockAdjustment('${id}')">Apply Adjustment</button>
    `
  });
}

function applyStockAdjustment(id) {
  const type = document.getElementById('adj-type')?.value;
  const qty  = parseInt(document.getElementById('adj-qty')?.value);

  if (!qty || qty <= 0) { Toast.error('Enter a valid quantity'); return; }

  const idx = DemoData.products.findIndex(p => p.id === id);
  if (idx === -1) return;

  const p = DemoData.products[idx];
  if (type === 'add')    DemoData.products[idx].stock = p.stock + qty;
  if (type === 'remove') DemoData.products[idx].stock = Math.max(0, p.stock - qty);
  if (type === 'set')    DemoData.products[idx].stock = qty;

  Toast.success(`Stock adjusted for ${p.name}`);
  document.querySelector('.modal-backdrop')?.remove();
  renderInventoryTable();
}

function updateSelection() {
  const checked = document.querySelectorAll('.product-checkbox:checked');
  const bar = document.getElementById('bulk-actions');
  const count = document.getElementById('selected-count');

  if (checked.length > 0) {
    bar.style.display = 'flex';
    count.textContent = `${checked.length} product(s) selected`;
  } else {
    bar.style.display = 'none';
  }
}

function toggleAllProducts(checked) {
  document.querySelectorAll('.product-checkbox').forEach(cb => {
    cb.checked = checked;
  });
  updateSelection();
}

function clearSelection() {
  document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);
  document.getElementById('select-all-inv').checked = false;
  document.getElementById('bulk-actions').style.display = 'none';
}

function bulkDelete() {
  const ids = [...document.querySelectorAll('.product-checkbox:checked')].map(cb => cb.dataset.id);
  if (!confirm(`Delete ${ids.length} product(s)? This cannot be undone.`)) return;
  DemoData.products = DemoData.products.filter(p => !ids.includes(p.id));
  Toast.success(`${ids.length} products deleted`);
  renderInventoryTable();
  clearSelection();
}

function bulkUpdateStock() { Toast.info('Opening bulk stock update...'); }

function exportInventory() {
  exportCSV(DemoData.products.map(p => ({
    SKU: p.sku, Name: p.name, Category: p.category, Unit: p.unit,
    'Selling Price': p.price, 'Cost Price': p.cost, Stock: p.stock,
    'Min Stock': p.minStock, 'GST%': p.gst, Barcode: p.barcode,
    Supplier: p.supplier, 'Expiry Date': p.expiry
  })), 'nexaerp-inventory.csv');
  Toast.success('Inventory exported as CSV!');
}

function openBarcodeScanner() {
  Modal.create({
    title: '📷 Barcode Scanner',
    body: `
      <div style="text-align:center;padding:var(--space-8)">
        <div style="font-size:64px;margin-bottom:var(--space-4)">📷</div>
        <p style="color:var(--color-text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-4)">
          Camera barcode scanning requires hardware integration.<br>Enter barcode manually below.
        </p>
        <input type="text" id="manual-barcode" class="form-input" placeholder="Enter barcode..." style="text-align:center;letter-spacing:0.1em" />
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="searchByBarcode()">Search Product</button>
    `
  });
}

function searchByBarcode() {
  const code = document.getElementById('manual-barcode')?.value?.trim();
  const product = DemoData.products.find(p => p.barcode === code);
  if (product) {
    document.querySelector('.modal-backdrop')?.remove();
    Toast.success(`Found: ${product.name}`);
    viewProduct(product.id);
  } else {
    Toast.error('No product found with this barcode');
  }
}

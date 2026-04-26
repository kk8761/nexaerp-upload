/**
 * NexaERP — Enterprise Modules v3
 * Procurement, Audit Logs, Stock Transfers, AI Forecast, Barcode, PWA, Automation Rules
 * All 7 enterprise-grade modules as vanilla JS
 */

// ══════════════════════════════════════════════════════════════════
// SECTION 1: PROCUREMENT WORKFLOW (SAP MM-PUR)
// ══════════════════════════════════════════════════════════════════

function renderProcurement() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Procurement Workflow (MM-PUR)</div>
        <div class="page-meta">Purchase Requisitions · Orders · GRN · Approval Chains</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-secondary" onclick="renderProcurement_PR()">📋 Requisitions</button>
        <button class="btn btn-secondary" onclick="renderProcurement_PO()">📦 Purchase Orders</button>
        <button class="btn btn-secondary" onclick="renderProcurement_GRN()">✅ Goods Receipt</button>
        <button class="btn btn-primary" onclick="openNewPRModal()">+ New PR</button>
      </div>
    </div>

    <!-- KPI Strip -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px;" id="proc-kpis">
      ${['📋 Requisitions', '📦 Orders', '✅ Received', '⏳ Awaiting Approval'].map((l,i) => `
        <div class="stat-card">
          <div style="font-size:24px;font-weight:800;background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" id="proc-stat-${i}">—</div>
          <div style="font-size:11px;color:var(--color-text-secondary);margin-top:4px;">${l}</div>
        </div>`).join('')}
    </div>

    <!-- Pipeline View -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="panel-card" style="padding:0;">
        <div class="panel-header"><span class="panel-title">📋 Recent Requisitions</span><button class="btn btn-sm btn-ghost" onclick="openNewPRModal()">+New</button></div>
        <div id="pr-list" style="padding:8px;max-height:400px;overflow-y:auto;">
          <div class="loading-shimmer" style="height:200px;border-radius:8px;"></div>
        </div>
      </div>
      <div class="panel-card" style="padding:0;">
        <div class="panel-header"><span class="panel-title">📦 Recent Purchase Orders</span><button class="btn btn-sm btn-ghost" onclick="openNewPOModal()">+New</button></div>
        <div id="po-list" style="padding:8px;max-height:400px;overflow-y:auto;">
          <div class="loading-shimmer" style="height:200px;border-radius:8px;"></div>
        </div>
      </div>
    </div>
  `;
  loadProcurementData();
}

async function loadProcurementData() {
  try {
    const [summaryRes, prRes, poRes] = await Promise.all([
      Http.get('/procurement/summary').catch(() => null),
      Http.get('/procurement/requisitions?limit=8').catch(() => null),
      Http.get('/procurement/orders?limit=8').catch(() => null),
    ]);

    // KPIs
    if (summaryRes?.data) {
      const d = summaryRes.data;
      document.getElementById('proc-stat-0').textContent = d.prCount ?? DemoProcurement.stats.prCount;
      document.getElementById('proc-stat-1').textContent = d.poCount ?? DemoProcurement.stats.poCount;
      document.getElementById('proc-stat-2').textContent = d.grnCount ?? DemoProcurement.stats.grnCount;
      document.getElementById('proc-stat-3').textContent = d.pendingApprovals ?? DemoProcurement.stats.pendingApprovals;
    } else {
      ['prCount','poCount','grnCount','pendingApprovals'].forEach((k,i) => {
        document.getElementById(`proc-stat-${i}`).textContent = DemoProcurement.stats[k];
      });
    }

    // Render PR list
    const prs = prRes?.data || DemoProcurement.requisitions;
    document.getElementById('pr-list').innerHTML = renderPRTable(prs);

    // Render PO list
    const pos = poRes?.data || DemoProcurement.orders;
    document.getElementById('po-list').innerHTML = renderPOTable(pos);
  } catch (err) {
    console.error('Procurement load error:', err);
    document.getElementById('pr-list').innerHTML = renderPRTable(DemoProcurement.requisitions);
    document.getElementById('po-list').innerHTML = renderPOTable(DemoProcurement.orders);
    ['prCount','poCount','grnCount','pendingApprovals'].forEach((k,i) => {
      if (document.getElementById(`proc-stat-${i}`)) document.getElementById(`proc-stat-${i}`).textContent = DemoProcurement.stats[k];
    });
  }
}

function renderPRTable(prs) {
  if (!prs?.length) return '<p style="text-align:center;padding:32px;color:var(--color-text-secondary)">No requisitions yet</p>';
  const statusColors = { draft:'info', submitted:'warning', approved:'success', rejected:'danger', converted_to_po:'success' };
  return `<table class="sap-dense-table">
    <thead><tr><th>PR No.</th><th>Requester</th><th>Items</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${prs.map(pr => `<tr>
      <td style="color:var(--color-brand-400);font-weight:700;font-family:var(--font-mono)">${pr.prNumber}</td>
      <td>${pr.requesterName || pr.requestedBy?.name || 'Me'}</td>
      <td>${pr.items?.length || 0}</td>
      <td><span class="badge badge-${pr.priority==='urgent'?'danger':pr.priority==='high'?'warning':'info'}">${(pr.priority||'medium').toUpperCase()}</span></td>
      <td><span class="badge badge-${statusColors[pr.status]||'info'}">${(pr.status||'draft').replace(/_/g,' ').toUpperCase()}</span></td>
      <td><button class="btn btn-sm btn-ghost" onclick="viewPRDetail('${pr._id||pr.prNumber}')">View</button>
          ${pr.status==='submitted'?`<button class="btn btn-sm btn-primary" onclick="approvePR('${pr._id}')">Approve</button>`:''}
      </td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function renderPOTable(pos) {
  if (!pos?.length) return '<p style="text-align:center;padding:32px;color:var(--color-text-secondary)">No purchase orders yet</p>';
  return `<table class="sap-dense-table">
    <thead><tr><th>PO No.</th><th>Supplier</th><th>Amount</th><th>Status</th><th>Release</th><th>Action</th></tr></thead>
    <tbody>${pos.map(po => `<tr>
      <td style="color:var(--color-brand-400);font-weight:700;font-family:var(--font-mono)">${po.poNumber}</td>
      <td>${po.supplierName}</td>
      <td style="font-weight:700">₹${Format.number(po.grandTotal)}</td>
      <td><span class="badge badge-info" style="font-size:9px">${(po.status||'draft').replace(/_/g,' ').toUpperCase()}</span></td>
      <td><span class="badge badge-${po.releaseStatus==='released'?'success':po.releaseStatus==='rejected'?'danger':'warning'}" style="font-size:9px">${po.releaseStatus?.toUpperCase()}</span></td>
      <td><button class="btn btn-sm btn-ghost" onclick="viewPODetail('${po._id||po.poNumber}')">View</button>
          ${po.releaseStatus==='to_release'?`<button class="btn btn-sm btn-primary" onclick="releasePO('${po._id}')">Release</button>`:''}
      </td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function openNewPRModal() {
  Modal.create({
    title: '📋 Create Purchase Requisition',
    body: `
      <div class="sap-form-grid">
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select id="pr-priority" class="form-select">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <input type="text" id="pr-dept" class="form-input" placeholder="e.g. Operations" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="pr-notes" class="form-input" rows="2" placeholder="Reason for requisition..."></textarea>
      </div>
      <div id="pr-items-container">
        <div class="sap-field-label">Items</div>
        <div id="pr-items-list">
          <div class="sap-form-grid" style="margin-bottom:8px" id="pr-item-0">
            <input type="text" class="form-input" placeholder="Item description" id="pr-item-desc-0" />
            <input type="number" class="form-input" placeholder="Qty" id="pr-item-qty-0" value="1" min="1" />
            <input type="number" class="form-input" placeholder="Est. Cost ₹" id="pr-item-cost-0" value="0" min="0" />
            <input type="text" class="form-input" placeholder="Unit" id="pr-item-unit-0" value="pcs" />
          </div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="addPRItem()">+ Add Item</button>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close(this)">Cancel</button>
      <button class="btn btn-secondary" onclick="submitPR('draft')">Save Draft</button>
      <button class="btn btn-primary" onclick="submitPR('submitted')">Submit for Approval</button>
    `
  });
  window._prItemCount = 1;
}

window.addPRItem = function() {
  const n = window._prItemCount++;
  const container = document.getElementById('pr-items-list');
  const div = document.createElement('div');
  div.className = 'sap-form-grid';
  div.style.marginBottom = '8px';
  div.id = `pr-item-${n}`;
  div.innerHTML = `
    <input type="text" class="form-input" placeholder="Item description" id="pr-item-desc-${n}" />
    <input type="number" class="form-input" placeholder="Qty" id="pr-item-qty-${n}" value="1" min="1" />
    <input type="number" class="form-input" placeholder="Est. Cost ₹" id="pr-item-cost-${n}" value="0" min="0" />
    <button class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);
};

window.submitPR = async function(status = 'submitted') {
  const items = [];
  for (let i = 0; i < (window._prItemCount || 1); i++) {
    const desc = document.getElementById(`pr-item-desc-${i}`)?.value;
    const qty  = document.getElementById(`pr-item-qty-${i}`)?.value;
    if (desc) items.push({
      description: desc,
      quantity: +qty || 1,
      estimatedCost: +document.getElementById(`pr-item-cost-${i}`)?.value || 0,
      unit: document.getElementById(`pr-item-unit-${i}`)?.value || 'pcs',
    });
  }
  if (!items.length) return Toast.error('Add at least one item');

  const user = Auth.getUser();
  const payload = {
    priority: document.getElementById('pr-priority')?.value || 'medium',
    department: document.getElementById('pr-dept')?.value,
    notes: document.getElementById('pr-notes')?.value,
    items,
    status,
    branch: Storage.get('nexaerp_branches')?.[0] || 'main',
  };

  try {
    await Http.post('/procurement/requisitions', payload);
    Modal.close(document.querySelector('.modal-backdrop'));
    Toast.success(`PR ${status === 'draft' ? 'saved as draft' : 'submitted for approval'}`);
    loadProcurementData();
  } catch {
    // Demo mode
    Toast.success(`PR ${status === 'draft' ? 'saved as draft' : 'submitted for approval'} (demo)`);
    Modal.close(document.querySelector('.modal-backdrop'));
    loadProcurementData();
  }
};

window.approvePR = async function(id) {
  Modal.create({
    title: 'Approve Purchase Requisition',
    body: `
      <p style="color:var(--color-text-secondary);margin-bottom:16px">Review and approve this PR to proceed to Purchase Order creation.</p>
      <div class="form-group">
        <label class="form-label">Comment (optional)</label>
        <textarea id="pr-approve-comment" class="form-input" rows="2" placeholder="Your remarks..."></textarea>
      </div>
    `,
    footer: `
      <button class="btn btn-danger" onclick="decidePR('${id}',false)">Reject</button>
      <button class="btn btn-primary" onclick="decidePR('${id}',true)">Approve & Release</button>
    `
  });
};

window.decidePR = async function(id, approved) {
  const comment = document.getElementById('pr-approve-comment')?.value;
  try {
    await Http.patch(`/procurement/requisitions/${id}/approve`, { approved, comment });
    Toast.success(approved ? 'PR Approved' : 'PR Rejected');
  } catch {
    Toast.info(approved ? 'PR Approved (demo)' : 'PR Rejected (demo)');
  }
  Modal.close(document.querySelector('.modal-backdrop'));
  loadProcurementData();
};

window.openNewPOModal = function() {
  Modal.create({
    title: '📦 Create Purchase Order',
    body: `
      <div class="sap-form-grid">
        <div class="form-group">
          <label class="form-label">Supplier Name</label>
          <input type="text" id="po-supplier" class="form-input" placeholder="Supplier/Vendor name" />
        </div>
        <div class="form-group">
          <label class="form-label">Delivery Date</label>
          <input type="date" id="po-delivery" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Delivery Address</label>
          <input type="text" id="po-address" class="form-input" placeholder="Delivery location" />
        </div>
        <div class="form-group">
          <label class="form-label">Terms</label>
          <input type="text" id="po-terms" class="form-input" placeholder="e.g. Net 30, FOB" />
        </div>
      </div>
      <div class="sap-field-label">Order Items</div>
      <div id="po-items-list">
        <div class="sap-form-grid" style="grid-template-columns:2fr 1fr 1fr 1fr;margin-bottom:8px">
          <input type="text" class="form-input" placeholder="Item description" id="po-item-desc-0" />
          <input type="number" class="form-input" placeholder="Qty" id="po-item-qty-0" value="1" />
          <input type="number" class="form-input" placeholder="Unit Price ₹" id="po-item-price-0" value="0" />
          <input type="number" class="form-input" placeholder="GST %" id="po-item-tax-0" value="18" />
        </div>
      </div>
      <button class="btn btn-sm btn-ghost" onclick="addPOItem()">+ Add Item</button>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close(this)">Cancel</button>
      <button class="btn btn-primary" onclick="submitPO()">Create Purchase Order</button>
    `
  });
  window._poItemCount = 1;
};

window.addPOItem = function() {
  const n = window._poItemCount++;
  const container = document.getElementById('po-items-list');
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:8px';
  div.innerHTML = `
    <input type="text" class="form-input" placeholder="Item description" id="po-item-desc-${n}" />
    <input type="number" class="form-input" placeholder="Qty" id="po-item-qty-${n}" value="1" />
    <input type="number" class="form-input" placeholder="Unit Price ₹" id="po-item-price-${n}" value="0" />
    <button class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);
};

window.submitPO = async function() {
  const items = [];
  for (let i = 0; i < (window._poItemCount || 1); i++) {
    const desc = document.getElementById(`po-item-desc-${i}`)?.value;
    if (desc) items.push({
      description: desc,
      quantity: +document.getElementById(`po-item-qty-${i}`)?.value || 1,
      unitPrice: +document.getElementById(`po-item-price-${i}`)?.value || 0,
      taxPercent: +document.getElementById(`po-item-tax-${i}`)?.value || 18,
    });
  }
  if (!items.length) return Toast.error('Add at least one item');
  const payload = {
    supplierName: document.getElementById('po-supplier')?.value,
    deliveryDate: document.getElementById('po-delivery')?.value,
    deliveryAddress: document.getElementById('po-address')?.value,
    terms: document.getElementById('po-terms')?.value,
    items,
  };
  try {
    await Http.post('/procurement/orders', payload);
    Toast.success('Purchase Order created');
  } catch {
    Toast.info('Purchase Order created (demo)');
  }
  Modal.close(document.querySelector('.modal-backdrop'));
  loadProcurementData();
};

window.releasePO = async function(id) {
  try {
    await Http.patch(`/procurement/orders/${id}/release`);
    Toast.success('PO Released for Vendor');
  } catch {
    Toast.info('PO Released (demo)');
  }
  loadProcurementData();
};

window.viewPRDetail = function(id) { Toast.info(`Opening PR details: ${id}`); };
window.viewPODetail = function(id) { Toast.info(`Opening PO details: ${id}`); };

// Demo data fallback
const DemoProcurement = {
  stats: { prCount: 12, poCount: 8, grnCount: 5, pendingApprovals: 3 },
  requisitions: [
    { prNumber: 'PR-2026-0001', requesterName: 'Rahul Kumar', items: [{description:'Rice Bags',quantity:50},{description:'Sugar',quantity:20}], priority: 'high', status: 'submitted' },
    { prNumber: 'PR-2026-0002', requesterName: 'Priya Patel', items: [{description:'Masala Mix',quantity:15}], priority: 'medium', status: 'approved' },
    { prNumber: 'PR-2026-0003', requesterName: 'You', items: [{description:'Office Supplies',quantity:5}], priority: 'low', status: 'draft' },
  ],
  orders: [
    { poNumber: 'PO-2026-0001', supplierName: 'HUL Suppliers', grandTotal: 42800, status: 'acknowledged', releaseStatus: 'released' },
    { poNumber: 'PO-2026-0002', supplierName: 'Heritage Dairy', grandTotal: 15400, status: 'draft', releaseStatus: 'to_release' },
    { poNumber: 'PO-2026-0003', supplierName: 'Nestle India', grandTotal: 29300, status: 'received', releaseStatus: 'released' },
  ]
};


// ══════════════════════════════════════════════════════════════════
// SECTION 2: AUDIT LOGS & COMPLIANCE
// ══════════════════════════════════════════════════════════════════

function renderAuditLogs() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Audit Logs & Compliance</div>
        <div class="page-meta">Immutable activity trail · Change tracking · Compliance controls</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-secondary" onclick="exportAuditCSV()">📥 Export CSV</button>
      </div>
    </div>

    <!-- Compliance KPIs -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-card-value" id="audit-total" style="background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Total Events</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" id="audit-today" style="color:var(--color-success-400)">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" id="audit-critical" style="color:var(--color-danger-400)">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Critical Events</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-warning-400)">ISO</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Compliance Mode</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="panel-card" style="padding:16px;margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:12px;align-items:end;">
        <div>
          <div class="sap-field-label">Action</div>
          <select id="audit-filter-action" class="form-select" onchange="loadAuditLogs()">
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="PR_CREATED">PR Created</option>
            <option value="PO_CREATED">PO Created</option>
            <option value="PO_RELEASED">PO Released</option>
            <option value="GRN_CREATED">GRN Created</option>
            <option value="STOCK_ADJUSTED">Stock Adjusted</option>
            <option value="ROLE_CHANGED">Role Changed</option>
            <option value="EXPORT_GENERATED">Export</option>
          </select>
        </div>
        <div>
          <div class="sap-field-label">Severity</div>
          <select id="audit-filter-severity" class="form-select" onchange="loadAuditLogs()">
            <option value="">All</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <div class="sap-field-label">From Date</div>
          <input type="date" id="audit-filter-from" class="form-input" onchange="loadAuditLogs()" />
        </div>
        <div>
          <div class="sap-field-label">To Date</div>
          <input type="date" id="audit-filter-to" class="form-input" onchange="loadAuditLogs()" />
        </div>
        <button class="btn btn-ghost" onclick="clearAuditFilters()">Clear</button>
      </div>
    </div>

    <!-- Log Table -->
    <div class="panel-card" style="padding:0;">
      <div class="panel-header">
        <span class="panel-title">🔍 Audit Trail</span>
        <span id="audit-count" class="badge badge-info">Loading...</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="sap-dense-table" id="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Description</th>
              <th>Severity</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody id="audit-tbody">
            <tr><td colspan="8" style="text-align:center;padding:32px;">
              <div class="loading-shimmer" style="height:120px;border-radius:8px;"></div>
            </td></tr>
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid var(--color-border-default);">
        <button class="btn btn-sm btn-ghost" id="audit-prev" onclick="loadAuditLogs(-1)">← Prev</button>
        <span id="audit-page-info" style="font-size:12px;color:var(--color-text-secondary)">Page 1</span>
        <button class="btn btn-sm btn-ghost" id="audit-next" onclick="loadAuditLogs(1)">Next →</button>
      </div>
    </div>
  `;
  window._auditPage = 1;
  loadAuditSummary();
  loadAuditLogs();
}

async function loadAuditSummary() {
  try {
    const res = await Http.get('/audit/summary');
    if (res?.data) {
      document.getElementById('audit-total').textContent = Format.number(res.data.total);
      document.getElementById('audit-today').textContent = res.data.todayCount;
      document.getElementById('audit-critical').textContent = res.data.criticalCount;
    }
  } catch {
    document.getElementById('audit-total').textContent = '1,247';
    document.getElementById('audit-today').textContent = '38';
    document.getElementById('audit-critical').textContent = '3';
  }
}

async function loadAuditLogs(pageDelta = 0) {
  window._auditPage = Math.max(1, (window._auditPage || 1) + pageDelta);
  const action   = document.getElementById('audit-filter-action')?.value;
  const severity = document.getElementById('audit-filter-severity')?.value;
  const from     = document.getElementById('audit-filter-from')?.value;
  const to       = document.getElementById('audit-filter-to')?.value;

  const params = new URLSearchParams({ page: window._auditPage, limit: 20 });
  if (action)   params.append('action', action);
  if (severity) params.append('severity', severity);
  if (from)     params.append('from', from);
  if (to)       params.append('to', to);

  const tbody = document.getElementById('audit-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--color-text-secondary)">Loading...</td></tr>';

  try {
    const res = await Http.get(`/audit?${params}`);
    const logs = res?.data || DemoAuditLogs;
    renderAuditTable(logs, res?.meta);
  } catch {
    renderAuditTable(DemoAuditLogs, { total: DemoAuditLogs.length, pages: 1 });
  }
}

function renderAuditTable(logs, meta) {
  const sevColors = { info:'', warning:'warning', critical:'danger' };
  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;
  if (!logs?.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--color-text-secondary)">No audit logs found</td></tr>';
    return;
  }
  tbody.innerHTML = logs.map(l => `<tr>
    <td style="font-family:var(--font-mono);font-size:10px;color:var(--color-text-tertiary)">${new Date(l.createdAt).toLocaleString()}</td>
    <td style="font-weight:600">${l.userName || l.userId?.name || 'System'}</td>
    <td><span class="badge badge-info" style="font-size:9px">${l.userRole||'—'}</span></td>
    <td style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--color-brand-400)">${l.action}</td>
    <td><span style="font-size:10px;color:var(--color-text-secondary)">${l.entity||'—'}</span></td>
    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${l.description||''}">${l.description||'—'}</td>
    <td><span class="badge badge-${sevColors[l.severity]||''}" style="font-size:9px">${(l.severity||'info').toUpperCase()}</span></td>
    <td style="font-family:var(--font-mono);font-size:10px">${l.userIp||'—'}</td>
  </tr>`).join('');
  if (meta) {
    const pageInfo = document.getElementById('audit-page-info');
    const count = document.getElementById('audit-count');
    if (pageInfo) pageInfo.textContent = `Page ${window._auditPage} of ${meta.pages||1}`;
    if (count) count.textContent = Format.number(meta.total || logs.length) + ' events';
  }
}

window.clearAuditFilters = function() {
  ['audit-filter-action','audit-filter-severity','audit-filter-from','audit-filter-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  window._auditPage = 1;
  loadAuditLogs();
};

window.exportAuditCSV = async function() {
  Toast.info('Generating audit export...');
  try {
    const res = await Http.get('/audit?limit=1000');
    const logs = res?.data || DemoAuditLogs;
    const headers = ['Timestamp','User','Role','Action','Entity','Description','Severity','IP'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toISOString(),
      l.userName||'', l.userRole||'', l.action,
      l.entity||'', (l.description||'').replace(/,/g,' '),
      l.severity||'info', l.userIp||''
    ]);
    exportCSV([Object.fromEntries(headers.map((h,i) => [h, rows[0]?.[i]||'']))].concat(
      rows.map(r => Object.fromEntries(headers.map((h,i) => [h, r[i]])))
    ), 'nexaerp_audit_log.csv');
    Toast.success('Audit log exported');
  } catch (e) {
    Toast.error('Export failed: ' + e.message);
  }
};

const DemoAuditLogs = [
  { action: 'LOGIN', userName: 'Arjun Sharma', userRole: 'owner', entity: 'User', description: 'Owner login from Chrome', severity: 'info', userIp: '192.168.1.1', createdAt: new Date(Date.now()-3600000) },
  { action: 'PO_CREATED', userName: 'Rahul Kumar', userRole: 'manager', entity: 'PurchaseOrder', description: 'PO-2026-0003 created for Nestle India', severity: 'info', userIp: '192.168.1.4', createdAt: new Date(Date.now()-7200000) },
  { action: 'PO_RELEASED', userName: 'Arjun Sharma', userRole: 'owner', entity: 'PurchaseOrder', description: 'PO-2026-0001 released for HUL', severity: 'warning', userIp: '192.168.1.1', createdAt: new Date(Date.now()-10800000) },
  { action: 'STOCK_ADJUSTED', userName: 'Priya Patel', userRole: 'cashier', entity: 'Product', description: 'Basmati Rice stock adjusted -5 units', severity: 'warning', userIp: '192.168.1.3', createdAt: new Date(Date.now()-14400000) },
  { action: 'ROLE_CHANGED', userName: 'Arjun Sharma', userRole: 'owner', entity: 'User', description: 'Priya Patel role changed to Manager', severity: 'critical', userIp: '192.168.1.1', createdAt: new Date(Date.now()-18000000) },
  { action: 'LOGIN_FAILED', userName: 'Unknown', userRole: '—', entity: 'User', description: 'Failed login attempt: wrong password', severity: 'critical', userIp: '45.33.32.156', createdAt: new Date(Date.now()-21600000) },
  { action: 'EXPORT_GENERATED', userName: 'Arjun Sharma', userRole: 'owner', entity: 'Report', description: 'Payroll report exported as Excel', severity: 'info', userIp: '192.168.1.1', createdAt: new Date(Date.now()-25200000) },
];


// ══════════════════════════════════════════════════════════════════
// SECTION 3: MULTI-BRANCH STOCK TRANSFERS
// ══════════════════════════════════════════════════════════════════

function renderStockTransfers() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Multi-Branch Stock Transfers</div>
        <div class="page-meta">Inter-branch inventory movement · Approval workflow · Warehouse balancing</div>
      </div>
      <button class="btn btn-primary" onclick="openNewTransferModal()">+ New Transfer Request</button>
    </div>

    <!-- Branch Balance Overview -->
    <div style="margin-bottom:20px;">
      <div class="panel-card" style="padding:16px;">
        <div class="chart-title" style="margin-bottom:16px;">🏪 Branch Stock Overview</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;" id="branch-balance-grid">
          ${['Main Store','Warehouse A','Retail B'].map((b,i) => `
            <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-default);border-radius:12px;padding:16px;">
              <div style="font-size:13px;font-weight:700;margin-bottom:12px;">🏪 ${b}</div>
              <div style="display:grid;gap:6px;" id="branch-stock-${i}">
                ${['Basmati Rice','Atta 5kg','Sugar 1kg'].map(p => `
                  <div style="display:flex;justify-content:space-between;font-size:12px;">
                    <span>${p}</span>
                    <span style="font-weight:700;color:var(--color-brand-400)">${Math.floor(Math.random()*200)+10} pcs</span>
                  </div>`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Transfer List -->
    <div class="panel-card" style="padding:0;">
      <div class="panel-header">
        <span class="panel-title">📦 Transfer Requests</span>
        <div style="display:flex;gap:8px;">
          <select id="transfer-filter-status" class="form-select" style="font-size:12px;padding:4px 8px;" onchange="loadTransfers()">
            <option value="">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In Transit</option>
            <option value="received">Received</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="sap-dense-table">
          <thead>
            <tr>
              <th>Transfer No.</th>
              <th>From</th>
              <th>To</th>
              <th>Items</th>
              <th>Value</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="transfer-tbody">
            <tr><td colspan="8" style="text-align:center;padding:20px;color:var(--color-text-secondary)">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  loadTransfers();
}

async function loadTransfers() {
  const status = document.getElementById('transfer-filter-status')?.value;
  const tbody = document.getElementById('transfer-tbody');
  try {
    const res = await Http.get(`/stock-transfers${status ? '?status='+status : ''}`);
    const transfers = res?.data || DemoTransfers;
    renderTransferTable(transfers);
  } catch {
    renderTransferTable(DemoTransfers);
  }
}

function renderTransferTable(transfers) {
  const tbody = document.getElementById('transfer-tbody');
  if (!tbody) return;
  if (!transfers?.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--color-text-secondary)">No transfers found</td></tr>';
    return;
  }
  const statusColor = { requested:'warning', approved:'info', in_transit:'warning', received:'success', rejected:'danger', draft:'', cancelled:'danger' };
  tbody.innerHTML = transfers.map(t => `<tr>
    <td style="color:var(--color-brand-400);font-weight:700;font-family:var(--font-mono)">${t.transferNumber}</td>
    <td><span style="font-size:11px;font-weight:600;">🏪 ${t.fromBranch}</span></td>
    <td><span style="font-size:11px;font-weight:600;">🏪 ${t.toBranch}</span></td>
    <td>${(t.items||[]).length} items (${t.totalItems||0} units)</td>
    <td style="font-weight:700">₹${Format.number(t.totalValue||0)}</td>
    <td><span class="badge badge-${t.priority==='urgent'?'danger':'info'}" style="font-size:9px">${(t.priority||'normal').toUpperCase()}</span></td>
    <td><span class="badge badge-${statusColor[t.status]||''}" style="font-size:9px">${(t.status||'draft').replace(/_/g,' ').toUpperCase()}</span></td>
    <td style="display:flex;gap:4px;">
      <button class="btn btn-sm btn-ghost" onclick="viewTransferDetail('${t._id||t.transferNumber}')">View</button>
      ${t.status==='requested'?`<button class="btn btn-sm btn-primary" onclick="approveTransfer('${t._id}')">Approve</button>`:''}
      ${t.status==='approved'?`<button class="btn btn-sm btn-secondary" onclick="shipTransfer('${t._id}')">Ship</button>`:''}
      ${t.status==='in_transit'?`<button class="btn btn-sm btn-success" style="background:var(--color-success-600);color:#fff;border:none;" onclick="receiveTransfer('${t._id}')">Receive</button>`:''}
    </td>
  </tr>`).join('');
}

window.openNewTransferModal = function() {
  Modal.create({
    title: '📦 New Stock Transfer Request',
    body: `
      <div class="sap-form-grid">
        <div class="form-group">
          <label class="form-label">From Branch</label>
          <select id="tr-from" class="form-select">
            <option value="main">Main Store</option>
            <option value="branch1">Warehouse A</option>
            <option value="branch2">Retail B</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">To Branch</label>
          <select id="tr-to" class="form-select">
            <option value="branch1">Warehouse A</option>
            <option value="main">Main Store</option>
            <option value="branch2">Retail B</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Reason</label>
          <select id="tr-reason" class="form-select">
            <option value="rebalancing">Stock Rebalancing</option>
            <option value="demand_fulfillment">Demand Fulfillment</option>
            <option value="seasonal">Seasonal Transfer</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select id="tr-priority" class="form-select">
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div class="sap-field-label">Items to Transfer</div>
      <div id="tr-items-list">
        <div style="display:grid;grid-template-columns:3fr 1fr 1fr;gap:8px;margin-bottom:8px">
          <input type="text" class="form-input" placeholder="Product name" id="tr-item-name-0" />
          <input type="number" class="form-input" placeholder="Qty" id="tr-item-qty-0" value="10" min="1" />
          <input type="number" class="form-input" placeholder="Unit Cost ₹" id="tr-item-cost-0" value="0" min="0" />
        </div>
      </div>
      <button class="btn btn-sm btn-ghost" onclick="addTransferItem()">+ Add Item</button>
      <div class="form-group" style="margin-top:12px;">
        <label class="form-label">Notes</label>
        <textarea id="tr-notes" class="form-input" rows="2" placeholder="Transfer notes..."></textarea>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close(this)">Cancel</button>
      <button class="btn btn-primary" onclick="submitTransfer()">Submit Request</button>
    `
  });
  window._trItemCount = 1;
};

window.addTransferItem = function() {
  const n = window._trItemCount++;
  const container = document.getElementById('tr-items-list');
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:3fr 1fr 1fr;gap:8px;margin-bottom:8px';
  div.innerHTML = `
    <input type="text" class="form-input" placeholder="Product name" id="tr-item-name-${n}" />
    <input type="number" class="form-input" placeholder="Qty" id="tr-item-qty-${n}" value="10" min="1" />
    <button class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);
};

window.submitTransfer = async function() {
  const items = [];
  for (let i = 0; i < (window._trItemCount || 1); i++) {
    const name = document.getElementById(`tr-item-name-${i}`)?.value;
    if (name) items.push({
      productName: name,
      requestedQty: +document.getElementById(`tr-item-qty-${i}`)?.value || 1,
      unitCost: +document.getElementById(`tr-item-cost-${i}`)?.value || 0,
    });
  }
  if (!items.length) return Toast.error('Add at least one item');
  const payload = {
    fromBranch: document.getElementById('tr-from')?.value,
    toBranch: document.getElementById('tr-to')?.value,
    reason: document.getElementById('tr-reason')?.value,
    priority: document.getElementById('tr-priority')?.value,
    notes: document.getElementById('tr-notes')?.value,
    items,
  };
  if (payload.fromBranch === payload.toBranch) return Toast.error('Source and destination branches must differ');
  try {
    await Http.post('/stock-transfers', payload);
    Toast.success('Transfer request submitted');
  } catch {
    Toast.info('Transfer request submitted (demo)');
  }
  Modal.close(document.querySelector('.modal-backdrop'));
  loadTransfers();
};

window.approveTransfer = async function(id) {
  try {
    await Http.patch(`/stock-transfers/${id}/approve`, { approved: true });
    Toast.success('Transfer approved');
  } catch {
    Toast.info('Transfer approved (demo)');
  }
  loadTransfers();
};

window.shipTransfer = async function(id) {
  try {
    await Http.patch(`/stock-transfers/${id}/ship`);
    Toast.success('Transfer marked as In Transit');
  } catch { Toast.info('Transfer shipped (demo)'); }
  loadTransfers();
};

window.receiveTransfer = async function(id) {
  try {
    await Http.patch(`/stock-transfers/${id}/receive`, {});
    Toast.success('Transfer received and stock updated');
  } catch { Toast.info('Transfer received (demo)'); }
  loadTransfers();
};

window.viewTransferDetail = function(id) { Toast.info(`Opening transfer: ${id}`); };

const DemoTransfers = [
  { transferNumber: 'STR-2026-0001', fromBranch: 'main', toBranch: 'branch1', items: [{productName:'Basmati Rice'},{productName:'Sugar'}], totalItems: 75, totalValue: 8250, priority: 'normal', status: 'requested' },
  { transferNumber: 'STR-2026-0002', fromBranch: 'branch1', toBranch: 'branch2', items: [{productName:'Atta 5kg'}], totalItems: 30, totalValue: 3600, priority: 'urgent', status: 'in_transit' },
  { transferNumber: 'STR-2026-0003', fromBranch: 'branch2', toBranch: 'main', items: [{productName:'Masala Mix'}], totalItems: 20, totalValue: 1800, priority: 'normal', status: 'received' },
];


// ══════════════════════════════════════════════════════════════════
// SECTION 4: AI DEMAND PREDICTION DASHBOARD
// ══════════════════════════════════════════════════════════════════

function renderDemandForecast() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">AI Demand Prediction</div>
        <div class="page-meta">Sales forecasting · Reorder prediction · Inventory intelligence</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-size:11px;background:rgba(16,185,129,0.15);color:var(--color-success-400);padding:4px 10px;border-radius:99px;font-weight:700;">✨ AI Powered</span>
        <button class="btn btn-ghost btn-sm" onclick="renderDemandForecast()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Forecast Alert Banner -->
    <div id="forecast-alerts" style="margin-bottom:20px;"></div>

    <!-- Overview Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-card-value" id="fc-total" style="background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Products Tracked</div>
      </div>
      <div class="stat-card" style="border-color:rgba(239,68,68,0.3)">
        <div class="stat-card-value" id="fc-critical" style="color:var(--color-danger-400)">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Critical (≤7d stock)</div>
      </div>
      <div class="stat-card" style="border-color:rgba(245,158,11,0.3)">
        <div class="stat-card-value" id="fc-warning" style="color:var(--color-warning-400)">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Warning (≤14d stock)</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" id="fc-ok" style="color:var(--color-success-400)">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Healthy Stock</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
      <!-- Reorder Priority Table -->
      <div class="panel-card" style="padding:0;">
        <div class="panel-header">
          <span class="panel-title">🎯 Reorder Priority List</span>
          <select id="fc-filter" class="form-select" style="font-size:11px;padding:3px 8px;" onchange="filterForecast()">
            <option value="all">All Products</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warning Only</option>
          </select>
        </div>
        <div style="overflow-x:auto;">
          <table class="sap-dense-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Avg Daily Sales</th>
                <th>Days Remaining</th>
                <th>7-Day Forecast</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="forecast-tbody">
              <tr><td colspan="7" style="padding:20px;text-align:center;color:var(--color-text-secondary)">Loading AI forecast...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">📈 30-Day Revenue Trend</div>
            <div class="chart-subtitle">Actual vs Predicted</div>
          </div>
        </div>
        <div id="forecast-chart-area" style="height:280px;display:flex;flex-direction:column;justify-content:flex-end;">
          <div style="text-align:center;color:var(--color-text-tertiary);padding:40px;font-size:13px;">Loading trends...</div>
        </div>
      </div>
    </div>
  `;
  loadForecastData();
}

async function loadForecastData() {
  try {
    const res = await Http.get('/forecast/overview');
    const data = res?.data || DemoForecast;
    renderForecastData(data);
    // Load trend chart
    const trendRes = await Http.get('/forecast/trends').catch(() => null);
    renderTrendChart(trendRes?.data || DemoTrend);
  } catch {
    renderForecastData(DemoForecast);
    renderTrendChart(DemoTrend);
  }
}

function renderForecastData(data) {
  document.getElementById('fc-total').textContent = data.totalProducts || 0;
  document.getElementById('fc-critical').textContent = data.criticalItems || 0;
  document.getElementById('fc-warning').textContent = data.warningItems || 0;
  document.getElementById('fc-ok').textContent = (data.totalProducts - data.criticalItems - data.warningItems) || 0;

  // Alert banner for critical items
  const alerts = document.getElementById('forecast-alerts');
  if (data.criticalItems > 0) {
    alerts.innerHTML = `
      <div style="padding:12px 20px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:20px;">🚨</span>
        <div>
          <div style="font-weight:700;color:var(--color-danger-400)">${data.criticalItems} Products Critical</div>
          <div style="font-size:12px;color:var(--color-text-secondary)">These will run out within 7 days. Immediate reorder recommended.</div>
        </div>
        <button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="openNewPRModal()">🛒 Auto Reorder</button>
      </div>
    `;
  }

  window._forecastItems = data.items || [];
  filterForecast();
}

window.filterForecast = function() {
  const filter = document.getElementById('fc-filter')?.value || 'all';
  const items = (window._forecastItems || []).filter(f => filter === 'all' || f.status === filter);
  const tbody = document.getElementById('forecast-tbody');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--color-text-secondary)">No items found</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(f => {
    const p = f.product;
    const statusColors = { critical: 'danger', warning: 'warning', ok: 'success' };
    const daysColor = f.daysOfStock <= 7 ? 'var(--color-danger-400)' : f.daysOfStock <= 14 ? 'var(--color-warning-400)' : 'var(--color-success-400)';
    return `<tr>
      <td><div style="font-weight:600">${p.name}</div><div style="font-size:10px;color:var(--color-text-tertiary)">${p.sku||p.category||''}</div></td>
      <td style="font-weight:700">${p.stock} pcs</td>
      <td>${f.avgDaily}/day</td>
      <td style="font-weight:800;color:${daysColor}">${f.daysOfStock >= 999 ? '∞' : f.daysOfStock + 'd'}</td>
      <td style="font-weight:600;color:var(--color-brand-400)">${f.predicted7d} pcs</td>
      <td><span class="badge badge-${statusColors[f.status]}">${f.status.toUpperCase()}</span></td>
      <td>${f.status !== 'ok' ? `<button class="btn btn-sm btn-primary" onclick="Toast.success('PR created for ${p.name}')">Reorder</button>` : '—'}</td>
    </tr>`;
  }).join('');
};

function renderTrendChart(data) {
  const container = document.getElementById('forecast-chart-area');
  if (!container || !data) return;
  const allRevenue = [...(data.revenue||[]), ...(data.forecast7||[])];
  const maxV = Math.max(...allRevenue, 1);
  const labels = data.labels || [];
  const revenue = data.revenue || [];
  const forecast7 = data.forecast7 || [];
  const forecastLabels = data.forecastLabels || [];

  const barCount = labels.length + forecastLabels.length;
  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:3px;height:220px;padding:0 8px 24px;">
      ${revenue.map((v, i) => {
        const h = Math.max(4, Math.round((v / maxV) * 180));
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;height:100%;">
          <div style="width:100%;background:var(--gradient-brand);border-radius:3px 3px 0 0;height:${h}px;transition:height 0.5s ease;" title="${labels[i]}: ₹${Format.number(v)}"></div>
          <div style="font-size:8px;color:var(--color-text-tertiary);transform:rotate(-30deg);white-space:nowrap;margin-top:2px">${i%5===0?labels[i]:''}</div>
        </div>`;
      }).join('')}
      ${forecast7.map((v, i) => {
        const h = Math.max(4, Math.round((v / maxV) * 180));
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;height:100%;">
          <div style="width:100%;background:rgba(99,102,241,0.35);border:1px dashed rgba(99,102,241,0.6);border-radius:3px 3px 0 0;height:${h}px;" title="Forecast ${forecastLabels[i]}: ₹${Format.number(v)}"></div>
          <div style="font-size:8px;color:var(--color-text-tertiary);transform:rotate(-30deg);white-space:nowrap;margin-top:2px">${i===0?forecastLabels[i]:''}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:16px;justify-content:center;font-size:11px;color:var(--color-text-secondary);">
      <div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:8px;background:var(--gradient-brand);border-radius:2px;"></div>Actual</div>
      <div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:8px;background:rgba(99,102,241,0.35);border:1px dashed rgba(99,102,241,0.6);border-radius:2px;"></div>Forecast</div>
    </div>
  `;
}

// Demo data fallback
const DemoForecast = {
  totalProducts: 24,
  criticalItems: 4,
  warningItems: 7,
  items: [
    { product: { name: 'Toor Dal 1kg', sku: 'DAL-001', stock: 12, category: 'Pulses' }, sold30d: 89, avgDaily: 3.0, daysOfStock: 4, predicted7d: 21, status: 'critical' },
    { product: { name: 'Sunflower Oil 1L', sku: 'OIL-002', stock: 8, category: 'Oils' }, sold30d: 45, avgDaily: 1.5, daysOfStock: 5, predicted7d: 11, status: 'critical' },
    { product: { name: 'Atta 5kg', sku: 'ATT-001', stock: 45, category: 'Grains' }, sold30d: 120, avgDaily: 4.0, daysOfStock: 11, predicted7d: 28, status: 'warning' },
    { product: { name: 'Masala Chai Mix', sku: 'TEA-003', stock: 80, category: 'Beverages' }, sold30d: 60, avgDaily: 2.0, daysOfStock: 40, predicted7d: 14, status: 'ok' },
    { product: { name: 'Basmati Rice 5kg', sku: 'RIC-001', stock: 150, category: 'Grains' }, sold30d: 180, avgDaily: 6.0, daysOfStock: 25, predicted7d: 42, status: 'ok' },
  ]
};

const DemoTrend = {
  labels: Array.from({length:30},(_,i) => { const d=new Date();d.setDate(d.getDate()-29+i);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); }),
  revenue: Array.from({length:30},() => Math.floor(Math.random()*30000)+15000),
  forecast7: Array.from({length:7},() => Math.floor(Math.random()*35000)+20000),
  forecastLabels: Array.from({length:7},(_,i) => { const d=new Date();d.setDate(d.getDate()+i+1);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); }),
};


// ══════════════════════════════════════════════════════════════════
// SECTION 5: BARCODE SCANNER & GENERATOR
// ══════════════════════════════════════════════════════════════════

function renderBarcode() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Barcode & Scanner Module</div>
        <div class="page-meta">Generate barcodes · Scan to lookup · Inventory scan updates · POS integration</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <!-- Generator -->
      <div class="panel-card" style="padding:24px;">
        <div class="chart-title" style="margin-bottom:16px;">🏷️ Barcode Generator</div>
        <div class="form-group">
          <label class="form-label">Product / Item</label>
          <input type="text" id="bc-search" class="form-input" placeholder="Search product name or SKU..." oninput="searchBarcodeProducts()" />
        </div>
        <div id="bc-search-results" style="margin-bottom:12px;"></div>
        <div class="form-group">
          <label class="form-label">Barcode Value</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="bc-value" class="form-input" placeholder="EAN-13 / Code 128 / Custom" />
            <button class="btn btn-ghost btn-sm" onclick="generateRandomBarcode()">Auto</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Format</label>
          <select id="bc-format" class="form-select" onchange="generateBarcode()">
            <option value="CODE128">CODE128 (Recommended)</option>
            <option value="EAN13">EAN-13</option>
            <option value="UPC">UPC-A</option>
            <option value="CODE39">CODE39</option>
            <option value="QR">QR Code</option>
          </select>
        </div>
        <button class="btn btn-primary btn-full" style="margin-bottom:16px;" onclick="generateBarcode()">🏷️ Generate Barcode</button>
        <div id="barcode-display" style="background:white;padding:20px;border-radius:12px;text-align:center;min-height:100px;display:flex;align-items:center;justify-content:center;flex-direction:column;">
          <div style="color:#666;font-size:12px;">Enter a product or barcode value to generate</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn btn-secondary" style="flex:1;" onclick="printBarcode()">🖨️ Print</button>
          <button class="btn btn-secondary" style="flex:1;" onclick="downloadBarcode()">📥 Download PNG</button>
        </div>
      </div>

      <!-- Scanner / Lookup -->
      <div class="panel-card" style="padding:24px;">
        <div class="chart-title" style="margin-bottom:16px;">📷 Barcode Scanner & Lookup</div>
        <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-default);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">
          <div id="scanner-camera-area" style="background:#000;border-radius:8px;min-height:200px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
            <div style="color:#fff;font-size:13px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">📷</div>
              <div>Camera scanner coming soon</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;">Use keyboard input below for now</div>
            </div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:180px;height:80px;border:2px solid #6366f1;border-radius:4px;pointer-events:none;"></div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Manual Barcode Input / Scan</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="bc-scan-input" class="form-input" placeholder="Scan or type barcode..." onkeydown="if(event.key==='Enter')lookupBarcode()" />
            <button class="btn btn-primary" onclick="lookupBarcode()">🔍 Lookup</button>
          </div>
        </div>
        <div id="bc-lookup-result" style="min-height:100px;"></div>

        <div class="panel-header" style="margin-top:20px;padding:0 0 12px 0;border-top:1px solid var(--color-border-subtle);padding-top:16px;">
          <span class="panel-title">🕐 Recent Scans</span>
        </div>
        <div id="bc-recent-scans">
          ${['Basmati Rice 5kg — EAN13: 8901234567890', 'Toor Dal 1kg — CODE128: TDAL1000', 'Sunflower Oil 1L — EAN13: 8907234001237'].map(s => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;background:var(--color-bg-secondary);">
              <span style="font-size:16px;">📦</span>
              <span style="font-size:12px;color:var(--color-text-secondary)">${s}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;

  // Load JsBarcode dynamically
  if (!window.JsBarcode) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    document.head.appendChild(script);
  }
}

window.generateBarcode = function() {
  const value = document.getElementById('bc-value')?.value?.trim();
  if (!value) return Toast.error('Enter a barcode value first');
  const format = document.getElementById('bc-format')?.value || 'CODE128';
  const display = document.getElementById('barcode-display');
  if (!display) return;

  display.innerHTML = `<svg id="barcode-svg"></svg><div style="font-size:11px;color:#666;margin-top:8px;">${value}</div>`;

  if (window.JsBarcode) {
    try {
      window.JsBarcode('#barcode-svg', value, {
        format, width: 2, height: 80, displayValue: true,
        font: 'monospace', fontSize: 12, margin: 10
      });
      display.style.background = 'white';
    } catch (e) {
      display.innerHTML = `<div style="color:red;font-size:12px;">Invalid barcode: ${e.message}</div>`;
    }
  } else {
    setTimeout(generateBarcode, 500);
  }
};

window.generateRandomBarcode = function() {
  const code = Date.now().toString().slice(-13).padStart(13, '0');
  const input = document.getElementById('bc-value');
  if (input) { input.value = code; generateBarcode(); }
};

window.lookupBarcode = async function() {
  const code = document.getElementById('bc-scan-input')?.value?.trim();
  if (!code) return Toast.error('Enter or scan a barcode');
  const result = document.getElementById('bc-lookup-result');
  if (result) result.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-secondary)">Looking up barcode...</div>';

  // Try to match from demo data
  const demoProducts = [
    { name: 'Basmati Rice 5kg', sku: 'RIC-001', stock: 150, price: 280, category: 'Grains', barcode: '8901234567890' },
    { name: 'Toor Dal 1kg', sku: 'DAL-001', stock: 12, price: 95, category: 'Pulses', barcode: 'TDAL1000' },
    { name: 'Sunflower Oil 1L', sku: 'OIL-002', stock: 8, price: 145, category: 'Oils', barcode: '8907234001237' },
  ];

  const found = demoProducts.find(p => p.barcode === code || p.sku === code || p.name.toLowerCase().includes(code.toLowerCase()));

  // Add to recent scans log
  const recentDiv = document.getElementById('bc-recent-scans');
  if (recentDiv && found) {
    const entry = document.createElement('div');
    entry.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;background:var(--color-bg-secondary);animation:fade-up 0.3s ease;';
    entry.innerHTML = `<span style="font-size:16px">📦</span><span style="font-size:12px;color:var(--color-text-secondary)">${found.name} — ${document.getElementById('bc-format')?.value||'CODE128'}: ${code}</span>`;
    recentDiv.prepend(entry);
  }

  if (result) {
    if (found) {
      result.innerHTML = `
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <div style="font-weight:700;font-size:15px;">${found.name}</div>
              <div style="font-size:12px;color:var(--color-text-secondary);">SKU: ${found.sku} · ${found.category}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:20px;font-weight:800;color:var(--color-brand-400)">₹${found.price}</div>
              <div style="font-size:11px;color:${found.stock>20?'var(--color-success-400)':found.stock>5?'var(--color-warning-400)':'var(--color-danger-400)'}">Stock: ${found.stock} units</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn btn-sm btn-primary">+ Add to Cart</button>
            <button class="btn btn-sm btn-secondary">📦 Stock Adjust</button>
            <button class="btn btn-sm btn-ghost">View Details</button>
          </div>
        </div>
      `;
    } else {
      result.innerHTML = `
        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:8px;">❌</div>
          <div style="font-weight:600;">Barcode not found: ${code}</div>
          <div style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;">Add this barcode to a product in Inventory</div>
          <button class="btn btn-sm btn-primary" style="margin-top:12px;">+ Create New Product</button>
        </div>
      `;
    }
  }
};

window.printBarcode = function() { Toast.info('Sending to printer...'); window.print(); };
window.downloadBarcode = function() {
  const svg = document.getElementById('barcode-svg');
  if (!svg || !svg.innerHTML) return Toast.error('Generate a barcode first');
  const svgData = new XMLSerializer().serializeToString(svg);
  const link = document.createElement('a');
  link.download = 'barcode.svg';
  link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
  link.click();
  Toast.success('Barcode downloaded');
};

window.searchBarcodeProducts = function() {
  const q = document.getElementById('bc-search')?.value?.toLowerCase();
  const container = document.getElementById('bc-search-results');
  if (!container) return;
  if (!q) { container.innerHTML = ''; return; }
  const products = [
    { name: 'Basmati Rice 5kg', sku: 'RIC-001', barcode: '8901234567890' },
    { name: 'Toor Dal 1kg', sku: 'DAL-001', barcode: 'TDAL1000' },
    { name: 'Sunflower Oil 1L', sku: 'OIL-002', barcode: '8907234001237' },
    { name: 'Atta 5kg', sku: 'ATT-001', barcode: '8904300001234' },
    { name: 'Sugar 1kg', sku: 'SUG-001', barcode: '8906000001111' },
  ].filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  container.innerHTML = products.slice(0,5).map(p => `
    <div style="padding:8px;cursor:pointer;border-radius:8px;background:var(--color-bg-secondary);margin-bottom:4px;font-size:12px;" 
         onclick="document.getElementById('bc-value').value='${p.barcode}';document.getElementById('bc-search').value='';document.getElementById('bc-search-results').innerHTML='';generateBarcode();">
      <strong>${p.name}</strong> <span style="color:var(--color-text-tertiary)">${p.sku} · ${p.barcode}</span>
    </div>`).join('') || '<div style="font-size:12px;color:var(--color-text-tertiary);padding:8px;">No products found</div>';
};


// ══════════════════════════════════════════════════════════════════
// SECTION 6: WORKFLOW AUTOMATION RULES ENGINE
// ══════════════════════════════════════════════════════════════════

function renderAutomation() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Workflow Automation Engine</div>
        <div class="page-meta">If-This-Then-That rules · Auto reorders · Smart triggers · Business process automation</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" onclick="loadAutomationTemplates()">📋 Quick Templates</button>
        <button class="btn btn-primary" onclick="openNewRuleModal()">+ Create Rule</button>
      </div>
    </div>

    <!-- Rule Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-card-value" id="auto-total" style="background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Total Rules</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" id="auto-active" style="color:var(--color-success-400)">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" id="auto-runs" style="color:var(--color-brand-400)">—</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Total Runs</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-warning-400)">IFTTT</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">Engine Mode</div>
      </div>
    </div>

    <!-- Rules List -->
    <div id="automation-rules-section">
      <div class="panel-card" style="padding:0;margin-bottom:20px;">
        <div class="panel-header">
          <span class="panel-title">⚡ Active Rules</span>
          <span id="auto-rules-count" class="badge badge-success">Loading...</span>
        </div>
        <div id="rules-list" style="padding:0;">
          <div style="text-align:center;padding:24px;color:var(--color-text-secondary)">Loading rules...</div>
        </div>
      </div>
    </div>

    <!-- Templates section (hidden by default) -->
    <div id="automation-templates-section" style="display:none;"></div>
  `;
  loadAutomationRules();
}

async function loadAutomationRules() {
  try {
    const res = await Http.get('/automation/rules');
    const rules = res?.data || DemoRules;
    renderRulesList(rules);
  } catch {
    renderRulesList(DemoRules);
  }
}

function renderRulesList(rules) {
  const container = document.getElementById('rules-list');
  if (!container) return;
  document.getElementById('auto-total').textContent = rules.length;
  document.getElementById('auto-active').textContent = rules.filter(r=>r.isActive).length;
  document.getElementById('auto-runs').textContent = rules.reduce((s,r)=>s+(r.runCount||0),0);
  document.getElementById('auto-rules-count').textContent = `${rules.filter(r=>r.isActive).length} active`;

  if (!rules.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:48px;">
        <div style="font-size:40px;margin-bottom:16px">⚡</div>
        <div style="font-weight:700;margin-bottom:8px;">No automation rules yet</div>
        <div style="color:var(--color-text-secondary);margin-bottom:16px;">Create your first rule to automate business processes</div>
        <button class="btn btn-primary" onclick="loadAutomationTemplates()">Start from Template</button>
      </div>`;
    return;
  }

  const triggerIcons = {
    stock_below_threshold:'📦', stock_zero:'🚨', po_created:'📋', po_approved:'✅',
    grn_received:'🚚', payroll_due:'💰', order_placed:'🛒', new_customer:'👤',
    transfer_requested:'🔄', pr_submitted:'📄', daily_schedule:'📅', weekly_schedule:'🗓️',
  };

  container.innerHTML = rules.map(r => `
    <div style="display:flex;align-items:center;gap:16px;padding:16px;border-bottom:1px solid var(--color-border-subtle);transition:background 0.2s;" onmouseover="this.style.background='var(--color-surface-subtle)'" onmouseout="this.style.background=''">
      <div style="width:40px;height:40px;border-radius:10px;background:${r.isActive?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.05)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
        ${triggerIcons[r.trigger]||'⚡'}
      </div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:14px;">${r.name}</div>
        <div style="font-size:12px;color:var(--color-text-secondary);">${r.description||'No description'}</div>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
          <span style="font-size:10px;background:rgba(99,102,241,0.1);color:var(--color-brand-400);padding:2px 8px;border-radius:99px;font-weight:600;">
            TRIGGER: ${r.trigger?.replace(/_/g,' ').toUpperCase()}
          </span>
          ${r.actions?.map(a => `<span style="font-size:10px;background:rgba(16,185,129,0.1);color:var(--color-success-400);padding:2px 8px;border-radius:99px;font-weight:600;">
            ACTION: ${a.type?.replace(/_/g,' ').toUpperCase()}
          </span>`).join('')||''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <div style="font-size:10px;color:var(--color-text-tertiary)">Runs: ${r.runCount||0}</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <span style="font-size:11px;color:var(--color-text-secondary)">${r.isActive?'Active':'Paused'}</span>
          <div class="toggle-switch ${r.isActive?'active':''}" onclick="toggleRule('${r._id||r.name}', ${!r.isActive})" style="width:36px;height:20px;border-radius:10px;background:${r.isActive?'var(--color-brand-500)':'var(--color-bg-tertiary)'};cursor:pointer;position:relative;transition:background 0.3s;">
            <div style="position:absolute;top:2px;left:${r.isActive?'18px':'2px'};width:16px;height:16px;border-radius:50%;background:white;transition:left 0.3s;"></div>
          </div>
        </label>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-sm btn-ghost" onclick="editRule('${r._id||r.name}')">Edit</button>
          <button class="btn btn-sm btn-ghost" style="color:var(--color-danger-400);" onclick="deleteRule('${r._id||r.name}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.openNewRuleModal = function() {
  Modal.create({
    title: '⚡ Create Automation Rule',
    body: `
      <div class="form-group">
        <label class="form-label">Rule Name</label>
        <input type="text" id="rule-name" class="form-input" placeholder="e.g. Auto Reorder on Low Stock" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" id="rule-desc" class="form-input" placeholder="What does this rule do?" />
      </div>
      <div class="sap-form-grid">
        <div class="form-group">
          <label class="form-label">Trigger (WHEN)</label>
          <select id="rule-trigger" class="form-select">
            <option value="stock_below_threshold">Stock falls below threshold</option>
            <option value="stock_zero">Product out of stock</option>
            <option value="po_created">Purchase Order created</option>
            <option value="grn_received">GRN received</option>
            <option value="payroll_due">Payroll due</option>
            <option value="order_placed">New order placed</option>
            <option value="daily_schedule">Daily schedule</option>
            <option value="weekly_schedule">Weekly schedule</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Action (THEN)</label>
          <select id="rule-action" class="form-select">
            <option value="send_notification">Send notification</option>
            <option value="create_pr">Create purchase requisition</option>
            <option value="log_event">Log audit event</option>
            <option value="trigger_approval">Start approval workflow</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notification Message (for send_notification)</label>
        <input type="text" id="rule-notif-msg" class="form-input" placeholder="Message text..." />
      </div>
      <div style="padding:12px;background:rgba(99,102,241,0.08);border-radius:8px;font-size:12px;color:var(--color-text-secondary);">
        💡 <strong>IFTTT Logic:</strong> WHEN <em>[trigger]</em> THEN <em>[action]</em> — conditions are evaluated automatically
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close(this)">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewRule()">Create Rule</button>
    `
  });
};

window.saveNewRule = async function() {
  const name = document.getElementById('rule-name')?.value;
  if (!name) return Toast.error('Rule name is required');
  const payload = {
    name,
    description: document.getElementById('rule-desc')?.value,
    trigger: document.getElementById('rule-trigger')?.value,
    conditions: [],
    actions: [{
      type: document.getElementById('rule-action')?.value,
      config: { message: document.getElementById('rule-notif-msg')?.value }
    }],
    isActive: true,
  };
  try {
    await Http.post('/automation/rules', payload);
    Toast.success('Automation rule created');
  } catch {
    Toast.info('Automation rule created (demo)');
    DemoRules.push({ ...payload, _id: Date.now(), runCount: 0 });
  }
  Modal.close(document.querySelector('.modal-backdrop'));
  loadAutomationRules();
};

window.toggleRule = async function(id, newState) {
  try {
    await Http.patch(`/automation/rules/${id}`, { isActive: newState });
  } catch {}
  Toast.info(newState ? 'Rule activated' : 'Rule paused');
  loadAutomationRules();
};

window.deleteRule = async function(id) {
  if (!confirm('Delete this automation rule?')) return;
  try {
    await Http.delete(`/automation/rules/${id}`);
    Toast.success('Rule deleted');
  } catch {
    Toast.info('Rule deleted (demo)');
  }
  loadAutomationRules();
};

window.editRule = function(id) { Toast.info(`Opening rule editor for: ${id}`); };

window.loadAutomationTemplates = async function() {
  const templatesSection = document.getElementById('automation-templates-section');
  if (!templatesSection) return;
  templatesSection.style.display = 'block';
  templatesSection.innerHTML = '<div style="padding:20px;text-align:center;color:var(--color-text-secondary)">Loading templates...</div>';

  try {
    const res = await Http.get('/automation/templates');
    const templates = res?.data || [];
    templatesSection.innerHTML = `
      <div class="panel-card" style="padding:0;">
        <div class="panel-header"><span class="panel-title">📋 Rule Templates</span><button class="btn btn-sm btn-ghost" onclick="document.getElementById('automation-templates-section').style.display='none'">✕</button></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:0;">
          ${templates.map(t => `
            <div style="padding:20px;border-bottom:1px solid var(--color-border-subtle);">
              <div style="font-weight:700;margin-bottom:4px;">⚡ ${t.name}</div>
              <div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:12px;">${t.description}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                <span style="font-size:10px;background:rgba(99,102,241,0.1);color:var(--color-brand-400);padding:2px 8px;border-radius:99px;">WHEN: ${t.trigger?.replace(/_/g,' ')}</span>
                ${t.actions?.map(a=>`<span style="font-size:10px;background:rgba(16,185,129,0.1);color:var(--color-success-400);padding:2px 8px;border-radius:99px;">THEN: ${a.type?.replace(/_/g,' ')}</span>`).join('')}
              </div>
              <button class="btn btn-sm btn-primary" onclick="applyTemplate(${JSON.stringify(t).replace(/'/g,"\\'")})" style="width:100%">Use Template</button>
            </div>`).join('')}
        </div>
      </div>
    `;
  } catch {
    templatesSection.innerHTML = '<div style="padding:20px;text-align:center;color:var(--color-text-secondary)">Failed to load templates</div>';
  }
};

window.applyTemplate = async function(template) {
  try {
    await Http.post('/automation/rules', { ...template, isActive: true });
    Toast.success(`Template "${template.name}" applied!`);
  } catch {
    Toast.info(`Template "${template.name}" applied (demo)`);
    DemoRules.unshift({ ...template, _id: Date.now(), runCount: 0, isActive: true });
  }
  document.getElementById('automation-templates-section').style.display = 'none';
  loadAutomationRules();
};

const DemoRules = [
  { _id: 'r1', name: 'Auto Reorder on Low Stock', description: 'Creates PR automatically when stock falls below reorder level', trigger: 'stock_below_threshold', actions: [{ type: 'create_pr' }], isActive: true, runCount: 47, conditions: [] },
  { _id: 'r2', name: 'Out of Stock Alert', description: 'Sends critical notification when stock hits zero', trigger: 'stock_zero', actions: [{ type: 'send_notification' }], isActive: true, runCount: 12, conditions: [] },
  { _id: 'r3', name: 'PO Approval Reminder', description: 'Notify manager of pending PO releases', trigger: 'po_created', actions: [{ type: 'send_notification' }], isActive: false, runCount: 28, conditions: [] },
  { _id: 'r4', name: 'Weekly Payroll Alert', description: 'Remind accountant every Monday', trigger: 'weekly_schedule', actions: [{ type: 'send_notification' }], isActive: true, runCount: 8, conditions: [] },
];

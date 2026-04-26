/**
 * NexaERP — Enterprise Plus Modules (v3.5)
 * CRM, HRMS, Manufacturing, Governance, BI Dashboard, AI Copilot
 */

// ══════════════════════════════════════════════════════════════════
// SECTION 1: CRM & SALES PIPELINE (SAP CRM)
// ══════════════════════════════════════════════════════════════════

function renderCRM() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">CRM & Sales Pipeline</div>
        <div class="page-meta">Leads · Opportunities · Pipeline · Conversion</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-secondary" onclick="renderCRM_Leads()">👥 Lead List</button>
        <button class="btn btn-secondary" onclick="renderCRM_Pipeline()">📊 Pipeline</button>
        <button class="btn btn-primary" onclick="openNewLeadModal()">+ New Lead</button>
      </div>
    </div>

    <!-- CRM KPIs -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px;">
      ${['🚀 New Leads', '📈 Opportunities', '💰 Pipeline Value', '🎯 Win Rate'].map((l,i) => `
        <div class="stat-card">
          <div class="stat-card-value" id="crm-stat-${i}">—</div>
          <div style="font-size:11px;color:var(--color-text-secondary)">${l}</div>
        </div>`).join('')}
    </div>

    <div id="crm-main-view">
      <div class="panel-card" style="padding:0;">
        <div class="panel-header"><span class="panel-title">👥 Active Leads</span></div>
        <div id="leads-list" style="padding:0;overflow-x:auto;">
          <div class="loading-shimmer" style="height:200px;border-radius:8px;"></div>
        </div>
      </div>
    </div>
  `;
  loadCRMData();
}

async function loadCRMData() {
  try {
    const res = await Http.get('/crm/leads');
    const leads = res?.data || DemoCRM.leads;
    
    // Stats
    document.getElementById('crm-stat-0').textContent = leads.length;
    document.getElementById('crm-stat-1').textContent = leads.filter(l => l.status === 'qualified').length;
    document.getElementById('crm-stat-2').textContent = '₹' + Format.number(leads.reduce((s,l) => s + (l.estimatedValue||0), 0));
    document.getElementById('crm-stat-3').textContent = '45%'; // Static demo

    renderLeadsList(leads);
  } catch (err) {
    renderLeadsList(DemoCRM.leads);
  }
}

function renderLeadsList(leads) {
  const container = document.getElementById('leads-list');
  if(!container) return;
  
  if(!leads?.length) {
    container.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-secondary)">No leads found</p>';
    return;
  }

  const statusColors = { new: 'info', contacted: 'warning', qualified: 'success', unqualified: 'danger', converted: 'success', lost: 'danger' };
  
  container.innerHTML = `
    <table class="sap-dense-table">
      <thead><tr><th>Name</th><th>Company</th><th>Source</th><th>Status</th><th>Score</th><th>Est. Value</th><th>Action</th></tr></thead>
      <tbody>${leads.map(l => `<tr>
        <td style="font-weight:600">${l.name}</td>
        <td>${l.company || '—'}</td>
        <td><span class="badge badge-info" style="font-size:9px">${(l.source||'other').toUpperCase()}</span></td>
        <td><span class="badge badge-${statusColors[l.status]||'info'}">${(l.status||'new').toUpperCase()}</span></td>
        <td>
          <div style="width:100px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
            <div style="width:${l.score||0}%;height:100%;background:${l.score > 70 ? 'var(--color-success-400)' : l.score > 40 ? 'var(--color-warning-400)' : 'var(--color-brand-400)'}"></div>
          </div>
        </td>
        <td style="font-weight:700">₹${Format.number(l.estimatedValue||0)}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="viewLeadDetail('${l._id}')">View</button></td>
      </tr>`).join('')}</tbody>
    </table>
  `;
}

window.openNewLeadModal = function() {
  Modal.create({
    title: '👥 Add New Lead',
    body: `
      <div class="sap-form-grid">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="lead-name" class="form-input" placeholder="e.g. John Doe" />
        </div>
        <div class="form-group">
          <label class="form-label">Company</label>
          <input type="text" id="lead-company" class="form-input" placeholder="Organization name" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="lead-email" class="form-input" placeholder="john@example.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Source</label>
          <select id="lead-source" class="form-select">
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="cold_call">Cold Call</option>
            <option value="social">Social Media</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-top:12px;">
        <label class="form-label">Estimated Value (₹)</label>
        <input type="number" id="lead-value" class="form-input" value="0" />
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close(this)">Cancel</button>
      <button class="btn btn-primary" onclick="submitLead()">Save Lead</button>
    `
  });
};

window.submitLead = async function() {
  const payload = {
    name: document.getElementById('lead-name')?.value,
    company: document.getElementById('lead-company')?.value,
    email: document.getElementById('lead-email')?.value,
    source: document.getElementById('lead-source')?.value,
    estimatedValue: +document.getElementById('lead-value')?.value || 0,
  };
  try {
    await Http.post('/crm/leads', payload);
    Toast.success('Lead added successfully');
    Modal.close(document.querySelector('.modal-backdrop'));
    loadCRMData();
  } catch {
    Toast.info('Lead added (demo)');
    Modal.close(document.querySelector('.modal-backdrop'));
    loadCRMData();
  }
};

const DemoCRM = {
  leads: [
    { name: 'Sameer Shah', company: 'Nexus Logistics', source: 'referral', status: 'qualified', score: 85, estimatedValue: 150000, createdAt: new Date() },
    { name: 'Anita Roy', company: 'Global Traders', source: 'website', status: 'new', score: 45, estimatedValue: 50000, createdAt: new Date() },
    { name: 'Karan Mehra', company: 'Skyline Build', source: 'cold_call', status: 'contacted', score: 62, estimatedValue: 280000, createdAt: new Date() },
  ]
};

// ══════════════════════════════════════════════════════════════════
// SECTION 2: HRMS - ATTENDANCE & LEAVE (SAP HCM-TM)
// ══════════════════════════════════════════════════════════════════

function renderHRMS() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">HRMS — Personnel Mgmt</div>
        <div class="page-meta">Attendance · Time Management · Leaves · Holidays</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-success" onclick="hrmsClockIn()">🕒 Clock In</button>
        <button class="btn btn-secondary" onclick="renderHRMS_Leaves()">📅 Leaves</button>
        <button class="btn btn-secondary" onclick="renderHRMS_Attendance()">📊 Attendance Log</button>
      </div>
    </div>

    <!-- Attendance Overview -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
      <div class="panel-card" style="padding:0;">
        <div class="panel-header"><span class="panel-title">📅 Today's Attendance</span></div>
        <div id="attendance-list" style="padding:0;overflow-x:auto;">
          <div class="loading-shimmer" style="height:200px;border-radius:8px;"></div>
        </div>
      </div>
      <div class="panel-card" style="padding:16px;">
        <div class="chart-title">🏖️ Leave Balances</div>
        <div id="leave-balances" style="margin-top:16px;display:grid;gap:12px;">
          ${['Casual Leave', 'Sick Leave', 'Earned Leave'].map(l => `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                <span>${l}</span>
                <span style="font-weight:700;">8/12</span>
              </div>
              <div style="width:100%;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;">
                <div style="width:66%;height:100%;background:var(--color-brand-400);border-radius:3px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary btn-full" style="margin-top:24px;" onclick="openApplyLeaveModal()">🏖️ Apply for Leave</button>
      </div>
    </div>
  `;
  loadHRMSData();
}

async function loadHRMSData() {
  try {
    const res = await Http.get('/hrms/attendance');
    const records = res?.data || DemoHRMS.attendance;
    renderAttendanceList(records);
  } catch {
    renderAttendanceList(DemoHRMS.attendance);
  }
}

function renderAttendanceList(records) {
  const container = document.getElementById('attendance-list');
  if(!container) return;
  
  if(!records?.length) {
    container.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-secondary)">No records found</p>';
    return;
  }

  container.innerHTML = `
    <table class="sap-dense-table">
      <thead><tr><th>Employee</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Status</th></tr></thead>
      <tbody>${records.map(r => `<tr>
        <td style="font-weight:600">${r.employeeName || 'Staff Member'}</td>
        <td>${r.date}</td>
        <td style="color:var(--color-success-400)">${r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—'}</td>
        <td style="color:var(--color-danger-400)">${r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—'}</td>
        <td style="font-weight:700">${(r.hoursWorked||0).toFixed(1)}h</td>
        <td><span class="badge badge-success">${(r.status||'present').toUpperCase()}</span></td>
      </tr>`).join('')}</tbody>
    </table>
  `;
}

window.hrmsClockIn = async function() {
  try {
    await Http.post('/hrms/attendance/clock-in');
    Toast.success('Clock-in successful!');
    loadHRMSData();
  } catch {
    Toast.info('Clock-in recorded (demo)');
    loadHRMSData();
  }
};

window.openApplyLeaveModal = function() {
  Modal.create({
    title: '🏖️ Apply for Leave',
    body: `
      <div class="form-group">
        <label class="form-label">Leave Type</label>
        <select id="leave-type" class="form-select">
          <option value="casual">Casual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="earned">Earned Leave</option>
        </select>
      </div>
      <div class="sap-form-grid">
        <div class="form-group">
          <label class="form-label">From Date</label>
          <input type="date" id="leave-from" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">To Date</label>
          <input type="date" id="leave-to" class="form-input" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Reason</label>
        <textarea id="leave-reason" class="form-input" rows="3" placeholder="Explain your reason..."></textarea>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close(this)">Cancel</button>
      <button class="btn btn-primary" onclick="submitLeaveApplication()">Submit Application</button>
    `
  });
};

window.submitLeaveApplication = async function() {
  const payload = {
    leaveType: document.getElementById('leave-type')?.value,
    from: document.getElementById('leave-from')?.value,
    to: document.getElementById('leave-to')?.value,
    reason: document.getElementById('leave-reason')?.value,
    days: 1, // Logic to calculate days would go here
  };
  try {
    await Http.post('/hrms/leaves/apply', payload);
    Toast.success('Leave application submitted');
    Modal.close(document.querySelector('.modal-backdrop'));
  } catch {
    Toast.info('Leave application submitted (demo)');
    Modal.close(document.querySelector('.modal-backdrop'));
  }
};

const DemoHRMS = {
  attendance: [
    { employeeName: 'Arjun Sharma', date: '2026-04-24', clockIn: new Date(Date.now() - 32400000), clockOut: new Date(), hoursWorked: 9.0, status: 'present' },
    { employeeName: 'Priya Patel', date: '2026-04-24', clockIn: new Date(Date.now() - 28800000), clockOut: null, hoursWorked: 8.0, status: 'present' },
  ]
};

// ══════════════════════════════════════════════════════════════════
// SECTION 3: MANUFACTURING - BOM & PRODUCTION (SAP PP)
// ══════════════════════════════════════════════════════════════════

function renderManufacturing() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Manufacturing Operations</div>
        <div class="page-meta">BOM · Production Orders · Shop Floor · Quality</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-secondary" onclick="renderBOM()">📋 Bill of Materials</button>
        <button class="btn btn-primary" onclick="openNewProductionOrderModal()">+ New Prod Order</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px;">
      <div class="panel-card" style="padding:0;">
        <div class="panel-header"><span class="panel-title">⚙️ Active Production Orders</span></div>
        <div id="production-list" style="padding:0;overflow-x:auto;">
          <div class="loading-shimmer" style="height:200px;border-radius:8px;"></div>
        </div>
      </div>
      <div class="panel-card" style="padding:16px;">
        <div class="chart-title">🛠️ Load by Work Center</div>
        <div id="workcenter-load" style="margin-top:16px;display:grid;gap:12px;">
          ${['Assembly Line 1', 'Packaging', 'Quality Lab'].map((wc, i) => `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                <span>${wc}</span>
                <span style="font-weight:700;">${[85, 42, 15][i]}%</span>
              </div>
              <div style="width:100%;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;">
                <div style="width:${[85, 42, 15][i]}%;height:100%;background:${[85, 42, 15][i] > 80 ? 'var(--color-danger-400)' : 'var(--color-brand-400)'};border-radius:3px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  loadManufacturingData();
}

async function loadManufacturingData() {
  try {
    const res = await Http.get('/manufacturing/production-orders');
    const orders = res?.data || DemoMfg.orders;
    renderProductionList(orders);
  } catch {
    renderProductionList(DemoMfg.orders);
  }
}

function renderProductionList(orders) {
  const container = document.getElementById('production-list');
  if(!container) return;
  
  if(!orders?.length) {
    container.innerHTML = '<p style="text-align:center;padding:32px;color:var(--color-text-secondary)">No orders found</p>';
    return;
  }

  const statusColors = { planned: 'info', released: 'warning', in_progress: 'brand', completed: 'success', cancelled: 'danger' };

  container.innerHTML = `
    <table class="sap-dense-table">
      <thead><tr><th>Order #</th><th>Product</th><th>Qty</th><th>Status</th><th>Priority</th><th>Progress</th><th>Action</th></tr></thead>
      <tbody>${orders.map(o => `<tr>
        <td style="font-family:var(--font-mono);font-weight:700;color:var(--color-brand-400)">${o.orderNumber}</td>
        <td style="font-weight:600">${o.productName || 'Finished Good'}</td>
        <td>${o.quantity} ${o.unit}</td>
        <td><span class="badge badge-${statusColors[o.status]||'info'}">${(o.status||'planned').toUpperCase()}</span></td>
        <td><span class="badge badge-outline" style="font-size:9px">${(o.priority||'medium').toUpperCase()}</span></td>
        <td>
          <div style="width:100px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
            <div style="width:${o.status === 'completed' ? 100 : o.status === 'in_progress' ? 45 : 0}%;height:100%;background:var(--color-brand-400)"></div>
          </div>
        </td>
        <td><button class="btn btn-sm btn-ghost">Manage</button></td>
      </tr>`).join('')}</tbody>
    </table>
  `;
}

const DemoMfg = {
  orders: [
    { orderNumber: 'PRD-2026-101', productName: 'Premium Spice Mix', quantity: 500, unit: 'kg', status: 'in_progress', priority: 'high' },
    { orderNumber: 'PRD-2026-102', productName: 'Organic Basmati 5kg', quantity: 1200, unit: 'bags', status: 'planned', priority: 'medium' },
  ]
};

// ══════════════════════════════════════════════════════════════════
// SECTION 4: GOVERNANCE - RISK & DOCUMENTS (DMS / GRC)
// ══════════════════════════════════════════════════════════════════

function renderGovernance() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Governance & Document Vault</div>
        <div class="page-meta">Risk Management · Document Control · Compliance</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-secondary" onclick="renderGovernance_Risks()">🚩 Risk Map</button>
        <button class="btn btn-primary" onclick="openUploadDocumentModal()">📤 Upload Doc</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="panel-card" style="padding:0;">
        <div class="panel-header"><span class="panel-title">📄 Recent Documents</span></div>
        <div id="document-vault" style="padding:12px;display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:12px;">
          <div class="loading-shimmer" style="height:120px;border-radius:8px;"></div>
        </div>
      </div>
      <div class="panel-card" style="padding:16px;">
        <div class="chart-title">🚩 Top Risks</div>
        <div id="risk-list" style="margin-top:16px;display:grid;gap:8px;">
          <div class="loading-shimmer" style="height:200px;border-radius:8px;"></div>
        </div>
      </div>
    </div>
  `;
  loadGovernanceData();
}

async function loadGovernanceData() {
  try {
    const [riskRes, docRes] = await Promise.all([
      Http.get('/governance/risks'),
      Http.get('/governance/documents')
    ]);
    renderRiskList(riskRes?.data || DemoGov.risks);
    renderDocumentVault(docRes?.data || DemoGov.docs);
  } catch {
    renderRiskList(DemoGov.risks);
    renderDocumentVault(DemoGov.docs);
  }
}

function renderRiskList(risks) {
  const container = document.getElementById('risk-list');
  if(!container) return;
  container.innerHTML = risks.map(r => `
    <div style="background:var(--color-bg-secondary);padding:12px;border-radius:8px;border-left:4px solid ${r.score > 15 ? 'var(--color-danger-400)' : r.score > 8 ? 'var(--color-warning-400)' : 'var(--color-success-400)'}">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;font-size:13px;">${r.title}</span>
        <span class="badge badge-outline">Score: ${r.score}</span>
      </div>
      <div style="font-size:11px;color:var(--color-text-secondary)">P: ${r.probability} × I: ${r.impact} · ${r.category}</div>
    </div>
  `).join('');
}

function renderDocumentVault(docs) {
  const container = document.getElementById('document-vault');
  if(!container) return;
  container.innerHTML = docs.map(d => `
    <div class="nav-item" style="flex-direction:column;align-items:center;padding:12px;height:auto;gap:8px;text-align:center;" onclick="viewDocument('${d._id}')">
      <div style="font-size:32px;">📄</div>
      <div style="font-size:11px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${d.name}</div>
      <div style="font-size:9px;color:var(--color-text-tertiary)">${d.category.toUpperCase()}</div>
    </div>
  `).join('');
}

const DemoGov = {
  risks: [
    { title: 'Supply Chain Disruption', score: 16, probability: 4, impact: 4, category: 'operational' },
    { title: 'Tax Compliance Audit', score: 9, probability: 3, impact: 3, category: 'compliance' },
  ],
  docs: [
    { name: 'Vendor_Contract_HUL.pdf', category: 'contract' },
    { name: 'GST_Return_Q1.pdf', category: 'report' },
    { name: 'Employee_Priya_ID.jpg', category: 'identity' },
  ]
};

// ══════════════════════════════════════════════════════════════════
// SECTION 5: AI COPILOT & BI DASHBOARD
// ══════════════════════════════════════════════════════════════════

function renderExecutiveBI() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Executive BI Dashboard</div>
        <div class="page-meta">Company-wide scorecards · KPI Trends · Anomaly Detection</div>
      </div>
    </div>

    <!-- Executive KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
      ${['Revenue', 'EBITDA', 'Inventory Value', 'Employee Count'].map((l, i) => `
        <div class="stat-card" style="padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div style="font-size:12px;color:var(--color-text-secondary);">${l}</div>
            <div style="color:var(--color-success-400);font-size:11px;font-weight:700;">↑ 12.4%</div>
          </div>
          <div style="font-size:24px;font-weight:900;margin:8px 0;background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${['₹12.4M', '₹3.2M', '₹8.5M', '142'][i]}</div>
          <div style="width:100%;height:30px;opacity:0.3;background:linear-gradient(90deg, transparent, var(--color-brand-500), transparent);"></div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="panel-card" style="padding:24px;">
        <div class="chart-title">📈 Revenue vs Targets (Annual)</div>
        <div style="height:250px;display:flex;align-items:flex-end;gap:10px;padding-bottom:20px;">
           ${Array.from({length:12}).map((_,i) => {
             const h = Math.random()*150 + 50;
             return `<div style="flex:1;background:var(--gradient-brand);height:${h}px;border-radius:4px 4px 0 0;opacity:${i==11?1:0.3}" title="Month ${i+1}"></div>`;
           }).join('')}
        </div>
      </div>
      <div class="panel-card" style="padding:24px;">
         <div class="chart-title">🪄 Nexa AI Insights</div>
         <div style="margin-top:16px;display:grid;gap:12px;">
           <div style="padding:12px;background:rgba(99,102,241,0.1);border-radius:8px;font-size:13px;border-left:4px solid var(--color-brand-400)">
             <strong>💡 Stock Optimization:</strong> Basmati Rice stock is projected to run out in 4 days. Auto-generating PR now.
           </div>
           <div style="padding:12px;background:rgba(16,185,129,0.1);border-radius:8px;font-size:13px;border-left:4px solid var(--color-success-400)">
             <strong>💰 Cash Flow:</strong> Receivables increased by 15% this week. Recommendation: Send dunning letters to 3 customers.
           </div>
           <div style="padding:12px;background:rgba(245,158,11,0.1);border-radius:8px;font-size:13px;border-left:4px solid var(--color-warning-400)">
             <strong>⚠️ Anomaly:</strong> Travel expenses in Branch B are 40% higher than average this month.
           </div>
         </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════
// SECTION 6: AI COPILOT & SHARED UTILS
// ══════════════════════════════════════════════════════════════════

window.openAIAssistant = function() {
  document.getElementById('ai-modal').style.display = 'flex';
  const chat = document.getElementById('ai-chat');
  if(chat.innerHTML === '') {
    addAIMessage('bot', 'Hello! I am **NexaAI**. I have access to your CRM, HRMS, Manufacturing, and Financial data. How can I assist you today?');
  }
};

window.closeAIAssistant = function() {
  document.getElementById('ai-modal').style.display = 'none';
};

window.sendAIMessage = function() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if(!text) return;

  addAIMessage('user', text);
  input.value = '';

  // Simulate AI Thinking
  setTimeout(() => {
    let response = "I'm analyzing that for you...";
    const lowText = text.toLowerCase();
    
    if(lowText.includes('sales') || lowText.includes('revenue')) {
      response = "Based on current trends, your **Revenue** for April is projected to be **₹14.2M**, a 12% increase from March. Top performing branch is **Main Branch**.";
    } else if(lowText.includes('inventory') || lowText.includes('stock')) {
      response = "I see 3 items below safety stock: **Basmati Rice (5kg)**, **Premium Tea**, and **Brown Sugar**. Would you like me to generate purchase requisitions?";
    } else if(lowText.includes('attendance') || lowText.includes('employee')) {
      response = "Today's attendance is **94%**. 3 employees are on planned leave: Arjun, Priya, and Sameer.";
    } else {
      response = "I've logged your request. I can help with **Financial reports**, **Inventory alerts**, **CRM lead scoring**, and **Production schedules**. What would you like to see first?";
    }
    
    addAIMessage('bot', response);
  }, 1000);
};

function addAIMessage(role, text) {
  const chat = document.getElementById('ai-chat');
  const msg = document.createElement('div');
  msg.style.padding = '10px 14px';
  msg.style.borderRadius = '12px';
  msg.style.maxWidth = '85%';
  msg.style.fontSize = '13px';
  msg.style.lineHeight = '1.5';

  if(role === 'user') {
    msg.style.alignSelf = 'flex-end';
    msg.style.background = 'var(--color-brand-500)';
    msg.style.color = 'white';
    msg.textContent = text;
  } else {
    msg.style.alignSelf = 'flex-start';
    msg.style.background = 'rgba(255,255,255,0.05)';
    msg.style.color = 'var(--color-text-primary)';
    msg.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

window.viewDocument = function(id) {
  Toast.info('Opening document preview...');
  // In a real app, this would open a PDF viewer modal
};

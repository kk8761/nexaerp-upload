/**
 * NexaERP â€” Modules.js
 * Renders all remaining modules: Orders, Customers, Staff,
 * Payroll, Suppliers, Accounting, Notifications, Settings
 */

// â”€â”€â”€ ORDERS MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€âfunction renderOrders() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header" style="padding-bottom: 20px;">
      <div>
        <div class="page-heading">List of Sales Orders</div>
        <div class="page-meta">${DemoData.orders.length} standard sales documents (OR)</div>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <div class="btn-group">
          <button class="btn btn-secondary" style="border-radius: 8px 0 0 8px;" onclick="exportCSV(DemoData.orders,'sales_orders.csv')">📦 Local File...</button>
          <button class="btn btn-secondary" style="border-radius: 0 8px 8px 0; border-left: none;" onclick="Toast.info('Opening Print Preview...')">📠 Print Preview</button>
        </div>
        <button class="btn btn-primary" onclick="openNewOrderModal()">+ Create Sales Order</button>
      </div>
    </div>

    <!-- SAP Tool Bar -->
    <div style="background:var(--color-bg-tertiary); padding: 8px 16px; border-radius: 8px 8px 0 0; border: 1px solid var(--color-border-default); border-bottom: none; display: flex; gap: 20px; align-items: center;">
      <div style="display:flex; gap: 8px; align-items: center;">
        <span class="sap-field-label" style="margin:0">Search:</span>
        <input type="text" class="form-input" id="order-search" placeholder="Enter doc ID..." style="width: 200px; padding: 4px 8px; font-size: 12px;" oninput="filterOrders()" />
      </div>
      <div style="display:flex; gap: 8px; align-items: center;">
        <span class="sap-field-label" style="margin:0">Status:</span>
        <select class="form-select" id="order-status" style="width: 120px; padding: 4px 8px; font-size: 12px;" onchange="filterOrders()">
          <option value="">All Entries</option>
          <option value="completed">Completed</option>
          <option value="pending">Open</option>
        </select>
      </div>
      <button class="btn btn-sm btn-ghost" onclick="filterOrders()">🔄 Refresh</button>
    </div>

    <div class="panel-card" style="padding: 0; border-radius: 0 0 8px 8px;">
      <div style="overflow-x:auto">
        <table class="sap-dense-table" id="orders-table">
          <thead>
            <tr>
              <th>SD Doc.</th>
              <th>TrG</th>
              <th>Description</th>
              <th>SaTy</th>
              <th>Sold-to pt</th>
              <th>Status</th>
              <th>Created on</th>
              <th style="width:40px"></th>
            </tr>
          </thead>
          <tbody id="orders-tbody"></tbody>
        </table>
      </div>
    </div>
  `;
  renderOrdersTable();
}

function renderOrdersTable() {
  const search = document.getElementById('order-search')?.value?.toLowerCase() || '';
  const status = document.getElementById('order-status')?.value || '';

  const filtered = DemoData.orders.filter(o => {
    const matchSearch = !search || o.id.toLowerCase().includes(search) || o.customer.toLowerCase().includes(search);
    const matchStatus = !status || o.status === status;
    return matchSearch && matchStatus;
  });

  document.getElementById('orders-tbody').innerHTML = filtered.map(o => `
    <tr oncontextmenu="event.preventDefault(); Toast.info('Right-click menu: [Local File, Copy, Details]')">
      <td style="font-family:var(--font-mono); color:var(--color-brand-400); cursor:pointer" onclick="viewOrder('${o.id}')">${o.id.replace('ORD-','')}</td>
      <td>0</td>
      <td>Standard Sales Order</td>
      <td>OR</td>
      <td>${o.customer}</td>
      <td><span class="badge badge-${o.status==='completed'?'success':'warning'}" style="font-size:10px; padding:2px 6px;">${o.status.toUpperCase()}</span></td>
      <td>${Format.date(o.date)}</td>
      <td style="text-align:center">
        <div style="display:flex; gap:4px">
          <button class="btn btn-sm btn-ghost" style="padding:2px" onclick="viewOrder('${o.id}')">➡️</button>
          <button class="btn btn-sm btn-ghost" style="padding:2px" onclick="printOrderInvoice('${o.id}')">🖨️</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--color-text-secondary)">No orders found</td></tr>';
}

function filterOrders() { renderOrdersTable(); }

function viewOrder(id) {
  const o = DemoData.orders.find(or => or.id === id);
  if (!o) return;
  Modal.create({
    title: `Order â€” ${o.id}`,
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)">
        ${[['Customer',o.customer],['Invoice',o.invoiceNo],['Date',Format.date(o.date)],['Payment',o.payment?.toUpperCase()],['Status',`<span class="badge badge-${o.status==='completed'?'success':'warning'}">${o.status}</span>`],['Total',`<strong style="color:var(--color-brand-400)">${Format.currency(o.total)}</strong>`]].map(([k,v])=>`
          <div style="background:var(--color-bg-secondary);padding:var(--space-3);border-radius:var(--radius-lg)">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${k}</div>
            <div style="font-weight:600;margin-top:2px">${v}</div>
          </div>
        `).join('')}
      </div>
      <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:var(--space-3)">Items Ordered</div>
      ${o.items.map(item=>`
        <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);margin-bottom:var(--space-2);font-size:var(--text-sm)">${item}</div>
      `).join('')}
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Close</button>
      <button class="btn btn-primary" onclick="Toast.success('Invoice sent!');document.querySelector('.modal-backdrop').remove()">ðŸ“± Resend Invoice</button>
    `
  });
}

function printOrderInvoice(id) { Toast.info(`Printing invoice for ${id}...`); }
function openNewOrderModal() { navigateTo('pos'); Toast.info('Navigate to POS to create a new sale'); }

// â”€â”€â”€ CUSTOMERS MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderCustomers() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Customers</div>
        <div class="page-meta">${DemoData.customers.length} total customers</div>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="exportCSV(DemoData.customers,'customers.csv');Toast.success('Exported!')">Export</button>
        <button class="btn btn-primary" onclick="openCustomerModal()">+ Add Customer</button>
      </div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
      ${[
        { label:'Total Customers', value:DemoData.customers.length, icon:'ðŸ‘¥' },
        { label:'VIP Customers', value:DemoData.customers.filter(c=>c.type==='vip').length, icon:'â­' },
        { label:'New This Month', value:DemoData.customers.filter(c=>c.type==='new').length, icon:'ðŸ†•' },
        { label:'Total Revenue', value:Format.currency(DemoData.customers.reduce((s,c)=>s+c.totalSpent,0)), icon:'ðŸ’°' },
      ].map(s=>`
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:28px;margin-bottom:var(--space-2)">${s.icon}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">${s.label}</div>
          <div style="font-size:var(--text-xl);font-weight:700">${s.value}</div>
        </div>
      `).join('')}
    </div>

    <!-- Search -->
    <div style="margin-bottom:var(--space-5)">
      <input type="text" class="form-input" placeholder="Search by name, phone, email..." oninput="filterCustomers(this.value)" style="max-width:360px" />
    </div>

    <!-- Customer Cards Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4)" id="customer-grid">
      ${renderCustomerCards(DemoData.customers)}
    </div>
  `;
}

function renderCustomerCards(customers) {
  const typeColors = { vip:'var(--color-warning-400)', regular:'var(--color-brand-400)', new:'var(--color-success-400)' };
  return customers.map(c => `
    <div class="card" style="cursor:pointer" onclick="viewCustomer('${c.id}')">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
        <div class="avatar avatar-lg" style="background:var(--gradient-brand)">${c.name.split(' ').map(n=>n[0]).join('').toUpperCase()}</div>
        <div>
          <div style="font-weight:700">${c.name}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${c.phone}</div>
          <span class="badge" style="background:${typeColors[c.type]||'var(--color-brand-400)'}22;color:${typeColors[c.type]||'var(--color-brand-400)'};border-color:${typeColors[c.type]||'var(--color-brand-400)'}44;margin-top:4px">${c.type?.toUpperCase()}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        ${[['Orders',c.totalOrders],['Spent',Format.currency(c.totalSpent)],['Points',c.loyaltyPoints+' pts'],['Last Visit',Format.date(c.lastVisit)]].map(([k,v])=>`
          <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
            <div style="font-size:10px;color:var(--color-text-secondary)">${k}</div>
            <div style="font-weight:700;font-size:var(--text-xs)">${v}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--color-text-secondary)">No customers found</div>';
}

function filterCustomers(search) {
  const q = search.toLowerCase();
  const filtered = q ? DemoData.customers.filter(c =>
    c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
  ) : DemoData.customers;
  document.getElementById('customer-grid').innerHTML = renderCustomerCards(filtered);
}

function viewCustomer(id) {
  const c = DemoData.customers.find(cu => cu.id === id);
  if (!c) return;
  Modal.create({
    title: c.name,
    body: `
      <div style="text-align:center;margin-bottom:var(--space-5)">
        <div class="avatar avatar-xl" style="margin:0 auto var(--space-3)">${c.name.split(' ').map(n=>n[0]).join('')}</div>
        <span class="badge badge-primary">${c.type?.toUpperCase()}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        ${[['Phone',c.phone],['Email',c.email||'â€”'],['Address',c.address||'â€”'],['Total Orders',c.totalOrders],['Total Spent',Format.currency(c.totalSpent)],['Loyalty Points',c.loyaltyPoints+' pts'],['Last Visit',Format.date(c.lastVisit)]].map(([k,v])=>`
          <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-3)">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${k}</div>
            <div style="font-weight:600;font-size:var(--text-sm)">${v}</div>
          </div>
        `).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Close</button>
      <button class="btn btn-primary" onclick="navigateTo('pos');document.querySelector('.modal-backdrop').remove()">New Sale for Customer</button>
    `
  });
}

function openCustomerModal() {
  Modal.create({
    title: 'Add New Customer',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group"><label class="form-label">First Name *</label><input type="text" id="nc-fname" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Last Name</label><input type="text" id="nc-lname" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Phone *</label><input type="tel" id="nc-phone" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="nc-email" class="form-input" /></div>
      </div>
      <div class="form-group"><label class="form-label">Address</label><input type="text" id="nc-address" class="form-input" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewCustomer()">Add Customer</button>
    `
  });
}

function saveNewCustomer() {
  const fn = document.getElementById('nc-fname')?.value?.trim();
  const ln = document.getElementById('nc-lname')?.value?.trim();
  const phone = document.getElementById('nc-phone')?.value?.trim();
  if (!fn || !phone) { Toast.error('Name and phone are required'); return; }
  DemoData.customers.push({ id:generateId(), name:`${fn} ${ln}`.trim(), phone, email:document.getElementById('nc-email')?.value||'', address:document.getElementById('nc-address')?.value||'', totalOrders:0, totalSpent:0, loyaltyPoints:0, lastVisit:new Date().toISOString().split('T')[0], type:'new' });
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success('Customer added successfully!');
  renderCustomers();
}

// â”€â”€â”€ STAFF MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderStaff() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Staff Management</div>
        <div class="page-meta">${DemoData.staff.length} employees</div>
      </div>
      <button class="btn btn-primary" onclick="openStaffModal()">+ Add Employee</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--space-4)">
      ${DemoData.staff.map(s => `
        <div class="card">
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
            <div class="avatar avatar-lg">${s.avatar}</div>
            <div>
              <div style="font-weight:700">${s.name}</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${s.role} Â· ${s.dept}</div>
              <div class="status-dot ${s.status==='active'?'status-online':'status-offline'}" style="display:inline-block;margin-top:4px"></div>
              <span style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-left:4px">${s.status}</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
            <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
              <div style="font-size:10px;color:var(--color-text-secondary)">Salary</div>
              <div style="font-weight:700;font-size:var(--text-sm)">${Format.currency(s.salary)}/mo</div>
            </div>
            <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
              <div style="font-size:10px;color:var(--color-text-secondary)">Attendance</div>
              <div style="font-weight:700;font-size:var(--text-sm);color:${s.attendance>=95?'var(--color-success-400)':'var(--color-warning-400)'}">${s.attendance}%</div>
            </div>
          </div>
          <div style="margin-top:var(--space-3)">
            <div style="font-size:10px;color:var(--color-text-secondary);margin-bottom:4px">Attendance</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${s.attendance}%;background:${s.attendance>=95?'var(--gradient-success)':'var(--gradient-warning)'}"></div></div>
          </div>
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">
            <button class="btn btn-sm btn-secondary" style="flex:1" onclick="Toast.info('Calling ${s.name}...')">ðŸ“ž Call</button>
            <button class="btn btn-sm btn-primary" style="flex:1" onclick="openPayrollFor('${s.id}')">ðŸ’° Payroll</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openStaffModal() {
  Modal.create({
    title: 'Add Employee',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group"><label class="form-label">Full Name *</label><input type="text" id="se-name" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Role *</label>
          <select id="se-role" class="form-select">
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
            <option value="storekeeper">Storekeeper</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Phone</label><input type="tel" id="se-phone" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="se-email" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Salary (â‚¹/month) *</label><input type="number" id="se-salary" class="form-input" min="0" /></div>
        <div class="form-group"><label class="form-label">Join Date</label><input type="date" id="se-join" class="form-input" /></div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveStaff()">Add Employee</button>
    `
  });
}

function saveStaff() {
  const name = document.getElementById('se-name')?.value?.trim();
  const role = document.getElementById('se-role')?.value;
  const salary = parseFloat(document.getElementById('se-salary')?.value);
  if (!name || !salary) { Toast.error('Name and salary are required'); return; }
  DemoData.staff.push({ id:generateId(), name, role, dept:'Operations', salary, phone:document.getElementById('se-phone')?.value||'', email:document.getElementById('se-email')?.value||'', joinDate:document.getElementById('se-join')?.value||new Date().toISOString().split('T')[0], status:'active', attendance:100, avatar:name.split(' ').map(n=>n[0]).join('').toUpperCase() });
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success('Employee added!');
  renderStaff();
}

// â”€â”€â”€ PAYROLL MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openPayrollFor(staffId) {
  const s = DemoData.staff.find(st => st.id === staffId);
  if (!s) return;
  const workingDays = 26;
  const presentDays = Math.round(workingDays * s.attendance / 100);
  const basicSalary = s.salary;
  const deductions   = Math.round(basicSalary * 0.12); // PF
  const netSalary    = basicSalary - deductions;

  Modal.create({
    title: `Payroll â€” ${s.name}`,
    body: `
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5)">
        <div class="avatar avatar-lg">${s.avatar}</div>
        <div>
          <div style="font-weight:700">${s.name}</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-secondary)">${s.role} Â· Joined ${Format.date(s.joinDate)}</div>
        </div>
      </div>
      <div style="background:var(--color-bg-secondary);border-radius:var(--radius-xl);padding:var(--space-5)">
        ${[
          ['Working Days', workingDays, ''],
          ['Present Days', presentDays, presentDays < 22 ? 'color:var(--color-warning-400)' : ''],
          ['Basic Salary', Format.currency(basicSalary), ''],
          ['PF Deduction (12%)', `-${Format.currency(deductions)}`, 'color:var(--color-danger-400)'],
          ['Other Deductions','â‚¹0.00',''],
          ['Net Payable', Format.currency(netSalary), 'font-weight:800;font-size:1.1rem;color:var(--color-success-400)'],
        ].map(([k,v,style])=>`
          <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle)">
            <span style="font-size:var(--text-sm);color:var(--color-text-secondary)">${k}</span>
            <span style="font-size:var(--text-sm);font-weight:600;${style}">${v}</span>
          </div>
        `).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="Toast.success('Salary of ${Format.currency(netSalary)} marked as paid for ${s.name}!');document.querySelector('.modal-backdrop').remove()">âœ… Mark as Paid</button>
    `
  });
}

function renderPayroll() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Payroll</div>
        <div class="page-meta">April 2026 Â· ${DemoData.staff.length} employees</div>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <select class="form-select" style="width:auto">
          <option>April 2026</option><option>March 2026</option>
        </select>
        <button class="btn btn-primary" onclick="processAllPayroll()">Process All Payroll</button>
      </div>
    </div>

    <div class="panel-card">
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th><th>Role</th><th>Days Present</th><th>Basic Salary</th><th>Deductions</th><th>Net Payable</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${DemoData.staff.map(s => {
              const net = Math.round(s.salary * 0.88);
              return `
                <tr>
                  <td><div style="display:flex;align-items:center;gap:var(--space-2)"><div class="avatar avatar-sm">${s.avatar}</div>${s.name}</div></td>
                  <td><span class="chip">${s.role}</span></td>
                  <td>${Math.round(26 * s.attendance / 100)}/26</td>
                  <td>${Format.currency(s.salary)}</td>
                  <td style="color:var(--color-danger-400)">-${Format.currency(Math.round(s.salary * 0.12))}</td>
                  <td style="font-weight:700;color:var(--color-success-400)">${Format.currency(net)}</td>
                  <td><span class="badge badge-warning">Pending</span></td>
                  <td><button class="btn btn-sm btn-primary" onclick="openPayrollFor('${s.id}')">Pay</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--color-bg-elevated)">
              <td colspan="5" style="padding:var(--space-3) var(--space-4);font-weight:700;text-align:right">Total Net Payable:</td>
              <td style="padding:var(--space-3) var(--space-4);font-weight:800;color:var(--color-brand-400);font-size:var(--text-lg)">${Format.currency(DemoData.staff.reduce((s,e)=>s+Math.round(e.salary*0.88),0))}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

function processAllPayroll() { Toast.success('All payroll processed for April 2026!'); }

// â”€â”€â”€ SUPPLIERS MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderSuppliers() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Suppliers</div>
        <div class="page-meta">${DemoData.suppliers.length} suppliers</div>
      </div>
      <button class="btn btn-primary" onclick="openSupplierModal()">+ Add Supplier</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-4)">
      ${DemoData.suppliers.map(s => `
        <div class="card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-4)">
            <div>
              <div style="font-weight:700;font-size:var(--text-base)">${s.name}</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:2px">${s.city} Â· ${s.contact}</div>
            </div>
            <span class="badge badge-${s.status==='active'?'success':'gray'}">${s.status}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-4)">
            <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
              <div style="font-size:10px;color:var(--color-text-secondary)">Products</div>
              <div style="font-weight:700">${s.products}</div>
            </div>
            <div style="background:var(--color-bg-secondary);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3)">
              <div style="font-size:10px;color:var(--color-text-secondary)">Outstanding</div>
              <div style="font-weight:700;color:${s.outstanding>0?'var(--color-warning-400)':'var(--color-success-400)'}">${Format.currency(s.outstanding)}</div>
            </div>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:var(--space-3)">
            ðŸ“ž ${s.phone} Â· Last Order: ${Format.date(s.lastOrder)}
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);font-family:monospace;margin-bottom:var(--space-3)">GST: ${s.gst}</div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-sm btn-secondary" style="flex:1" onclick="Toast.info('Creating PO for ${s.name}...')">+ Purchase Order</button>
            ${s.outstanding > 0 ? `<button class="btn btn-sm btn-primary" onclick="Toast.success('Payment recorded for ${s.name}!')">Pay â‚¹${(s.outstanding/1000).toFixed(1)}k</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openSupplierModal() { Toast.info('Supplier form opening...'); }

// â”€â”€â”€ ACCOUNTING MODULE (SAP-style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderAccounting() {
  // Compute from DemoData as fallback
  const income  = DemoData.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = DemoData.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Accounting & Ledger</div><div class="page-meta">SAP-style AR/AP Management</div></div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="exportCSV(DemoData.transactions,'transactions.csv');Toast.success('Exported!')">Export</button>
        <button class="btn btn-primary" onclick="openTransactionModal()">+ Add Transaction</button>
      </div>
    </div>

    <!-- Tab Nav -->
    <div style="display:flex;gap:0;margin-bottom:var(--space-6);border-bottom:2px solid var(--color-border-default)">
      ${['P&L Overview','Accounts Receivable (Money In)','Accounts Payable (Money Out)','Ledger Entries'].map((t,i)=>`
        <button id="acc-tab-${i}" onclick="switchAccTab(${i})"
          style="padding:var(--space-3) var(--space-5);background:none;border:none;cursor:pointer;font-size:var(--text-sm);font-weight:600;${i===0?'color:var(--color-brand-400);border-bottom:2px solid var(--color-brand-400);margin-bottom:-2px':'color:var(--color-text-secondary)'}">
          ${t}
        </button>
      `).join('')}
    </div>

    <!-- P&L Tab (default) -->
    <div id="acc-panel-0">
      <!-- KPI Row -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
        ${[
          { label:'Total Revenue', value:Format.currency(income), color:'var(--color-success-400)', icon:'ðŸ“ˆ' },
          { label:'Total Expenses', value:Format.currency(expense), color:'var(--color-danger-400)', icon:'ðŸ“‰' },
          { label:'Net Profit', value:Format.currency(income-expense), color:income-expense>0?'var(--color-brand-400)':'var(--color-danger-400)', icon:'ðŸ’°' },
          { label:'Profit Margin', value:income>0?((income-expense)/income*100).toFixed(1)+'%':'0%', color:'var(--color-warning-400)', icon:'ðŸ“Š' },
        ].map(s=>`
          <div class="stat-card" style="padding:var(--space-5)">
            <div style="font-size:24px;margin-bottom:var(--space-2)">${s.icon}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px;font-weight:600;text-transform:uppercase">${s.label}</div>
            <div style="font-size:var(--text-xl);font-weight:800;color:${s.color}">${s.value}</div>
          </div>
        `).join('')}
      </div>

      <!-- Income vs Expense breakdown -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
        <div class="panel-card">
          <div style="font-weight:700;margin-bottom:var(--space-4);color:var(--color-success-400)">ðŸ’š Income Breakdown</div>
          ${['Sales Revenue','Service Income','Returns & Refunds','Other Income'].map((cat,i)=>{
            const amt = [income*0.78, income*0.12, -income*0.03, income*0.05][i];
            return `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);font-size:var(--text-sm)">
              <span>${cat}</span><span style="font-weight:700;color:${amt<0?'var(--color-danger-400)':'var(--color-success-400)'}">${amt>=0?'+':''}${Format.currency(Math.abs(amt))}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="panel-card">
          <div style="font-weight:700;margin-bottom:var(--space-4);color:var(--color-danger-400)">â¤ï¸ Expense Breakdown</div>
          ${['Purchase / COGS','Salaries & Wages','Rent & Utilities','Marketing','Other Expenses'].map((cat,i)=>{
            const rates=[0.55,0.20,0.12,0.05,0.08];
            const amt = expense*rates[i];
            return `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);font-size:var(--text-sm)">
              <span>${cat}</span><span style="font-weight:700;color:var(--color-danger-400)">-${Format.currency(amt)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Transaction Table -->
      <div class="panel-card" style="margin-top:var(--space-5)">
        <div style="font-weight:700;margin-bottom:var(--space-4)">ðŸ“‹ Recent Transactions</div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Ref</th><th>Amount</th></tr></thead>
            <tbody>
              ${DemoData.transactions.map(t=>`
                <tr>
                  <td style="font-size:var(--text-xs)">${Format.date(t.date)}</td>
                  <td><span class="badge badge-${t.type==='income'?'success':'danger'}">${t.type}</span></td>
                  <td><span class="chip">${t.category}</span></td>
                  <td style="font-size:var(--text-sm)">${t.description}</td>
                  <td style="font-size:var(--text-xs);font-family:monospace;color:var(--color-text-secondary)">${t.ref}</td>
                  <td style="font-weight:700;${t.type==='income'?'color:var(--color-success-400)':'color:var(--color-danger-400)'}">${t.type==='income'?'+':'-'}${Format.currency(t.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- AR Tab (Money owed TO us) -->
    <div id="acc-panel-1" style="display:none">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-5)">
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">Total Invoiced</div>
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-brand-400)">${Format.currency(DemoData.customers.reduce((s,c)=>s+c.totalSpent,0))}</div>
        </div>
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">Amount Received</div>
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-success-400)">${Format.currency(income)}</div>
        </div>
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">Outstanding (Owed to You)</div>
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-warning-400)">${Format.currency(DemoData.customers.reduce((s,c)=>s+(c.credit||0),0))}</div>
        </div>
      </div>

      <div class="panel-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
          <div style="font-weight:700">ðŸ‘¤ Customers with Outstanding Balance</div>
          <button class="btn btn-sm btn-primary" onclick="openARModal()">+ Create Invoice</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Customer</th><th>Total Spent</th><th>Credit Limit</th><th>Outstanding</th><th>Last Payment</th><th>Action</th></tr></thead>
          <tbody>
            ${DemoData.customers.filter(c=>c.credit>0||true).slice(0,8).map(c=>`
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:var(--space-2)">
                    <div class="avatar avatar-sm" style="background:var(--gradient-brand)">${c.name.split(' ').map(n=>n[0]).join('')}</div>
                    <div><div style="font-weight:600">${c.name}</div><div style="font-size:11px;color:var(--color-text-secondary)">${c.phone}</div></div>
                  </div>
                </td>
                <td style="font-weight:600">${Format.currency(c.totalSpent)}</td>
                <td>${Format.currency(c.credit||0)}</td>
                <td style="font-weight:700;color:${(c.credit||0)>0?'var(--color-warning-400)':'var(--color-success-400)'}">
                  ${(c.credit||0)>0?'âš ï¸ '+Format.currency(c.credit):'âœ… Clear'}
                </td>
                <td style="font-size:var(--text-xs);color:var(--color-text-secondary)">${Format.date(c.lastVisit)}</td>
                <td><button class="btn btn-sm btn-primary" onclick="recordARPayment('${c.id}','${c.name}')">ðŸ’³ Record Payment</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- AP Tab (Money we OWE) -->
    <div id="acc-panel-2" style="display:none">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-5)">
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">Total Ordered</div>
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-brand-400)">${Format.currency(expense*1.2)}</div>
        </div>
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">Amount Paid So Far</div>
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-success-400)">${Format.currency(expense)}</div>
        </div>
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">You Still Owe</div>
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-danger-400)">${Format.currency(DemoData.suppliers.reduce((s,sup)=>s+(sup.outstanding||0),0))}</div>
        </div>
      </div>

      <div class="panel-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
          <div style="font-weight:700">ðŸ­ Supplier Payables</div>
          <button class="btn btn-sm btn-secondary" onclick="exportCSV(DemoData.suppliers,'payables.csv');Toast.success('Exported!')">Export</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Supplier</th><th>Total Business</th><th>Paid So Far</th><th>Outstanding</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${DemoData.suppliers.map((s,i)=>{
              const total = (s.outstanding||0) * (1.8 + i*0.3);
              const paid = total - (s.outstanding||0);
              const daysLeft = [5,12,-3,8][i%4];
              return `
                <tr>
                  <td>
                    <div style="font-weight:600">${s.name}</div>
                    <div style="font-size:11px;color:var(--color-text-secondary)">${s.city} Â· GST: ${s.gst}</div>
                  </td>
                  <td>${Format.currency(total)}</td>
                  <td style="color:var(--color-success-400);font-weight:600">${Format.currency(paid)}</td>
                  <td style="font-weight:700;color:${(s.outstanding||0)>0?'var(--color-danger-400)':'var(--color-success-400)'}">
                    ${(s.outstanding||0)>0?Format.currency(s.outstanding):'âœ… Clear'}
                  </td>
                  <td style="font-size:var(--text-xs);color:${daysLeft<0?'var(--color-danger-400)':daysLeft<7?'var(--color-warning-400)':'var(--color-text-secondary)'}">
                    ${daysLeft<0?`âš ï¸ ${Math.abs(daysLeft)}d overdue`:daysLeft===0?'Due Today':'In '+daysLeft+'d'}
                  </td>
                  <td><span class="badge badge-${(s.outstanding||0)===0?'success':daysLeft<0?'danger':'warning'}">${(s.outstanding||0)===0?'Paid':daysLeft<0?'Overdue':'Pending'}</span></td>
                  <td>
                    ${(s.outstanding||0)>0?`<button class="btn btn-sm btn-primary" onclick="recordAPPayment('${s.id||i}','${s.name}',${s.outstanding||0})">Pay â‚¹${((s.outstanding||0)/1000).toFixed(1)}k</button>`:'<span style="color:var(--color-success-400);font-size:var(--text-xs)">âœ… Settled</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--color-bg-elevated)">
              <td colspan="3" style="padding:var(--space-3) var(--space-4);font-weight:700;text-align:right">Total Outstanding:</td>
              <td style="padding:var(--space-3) var(--space-4);font-weight:800;color:var(--color-danger-400);font-size:var(--text-lg)">${Format.currency(DemoData.suppliers.reduce((s,sup)=>s+(sup.outstanding||0),0))}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Ledger Entries Tab -->
    <div id="acc-panel-3" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5)">
        <div style="font-weight:700;font-size:var(--text-lg)">ðŸ“– Full Ledger Book</div>
        <button class="btn btn-primary" onclick="openTransactionModal()">+ New Entry</button>
      </div>
      <div class="panel-card" style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Type</th><th>Party</th><th>Description</th><th>Debit (Out)</th><th>Credit (In)</th><th>Balance</th></tr></thead>
          <tbody>
            ${(() => {
              let running = 0;
              return DemoData.transactions.map(t => {
                const isCredit = t.type === 'income';
                if(isCredit) running += t.amount; else running -= t.amount;
                return `<tr>
                  <td style="font-size:var(--text-xs)">${Format.date(t.date)}</td>
                  <td><span class="badge badge-${isCredit?'success':'danger'}">${isCredit?'CR':'DR'}</span></td>
                  <td style="font-size:var(--text-xs);color:var(--color-text-secondary)">${t.ref||'â€”'}</td>
                  <td style="font-size:var(--text-sm)">${t.description}</td>
                  <td style="color:var(--color-danger-400);font-weight:600">${!isCredit?Format.currency(t.amount):'â€”'}</td>
                  <td style="color:var(--color-success-400);font-weight:600">${isCredit?Format.currency(t.amount):'â€”'}</td>
                  <td style="font-weight:700;color:${running>=0?'var(--color-brand-400)':'var(--color-danger-400)'}">${Format.currency(running)}</td>
                </tr>`;
              }).join('');
            })()}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

let _accTab = 0;
function switchAccTab(idx) {
  for(let i=0;i<4;i++) {
    const panel = document.getElementById(`acc-panel-${i}`);
    const tab   = document.getElementById(`acc-tab-${i}`);
    if(panel) panel.style.display = i===idx ? '' : 'none';
    if(tab) {
      tab.style.color = i===idx ? 'var(--color-brand-400)' : 'var(--color-text-secondary)';
      tab.style.borderBottom = i===idx ? '2px solid var(--color-brand-400)' : 'none';
      tab.style.marginBottom = i===idx ? '-2px' : '0';
    }
  }
  _accTab = idx;
}

function recordARPayment(customerId, name) {
  Modal.create({
    title: `ðŸ’³ Record Payment from ${name}`,
    body: `
      <div class="form-group"><label class="form-label">Amount Received (â‚¹) *</label><input type="number" id="ar-amount" class="form-input" min="1" placeholder="0.00" /></div>
      <div class="form-group"><label class="form-label">Payment Mode</label>
        <select id="ar-mode" class="form-select"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option></select>
      </div>
      <div class="form-group"><label class="form-label">Reference / UTR</label><input type="text" id="ar-ref" class="form-input" placeholder="UPI Ref / Cheque No" /></div>
      <div class="form-group"><label class="form-label">Note</label><input type="text" id="ar-note" class="form-input" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveARPayment('${customerId}','${name}')">âœ… Record Payment</button>
    `
  });
}

function saveARPayment(id, name) {
  const amount = parseFloat(document.getElementById('ar-amount')?.value);
  const mode   = document.getElementById('ar-mode')?.value;
  const ref    = document.getElementById('ar-ref')?.value;
  if(!amount||amount<=0) { Toast.error('Enter a valid amount'); return; }

  // Update in demo data
  const c = DemoData.customers.find(cu=>cu.id===id);
  if(c) { c.credit = Math.max(0, (c.credit||0) - amount); }

  // Also try backend
  Http.post('/ledger', {
    type:'payment_received', partyType:'customer',
    partyName: name, invoiceAmount: amount, description: `Payment from ${name}`,
    payments: [{ amount, mode, reference: ref }]
  }).catch(()=>{});

  DemoData.transactions.unshift({ id:'T'+Date.now(), date:new Date().toISOString().split('T')[0], type:'income', category:'Receivables', description:`Payment from ${name}`, amount, ref:ref||'MANUAL' });

  document.querySelector('.modal-backdrop')?.remove();
  Toast.success(`âœ… â‚¹${Format.currency(amount)} received from ${name}!`);
  renderAccounting();
}

function recordAPPayment(supplierId, name, outstanding) {
  Modal.create({
    title: `ðŸ’¸ Pay ${name}`,
    body: `
      <div style="background:rgba(239,68,68,0.08);border-radius:var(--radius-lg);padding:var(--space-4);margin-bottom:var(--space-4)">
        <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Outstanding to ${name}</div>
        <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-danger-400)">${Format.currency(outstanding)}</div>
      </div>
      <div class="form-group"><label class="form-label">Amount to Pay (â‚¹) *</label><input type="number" id="ap-amount" class="form-input" min="1" value="${outstanding}" /></div>
      <div class="form-group"><label class="form-label">Payment Mode</label>
        <select id="ap-mode" class="form-select"><option>Bank Transfer</option><option>Cheque</option><option>Cash</option><option>UPI</option></select>
      </div>
      <div class="form-group"><label class="form-label">Reference / UTR</label><input type="text" id="ap-ref" class="form-input" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-danger" onclick="saveAPPayment('${supplierId}','${name}')">ðŸ’¸ Confirm Payment</button>
    `
  });
}

function saveAPPayment(id, name) {
  const amount = parseFloat(document.getElementById('ap-amount')?.value);
  const mode   = document.getElementById('ap-mode')?.value;
  const ref    = document.getElementById('ap-ref')?.value;
  if(!amount||amount<=0) { Toast.error('Enter valid amount'); return; }

  const s = DemoData.suppliers.find(su=>su.id===id||su.id===parseInt(id));
  if(s) s.outstanding = Math.max(0, (s.outstanding||0) - amount);

  DemoData.transactions.unshift({ id:'T'+Date.now(), date:new Date().toISOString().split('T')[0], type:'expense', category:'Payables', description:`Payment to ${name}`, amount, ref:ref||'AP' });

  Http.post('/ledger', { type:'payment_made', partyType:'supplier', partyName:name, invoiceAmount:amount, description:`Payment to ${name}`, payments:[{amount,mode,reference:ref}] }).catch(()=>{});

  document.querySelector('.modal-backdrop')?.remove();
  Toast.success(`âœ… Paid â‚¹${Format.currency(amount)} to ${name}!`);
  renderAccounting();
}

function openARModal() {
  Modal.create({
    title: 'ðŸ“„ Create Invoice (Accounts Receivable)',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group"><label class="form-label">Customer Name *</label><input type="text" id="inv-party" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Invoice Amount (â‚¹) *</label><input type="number" id="inv-amount" class="form-input" min="0" /></div>
        <div class="form-group"><label class="form-label">Due Date</label><input type="date" id="inv-due" class="form-input" /></div>
        <div class="form-group"><label class="form-label">Category</label>
          <select id="inv-cat" class="form-select"><option>Sales</option><option>Services</option><option>Other</option></select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Description *</label><input type="text" id="inv-desc" class="form-input" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveARInvoice()">Create Invoice</button>
    `
  });
}

function saveARInvoice() {
  const party  = document.getElementById('inv-party')?.value?.trim();
  const amount = parseFloat(document.getElementById('inv-amount')?.value);
  const desc   = document.getElementById('inv-desc')?.value?.trim();
  if(!party||!amount||!desc) { Toast.error('All required fields must be filled'); return; }

  DemoData.transactions.unshift({ id:'INV'+Date.now(), date:new Date().toISOString().split('T')[0], type:'income', category:document.getElementById('inv-cat')?.value||'Sales', description:`Invoice: ${desc} â€” ${party}`, amount, ref:'INV'+Date.now() });

  document.querySelector('.modal-backdrop')?.remove();
  Toast.success(`Invoice for â‚¹${Format.currency(amount)} raised for ${party}!`);
  renderAccounting();
}

function openTransactionModal() {
  Modal.create({
    title: 'Record Transaction',
    body: `
      <div class="form-group"><label class="form-label">Type *</label>
        <select id="tr-type" class="form-select"><option value="income">Income (Money In)</option><option value="expense">Expense (Money Out)</option></select>
      </div>
      <div class="form-group"><label class="form-label">Category *</label>
        <select id="tr-cat" class="form-select">
          <option>Sales</option><option>Purchase</option><option>Rent</option><option>Utilities</option><option>Salary</option><option>Receivables</option><option>Payables</option><option>Other</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Description *</label><input type="text" id="tr-desc" class="form-input" /></div>
      <div class="form-group"><label class="form-label">Amount (â‚¹) *</label><input type="number" id="tr-amount" class="form-input" min="0" step="0.01" /></div>
      <div class="form-group"><label class="form-label">Date</label><input type="date" id="tr-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveTransaction()">Save</button>
    `
  });
}

function saveTransaction() {
  const type   = document.getElementById('tr-type')?.value;
  const amount = parseFloat(document.getElementById('tr-amount')?.value);
  const desc   = document.getElementById('tr-desc')?.value?.trim();
  if(!desc||!amount) { Toast.error('Description and amount are required'); return; }
  DemoData.transactions.unshift({ id:'T'+Date.now(), date:document.getElementById('tr-date')?.value, type, category:document.getElementById('tr-cat')?.value, description:desc, amount, ref:'MANUAL' });

  // Try backend
  Http.post('/transactions', { type, category:document.getElementById('tr-cat')?.value, description:desc, amount }).catch(()=>{});

  document.querySelector('.modal-backdrop')?.remove();
  Toast.success('Transaction recorded!');
  renderAccounting();
}

// â”€â”€â”€ NOTIFICATIONS MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderNotifications() {
  document.getElementById('page-body').innerHTML = `
    <div style="max-width:680px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
        <div class="page-heading">All Notifications</div>
        <button class="btn btn-secondary" onclick="markAllNotifsRead()">Mark All Read</button>
      </div>
      <div id="all-notifs-list"><div style="text-align:center;padding:40px;color:var(--color-text-secondary)">Loading...</div></div>
    </div>
  `;
  loadAllNotifications();
}

async function loadAllNotifications() {
  let notifs = [];
  try {
    const res = await Http.get('/notifications?limit=50');
    if(res?.success) notifs = res.data;
  } catch {}
  if(!notifs.length) notifs = DemoData.notifications.map(n=>({
    _id:n.id, type:n.type||'system', priority:n.type==='warning'?'high':'medium',
    title:n.title, message:n.message, icon:n.icon, isRead:n.read, createdAt:n.time
  }));

  const list = document.getElementById('all-notifs-list');
  if(!list) return;
  list.innerHTML = notifs.map(n=>`
    <div class="panel-card" style="margin-bottom:var(--space-3);${!n.isRead?'border-left:3px solid var(--color-brand-500)':''}">
      <div style="display:flex;gap:var(--space-4);padding:var(--space-4)">
        <div style="width:44px;height:44px;border-radius:var(--radius-xl);background:${n.priority==='critical'?'rgba(239,68,68,0.15)':n.type==='warning'?'rgba(234,179,8,0.15)':n.type==='success'?'rgba(34,197,94,0.15)':'rgba(99,102,241,0.15)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${n.icon||'ðŸ””'}</div>
        <div style="flex:1">
          <div style="font-weight:${n.isRead?'500':'700'};margin-bottom:4px">${n.title}</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:4px">${n.message}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary)">${Format.relativeTime(n.createdAt)}</div>
        </div>
        ${!n.isRead?`<div class="status-dot status-online" style="flex-shrink:0;margin-top:6px"></div>`:''}
      </div>
    </div>
  `).join('') || '<div style="text-align:center;padding:40px;color:var(--color-text-secondary)">ðŸŽ‰ All caught up!</div>';
}

async function markAllNotifsRead() {
  try { await Http.post('/notifications/read-all'); } catch {}
  DemoData.notifications.forEach(n=>n.read=true);
  NotificationManager._count = 0;
  NotificationManager.updateBadge();
  loadAllNotifications();
  Toast.success('All notifications marked as read!');
}

// â”€â”€â”€ CHAT MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Chat = {
  currentRoom: null,
  rooms: [
    { id:'room-staff',    name:'Staff General',     icon:'ðŸ‘¥', type:'group',     unread:3, last:'Check today\'s schedule' },
    { id:'room-mgmt',     name:'Management',        icon:'ðŸ‘”', type:'group',     unread:0, last:'Monthly review done' },
    { id:'room-ops',      name:'Operations',        icon:'âš™ï¸', type:'group',     unread:1, last:'Delivery at 4pm' },
    { id:'room-vendor-1', name:'Reckitt Benckiser', icon:'ðŸ­', type:'vendor',    unread:2, last:'PO #1042 confirmed âœ…' },
    { id:'room-vendor-2', name:'HUL Distributor',   icon:'ðŸ­', type:'vendor',    unread:0, last:'Invoice attached' },
    { id:'room-broadcast',name:'Announcements',     icon:'ðŸ“¢', type:'broadcast', unread:0, last:'Store open 8am-10pm' },
  ],
  messages: {
    'room-staff': [
      { id:'m1', sender:'Priya K.', role:'Cashier', content:'Good morning team! Ready for the day ðŸŒ…', time:new Date(Date.now()-3600000), self:false },
      { id:'m2', sender:'Rajesh M.', role:'Manager', content:'Reminder: stock audit at 2pm today. All hands needed ðŸ“¦', time:new Date(Date.now()-3000000), self:false },
      { id:'m3', sender:'You', role:'Owner', content:'Great! I\'ll be there. Also check the expired items list I sent', time:new Date(Date.now()-2400000), self:true },
      { id:'m4', sender:'Priya K.', role:'Cashier', content:'On it! The Maggi section also needs restocking ðŸ‘', time:new Date(Date.now()-1800000), self:false },
    ],
    'room-vendor-1': [
      { id:'v1', sender:'Reckitt Rep', role:'Vendor', content:'Your PO #1042 has been confirmed. Dispatch tomorrow morning ðŸšš', time:new Date(Date.now()-5400000), self:false },
      { id:'v2', sender:'You', role:'Owner', content:'Great! Please ensure Dettol (1L x 24) is included', time:new Date(Date.now()-4800000), self:true },
      { id:'v3', sender:'Reckitt Rep', role:'Vendor', content:'Confirmed âœ… Will also include the new Surf Excel promo packs', time:new Date(Date.now()-4200000), self:false },
    ],
    'room-broadcast': [
      { id:'b1', sender:'Store Owner', role:'Owner', content:'ðŸ“¢ Store timings: Mon-Sat 8AM-10PM, Sunday 9AM-8PM', time:new Date(Date.now()-86400000*2), self:true },
      { id:'b2', sender:'Store Owner', role:'Owner', content:'ðŸŽ‰ We hit â‚¹50,000 in daily sales yesterday! Great work team!', time:new Date(Date.now()-86400000), self:true },
    ]
  },
};

function renderChat() {
  document.getElementById('page-body').innerHTML = `
    <div style="height:calc(100vh - 140px);display:flex;gap:0;border-radius:var(--radius-2xl);overflow:hidden;border:1px solid var(--color-border-default)">

      <!-- Sidebar -->
      <div style="width:280px;flex-shrink:0;background:var(--color-bg-secondary);border-right:1px solid var(--color-border-subtle);display:flex;flex-direction:column">
        <!-- Header -->
        <div style="padding:var(--space-4);border-bottom:1px solid var(--color-border-subtle)">
          <div style="font-weight:700;font-size:var(--text-base);margin-bottom:var(--space-3)">ðŸ’¬ Messenger</div>
          <input type="text" class="form-input" placeholder="Search conversations..." style="font-size:var(--text-xs)" oninput="filterChatRooms(this.value)" />
        </div>

        <!-- Room List -->
        <div style="flex:1;overflow-y:auto" id="chat-room-list">
          ${renderChatRooms(Chat.rooms)}
        </div>

        <!-- New Chat -->
        <div style="padding:var(--space-3);border-top:1px solid var(--color-border-subtle)">
          <button class="btn btn-primary" style="width:100%" onclick="openNewChatModal()">+ New Chat</button>
        </div>
      </div>

      <!-- Chat Area -->
      <div style="flex:1;display:flex;flex-direction:column;background:var(--color-bg-primary)" id="chat-main">
        <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary)">
          <div style="text-align:center">
            <div style="font-size:48px;margin-bottom:var(--space-3)">ðŸ’¬</div>
            <div style="font-weight:600">Select a conversation</div>
            <div style="font-size:var(--text-sm);margin-top:8px">Chat with employees, managers, or vendors</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderChatRooms(rooms) {
  const typeColors = { group:'#6366f1', vendor:'#10b981', broadcast:'#f59e0b', direct:'#a855f7' };
  return rooms.map(r=>`
    <div id="room-${r.id}" onclick="openChatRoom('${r.id}')"
      style="padding:var(--space-3) var(--space-4);cursor:pointer;border-bottom:1px solid var(--color-border-subtle);transition:background 0.15s;${Chat.currentRoom===r.id?'background:rgba(99,102,241,0.1)':''}">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <div style="width:42px;height:42px;border-radius:var(--radius-xl);background:${typeColors[r.type]||'#6366f1'}22;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;border:1.5px solid ${typeColors[r.type]||'#6366f1'}44">${r.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="font-weight:600;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</div>
            ${r.unread>0?`<span style="background:var(--color-brand-500);color:white;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">${r.unread}</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">${r.last||'No messages yet'}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function filterChatRooms(q) {
  const filtered = q ? Chat.rooms.filter(r=>r.name.toLowerCase().includes(q.toLowerCase())) : Chat.rooms;
  document.getElementById('chat-room-list').innerHTML = renderChatRooms(filtered);
}

function openChatRoom(roomId) {
  Chat.currentRoom = roomId;
  const room = Chat.rooms.find(r=>r.id===roomId);
  if(!room) return;

  // Mark as read
  room.unread = 0;
  // Refresh room list
  document.getElementById('chat-room-list').innerHTML = renderChatRooms(Chat.rooms);

  const messages = Chat.messages[roomId] || [];
  const typeColors = { group:'#6366f1', vendor:'#10b981', broadcast:'#f59e0b', direct:'#a855f7' };

  document.getElementById('chat-main').innerHTML = `
    <!-- Chat Header -->
    <div style="padding:var(--space-4);border-bottom:1px solid var(--color-border-subtle);display:flex;align-items:center;gap:var(--space-3);background:var(--color-bg-secondary)">
      <div style="width:40px;height:40px;border-radius:var(--radius-xl);background:${typeColors[room.type]||'#6366f1'}22;display:flex;align-items:center;justify-content:center;font-size:20px">${room.icon}</div>
      <div style="flex:1">
        <div style="font-weight:700">${room.name}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${room.type==='vendor'?'Vendor':'Group'} Â· ${room.type==='broadcast'?'Announcements channel':'Click to view members'}</div>
      </div>
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-sm btn-ghost" onclick="Toast.info('Voice call starting...')" title="Voice Call">ðŸ“ž</button>
        <button class="btn btn-sm btn-ghost" onclick="sharePOInChat('${roomId}')" title="Share PO">ðŸ“‹</button>
      </div>
    </div>

    <!-- Messages -->
    <div style="flex:1;overflow-y:auto;padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3)" id="chat-messages">
      ${messages.map(msg=>renderChatMessage(msg)).join('')}
    </div>

    <!-- Composer -->
    <div style="padding:var(--space-3) var(--space-4);border-top:1px solid var(--color-border-subtle);display:flex;align-items:center;gap:var(--space-2);background:var(--color-bg-secondary)">
      <button class="btn btn-sm btn-ghost" onclick="Toast.info('File sharing coming soon!')" style="flex-shrink:0">ðŸ“Ž</button>
      <input type="text" id="chat-input" class="form-input" style="flex:1"
        placeholder="Type a message..."
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMessage('${roomId}')}" />
      <button class="btn btn-sm btn-ghost" onclick="insertEmoji()" style="flex-shrink:0">ðŸ˜Š</button>
      <button class="btn btn-sm btn-primary" onclick="sendChatMessage('${roomId}')" style="flex-shrink:0">Send â†‘</button>
    </div>
  `;

  // Scroll to bottom
  setTimeout(() => {
    const msgs = document.getElementById('chat-messages');
    if(msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 50);
}

function renderChatMessage(msg) {
  const isSelf = msg.self;
  return `
    <div style="display:flex;align-items:flex-end;gap:var(--space-2);${isSelf?'flex-direction:row-reverse':'flex-direction:row'}">
      ${!isSelf?`<div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;color:white">${msg.sender.split(' ').map(n=>n[0]).join('')}</div>`:''}
      <div style="max-width:70%">
        ${!isSelf?`<div style="font-size:10px;color:var(--color-text-secondary);margin-bottom:2px">${msg.sender} Â· ${msg.role||''}</div>`:''}
        <div style="padding:var(--space-2) var(--space-4);border-radius:${isSelf?'var(--radius-xl) var(--radius-xl) 4px var(--radius-xl)':'var(--radius-xl) var(--radius-xl) var(--radius-xl) 4px'};background:${isSelf?'var(--color-brand-500)':'var(--color-bg-elevated)'};color:${isSelf?'white':'var(--color-text-primary)'};font-size:var(--text-sm);line-height:1.5;word-break:break-word">
          ${msg.content}
        </div>
        <div style="font-size:10px;color:var(--color-text-tertiary);margin-top:2px;${isSelf?'text-align:right':''}">${Format.relativeTime(msg.time)} ${isSelf?'âœ“âœ“':''}</div>
      </div>
    </div>
  `;
}

function sendChatMessage(roomId) {
  const input = document.getElementById('chat-input');
  const content = input?.value?.trim();
  if(!content) return;

  // Add to local messages
  if(!Chat.messages[roomId]) Chat.messages[roomId] = [];
  const msg = { id:'m'+Date.now(), sender:'You', role:'Owner', content, time:new Date(), self:true };
  Chat.messages[roomId].push(msg);

  // Update room last message
  const room = Chat.rooms.find(r=>r.id===roomId);
  if(room) room.last = content.substring(0,40);

  // Append to UI
  const msgsDiv = document.getElementById('chat-messages');
  if(msgsDiv) {
    msgsDiv.insertAdjacentHTML('beforeend', renderChatMessage(msg));
    msgsDiv.scrollTop = msgsDiv.scrollHeight;
  }

  // Clear input
  input.value = '';

  // Try real socket/API
  try {
    const io = window._socket;
    if(io) io.emit('send_message', { roomId, content });
    Http.post(`/messages/${roomId}`, { content }).catch(()=>{});
  } catch {}

  // Simulate reply after 1-2s for vendors
  if(roomId.startsWith('room-vendor')) {
    setTimeout(() => {
      const replies = [
        'âœ… Noted! Will update the dispatch details.',
        'Sure, let me check with our warehouse team.',
        'The delivery will arrive by 11am tomorrow ðŸšš',
        'Invoice will be emailed tonight.',
      ];
      const replyMsg = { id:'m'+Date.now(), sender:room?.name||'Vendor', role:'Vendor', content:replies[Math.floor(Math.random()*replies.length)], time:new Date(), self:false };
      Chat.messages[roomId].push(replyMsg);
      const md = document.getElementById('chat-messages');
      if(md && Chat.currentRoom===roomId) {
        md.insertAdjacentHTML('beforeend', renderChatMessage(replyMsg));
        md.scrollTop = md.scrollHeight;
      }
    }, 1500 + Math.random()*1000);
  }
}

function sharePOInChat(roomId) {
  const content = `ðŸ“‹ Purchase Order #PO-${Date.now().toString().slice(-6)}\nâœ… Contains: Maggi 2min (x48), Dettol 1L (x24), Horlicks (x12)\nðŸ’° Total: â‚¹12,450\nðŸ—“ï¸ Expected Delivery: Tomorrow 10AM`;
  const input = document.getElementById('chat-input');
  if(input) input.value = content;
  Toast.info('PO details added to message! Press Send to share');
}

function insertEmoji() {
  const emojis = ['ðŸ‘','âœ…','ðŸš€','ðŸ“¦','ðŸ’°','ðŸŽ‰','âš ï¸','ðŸ“‹','ðŸ­','ðŸ’³'];
  const emoji = emojis[Math.floor(Math.random()*emojis.length)];
  const input = document.getElementById('chat-input');
  if(input) { input.value += emoji; input.focus(); }
}

function openNewChatModal() {
  Modal.create({
    title: '+ New Conversation',
    body: `
      <div class="form-group"><label class="form-label">Chat Type</label>
        <select id="nc-type" class="form-select">
          <option value="direct">Direct Message</option>
          <option value="group">Group Chat</option>
          <option value="vendor">Vendor Channel</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Name *</label><input type="text" id="nc-name" class="form-input" placeholder="Chat name or person" /></div>
      <div class="form-group"><label class="form-label">Icon (emoji)</label><input type="text" id="nc-icon" class="form-input" placeholder="ðŸ’¬" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="createNewChat()">Create Chat</button>
    `
  });
}

function createNewChat() {
  const type = document.getElementById('nc-type')?.value || 'group';
  const name = document.getElementById('nc-name')?.value?.trim();
  const icon = document.getElementById('nc-icon')?.value?.trim() || 'ðŸ’¬';
  if(!name) { Toast.error('Name is required'); return; }

  const newRoom = { id:'room-'+Date.now(), name, icon, type, unread:0, last:'New conversation' };
  Chat.rooms.push(newRoom);
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success(`Chat "${name}" created!`);
  renderChat();
  setTimeout(()=>openChatRoom(newRoom.id), 100);
}

// â”€â”€â”€ SETTINGS MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderSettings() {
  const user = Auth.getUser() || {};

  document.getElementById('page-body').innerHTML = `
    <div style="display:grid;grid-template-columns:220px 1fr;gap:var(--space-6)">

      <!-- Settings Nav -->
      <div>
        ${['Business Profile','Store Settings','Users & Roles','Tax & GST','Payment Methods','Notifications','Security','Integrations','Billing & Plan'].map((s,i) => `
          <button onclick="showSettingsSection('${s}')" class="nav-item" style="width:100%;border-radius:var(--radius-lg);margin-bottom:4px;text-align:left;${i===0?'background:rgba(99,102,241,0.1);color:var(--color-brand-400)':''}">${s}</button>
        `).join('')}
      </div>

      <!-- Settings Content -->
      <div>
        <div class="panel-card" style="padding:var(--space-8)">
          <h3 style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;margin-bottom:var(--space-6)">Business Profile</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
            <div class="form-group"><label class="form-label">Business Name</label><input type="text" class="form-input" value="${user.business||'My Business'}" /></div>
            <div class="form-group"><label class="form-label">Business Type</label><select class="form-select"><option>Grocery Store</option><option>Pharmacy</option><option>Restaurant</option><option>Hostel</option><option>School</option></select></div>
            <div class="form-group"><label class="form-label">Owner Name</label><input type="text" class="form-input" value="${user.name||''}" /></div>
            <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" value="${user.email||''}" /></div>
            <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="form-input" placeholder="+91 9876543210" /></div>
            <div class="form-group"><label class="form-label">GSTIN</label><input type="text" class="form-input" placeholder="27AABCN1234Z1ZI" /></div>
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">Address</label><input type="text" class="form-input" placeholder="Shop address" /></div>
            <div class="form-group"><label class="form-label">Currency</label><select class="form-select"><option value="INR">â‚¹ INR (Indian Rupee)</option><option value="USD">$ USD</option></select></div>
            <div class="form-group"><label class="form-label">Financial Year</label><select class="form-select"><option>April - March</option><option>January - December</option></select></div>
          </div>
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6)">
            <button class="btn btn-primary" onclick="Toast.success('Settings saved successfully!')">ðŸ’¾ Save Changes</button>
            <button class="btn btn-secondary" onclick="openThemePicker()">ðŸŽ¨ Change Theme</button>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="panel-card" style="padding:var(--space-6);margin-top:var(--space-4);border-color:rgba(239,68,68,0.3)">
          <h4 style="color:var(--color-danger-400);margin-bottom:var(--space-4)">âš ï¸ Danger Zone</h4>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-weight:600;font-size:var(--text-sm)">Sign Out from All Devices</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">This will invalidate all active sessions</div>
            </div>
            <button class="btn btn-danger" onclick="Auth.clearSession();window.location.href='index.html'">Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showSettingsSection(name) { Toast.info(`Opening ${name} settings...`); }


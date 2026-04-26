/**
 * NexaERP — SAP Parity Modules
 * GST, Purchase Orders, Payroll+HR, Cost Centers, Assets
 */

// ─── ENHANCED ANALYTICS (SAP BI) ─────────────────────────────
function renderAnalytics() {
  const totalRev = 142800, totalProfit = 28600;
  const dailyRev = [18200,22450,19800,24100,21300,28500,8420,19100,22300,25400,18900,21700,23400,26100,24500];
  const cats = DemoData.categories || ['Packaged Foods','Beverages','Dairy','Personal Care','Household'];
  const catRevs = [52000,38000,22000,18000,12800];

  document.getElementById('page-body').innerHTML = `
    <!-- KPI Bar -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
      ${[
        { label:'Revenue MTD', value:Format.currency(totalRev), delta:'+18.7%', icon:'📈', color:'#6366f1' },
        { label:'Net Profit',  value:Format.currency(totalProfit), delta:'+22.1%', icon:'💰', color:'#10b981' },
        { label:'Gross Margin', value:((totalProfit/totalRev)*100).toFixed(1)+'%', delta:'+0.8pp', icon:'📊', color:'#a855f7' },
        { label:'Avg Order Value', value:Format.currency(Math.round(totalRev/487)), delta:'+5.2%', icon:'🛒', color:'#f59e0b' },
        { label:'Active Customers', value:'1,284', delta:'+12.3%', icon:'👥', color:'#ec4899' },
      ].map(s=>`
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:24px;margin-bottom:var(--space-2)">${s.icon}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px;font-weight:600;text-transform:uppercase">${s.label}</div>
          <div style="font-size:var(--text-xl);font-weight:800;color:${s.color}">${s.value}</div>
          <div style="font-size:var(--text-xs);color:var(--color-success-400);margin-top:4px">${s.delta} vs last period</div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-5);margin-bottom:var(--space-5)">
      <!-- SVG Revenue Trend Chart -->
      <div class="panel-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
          <div style="font-weight:700">📈 Daily Revenue — Last 15 Days</div>
          <div style="display:flex;gap:var(--space-2)">
            ${['Week','Month','Quarter'].map((p,i)=>`<button class="btn btn-sm ${i===1?'btn-primary':'btn-ghost'}">${p}</button>`).join('')}
          </div>
        </div>
        ${buildSVGLineChart(dailyRev, 560, 180)}
      </div>

      <!-- Category Donut -->
      <div class="panel-card">
        <div style="font-weight:700;margin-bottom:var(--space-4)">🍩 Revenue by Category</div>
        ${buildDonutChart(cats.slice(0,5), catRevs)}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
      <!-- Top Products -->
      <div class="panel-card">
        <div style="font-weight:700;margin-bottom:var(--space-4)">🏆 Top 8 Products by Revenue</div>
        ${DemoData.products.slice(0,8).map((p,i)=>{
          const qty = [420,380,310,270,245,198,164,131][i]||80;
          const rev = p.price * qty;
          const maxRev = p.price * 420;
          return `
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
              <div style="width:20px;font-size:var(--text-xs);color:var(--color-text-secondary);font-weight:700">#${i+1}</div>
              <span style="font-size:20px">${p.image||'📦'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:var(--text-xs);font-weight:600;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div>
                <div style="height:6px;background:var(--color-bg-elevated);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${Math.round((rev/maxRev)*100)}%;background:var(--gradient-brand);border-radius:3px;transition:width 0.6s ease"></div>
                </div>
              </div>
              <div style="text-align:right;min-width:64px">
                <div style="font-size:var(--text-xs);font-weight:700">${Format.currency(rev)}</div>
                <div style="font-size:10px;color:var(--color-text-tertiary)">${qty} units</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Top Customers + Hourly Heatmap -->
      <div style="display:flex;flex-direction:column;gap:var(--space-5)">
        <div class="panel-card" style="flex:1">
          <div style="font-weight:700;margin-bottom:var(--space-4)">👑 Top Customers</div>
          <table class="data-table">
            <thead><tr><th>Customer</th><th>Orders</th><th>Revenue</th><th>Trend</th></tr></thead>
            <tbody>
              ${DemoData.customers.slice(0,6).map((c,i)=>{
                const rev = c.totalSpent;
                const orders = [42,38,31,27,22,18][i];
                return `<tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2)">
                      <div style="width:28px;height:28px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white">${c.name[0]}</div>
                      <span style="font-size:var(--text-sm);font-weight:500">${c.name}</span>
                    </div>
                  </td>
                  <td style="font-size:var(--text-sm)">${orders}</td>
                  <td style="font-weight:700;color:var(--color-brand-400)">${Format.currency(rev)}</td>
                  <td><span style="color:var(--color-success-400);font-size:var(--text-xs)">▲ ${(Math.random()*20+5).toFixed(1)}%</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Hourly heatmap -->
        <div class="panel-card">
          <div style="font-weight:700;margin-bottom:var(--space-3)">🕐 Peak Hours Today</div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
            ${[8,9,10,11,12,13,14,15,16,17,18,19,20,21].map(h=>{
              const intensity = [10,25,60,75,90,70,45,65,80,95,85,60,40,20][h-8]||10;
              const sales = Math.round(intensity * 280);
              return `
                <div style="text-align:center">
                  <div style="height:50px;background:rgba(99,102,241,${intensity/100});border-radius:var(--radius-md);margin-bottom:4px;transition:all 0.3s" title="${h}:00 — ₹${Format.number(sales)}"></div>
                  <div style="font-size:10px;color:var(--color-text-secondary)">${h}h</div>
                </div>
              `;
            }).join('')}
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-2)">Peak: 5–6 PM (₹26,600)</div>
        </div>
      </div>
    </div>
  `;
}

function buildSVGLineChart(data, w=500, h=160) {
  const max = Math.max(...data);
  const min = Math.min(...data) * 0.9;
  const xStep = w / (data.length - 1);
  const pts = data.map((v,i) => `${i*xStep},${h-(((v-min)/(max-min))*h)}`).join(' ');
  const fillPts = `0,${h} ${pts} ${(data.length-1)*xStep},${h}`;
  const labels = data.map((_,i)=>`Apr ${i+11}`);
  return `
    <svg width="100%" viewBox="0 0 ${w} ${h+30}" style="overflow:visible">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      ${[0,1,2,3].map(i=>`<line x1="0" y1="${h - (h/4)*i}" x2="${w}" y2="${h - (h/4)*i}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`).join('')}
      <!-- Fill -->
      <polygon points="${fillPts}" fill="url(#lineGrad)"/>
      <!-- Line -->
      <polyline points="${pts}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <!-- Dots -->
      ${data.map((v,i)=>`<circle cx="${i*xStep}" cy="${h-(((v-min)/(max-min))*h)}" r="4" fill="#6366f1" stroke="var(--color-bg-primary)" stroke-width="2"/>`).join('')}
      <!-- Labels -->
      ${data.map((v,i)=> i%3===0 ? `<text x="${i*xStep}" y="${h+20}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">${labels[i]}</text>` : '').join('')}
      <!-- Y labels -->
      ${[0,1,2,3].map(i=>`<text x="-4" y="${h - (h/4)*i + 4}" text-anchor="end" font-size="9" fill="rgba(255,255,255,0.4)">${Format.currency(min + (max-min)*(i/4), true)}</text>`).join('')}
    </svg>
  `;
}

function buildDonutChart(labels, values) {
  const total = values.reduce((s,v)=>s+v,0);
  const colors = ['#6366f1','#10b981','#f59e0b','#ec4899','#a855f7'];
  let offset = 0;
  const r = 60, cx = 90, cy = 80, circumference = 2*Math.PI*r;
  const slices = values.map((v,i)=>{
    const pct = v/total;
    const dash = pct*circumference;
    const slice = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="24" stroke-dasharray="${dash} ${circumference}" stroke-dashoffset="${-offset*circumference}" style="transform-origin:${cx}px ${cy}px;transform:rotate(-90deg)"/>`;
    offset += pct;
    return slice;
  });
  return `
    <div style="display:flex;align-items:center;gap:var(--space-4)">
      <svg width="180" height="160" style="flex-shrink:0">
        ${slices.join('')}
        <text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="12" fill="white" font-weight="700">${Format.currency(total,true)}</text>
        <text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.5)">Total Rev</text>
      </svg>
      <div style="flex:1">
        ${labels.map((l,i)=>`
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
            <div style="width:10px;height:10px;border-radius:50%;background:${colors[i]};flex-shrink:0"></div>
            <div style="font-size:var(--text-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l}</div>
            <div style="font-size:var(--text-xs);font-weight:700">${((values[i]/total)*100).toFixed(0)}%</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── ENHANCED REPORTS MODULE ──────────────────────────────────
function renderReports() {
  const reports = [
    { name:'P&L Statement', icon:'💹', desc:'Profit & Loss with income/expense breakdown', type:'pl', color:'#6366f1' },
    { name:'Daily Sales Report', icon:'📊', desc:'Itemised sales, cashier-wise, hour-wise', type:'sales', color:'#10b981' },
    { name:'GST Tax Report', icon:'📋', desc:'GSTR-1 & 3B ready summary', type:'gst', color:'#f59e0b' },
    { name:'Inventory Valuation', icon:'📦', desc:'Stock × cost price, dead stock report', type:'inventory', color:'#ec4899' },
    { name:'Customer Ledger', icon:'👥', desc:'Per-customer purchase & payment history', type:'customers', color:'#a855f7' },
    { name:'Supplier Statement', icon:'🚛', desc:'Outstanding payables, PO history', type:'suppliers', color:'#14b8a6' },
    { name:'Payroll Report', icon:'💰', desc:'Monthly salaries, PF, ESI deductions', type:'payroll', color:'#f97316' },
    { name:'Stock Movement', icon:'📉', desc:'Item-wise stock in/out/adjustments', type:'stock', color:'#06b6d4' },
  ];

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Reports & Exports</div><div class="page-meta">Generate, preview and export business reports</div></div>
      <div style="display:flex;gap:var(--space-3)">
        <input type="month" class="form-input" style="width:auto" value="${new Date().toISOString().slice(0,7)}" id="report-month" />
        <button class="btn btn-secondary" onclick="downloadReport('all')">⬇️ Export All</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4)">
      ${reports.map(r=>`
        <div class="panel-card" style="cursor:pointer;transition:transform 0.2s;border-top:3px solid ${r.color}" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''" onclick="previewReport('${r.type}')">
          <div style="font-size:36px;margin-bottom:var(--space-3)">${r.icon}</div>
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:var(--space-1)">${r.name}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:var(--space-4)">${r.desc}</div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-sm btn-secondary" style="flex:1" onclick="event.stopPropagation();previewReport('${r.type}')">👁 Preview</button>
            <button class="btn btn-sm btn-primary" style="flex:1" onclick="event.stopPropagation();downloadReport('${r.type}')">⬇️ Export</button>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Quick Stats -->
    <div class="panel-card" style="margin-top:var(--space-5)">
      <div style="font-weight:700;margin-bottom:var(--space-4)">📅 This Month at a Glance</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:var(--space-4)">
        ${[
          { l:'Total Sales', v:Format.currency(142800) },
          { l:'Total Purchases', v:Format.currency(98400) },
          { l:'GST Collected', v:Format.currency(21420) },
          { l:'GST Paid', v:Format.currency(14760) },
          { l:'GST Liability', v:Format.currency(6660) },
          { l:'Net Profit', v:Format.currency(28600) },
        ].map(s=>`
          <div style="text-align:center">
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">${s.l}</div>
            <div style="font-size:var(--text-base);font-weight:800;color:var(--color-brand-400)">${s.v}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function previewReport(type) {
  const month = document.getElementById('report-month')?.value || new Date().toISOString().slice(0,7);
  const income  = DemoData.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = DemoData.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  const reportHTML = {
    pl: `
      <table class="data-table"><thead><tr><th>Particulars</th><th>Amount (₹)</th><th>%</th></tr></thead><tbody>
        <tr style="font-weight:700;background:var(--color-bg-elevated)"><td colspan="3" style="padding:var(--space-3) var(--space-4);color:var(--color-success-400)">INCOME</td></tr>
        ${['Sales Revenue','Other Income'].map((c,i)=>{const a=[income*0.92,income*0.08][i];return`<tr><td>${c}</td><td>${Format.currency(a)}</td><td>${((a/income)*100).toFixed(1)}%</td></tr>`;}).join('')}
        <tr style="font-weight:700;border-top:2px solid var(--color-border-default)"><td>Total Income</td><td style="color:var(--color-success-400)">${Format.currency(income)}</td><td>100%</td></tr>
        <tr style="font-weight:700;background:var(--color-bg-elevated)"><td colspan="3" style="padding:var(--space-3) var(--space-4);color:var(--color-danger-400)">EXPENSES</td></tr>
        ${['COGS / Purchases','Salaries','Rent & Utilities','Marketing','Other'].map((c,i)=>{const r=[0.55,0.20,0.12,0.05,0.08][i];const a=expense*r;return`<tr><td>${c}</td><td>${Format.currency(a)}</td><td>${(r*100).toFixed(0)}%</td></tr>`;}).join('')}
        <tr style="font-weight:700;border-top:2px solid var(--color-border-default)"><td>Total Expenses</td><td style="color:var(--color-danger-400)">${Format.currency(expense)}</td><td></td></tr>
        <tr style="font-weight:800;font-size:var(--text-base);background:rgba(99,102,241,0.08)"><td>Net Profit / Loss</td><td style="color:var(--color-brand-400)">${Format.currency(income-expense)}</td><td>${((income-expense)/income*100).toFixed(1)}%</td></tr>
      </tbody></table>`,
    gst: `
      <table class="data-table"><thead><tr><th>Section</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total Tax</th></tr></thead><tbody>
        <tr><td>B2B Sales (18%)</td><td>${Format.currency(62000)}</td><td>${Format.currency(5580)}</td><td>${Format.currency(5580)}</td><td>—</td><td>${Format.currency(11160)}</td></tr>
        <tr><td>B2C Sales (12%)</td><td>${Format.currency(48000)}</td><td>${Format.currency(2880)}</td><td>${Format.currency(2880)}</td><td>—</td><td>${Format.currency(5760)}</td></tr>
        <tr><td>B2C Sales (5%)</td><td>${Format.currency(32800)}</td><td>${Format.currency(820)}</td><td>${Format.currency(820)}</td><td>—</td><td>${Format.currency(1640)}</td></tr>
        <tr><td>Exempt / NIL</td><td>${Format.currency(0)}</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
        <tr style="font-weight:700;border-top:2px solid var(--color-border-default)"><td>GSTR-1 Total</td><td>${Format.currency(142800)}</td><td>${Format.currency(9280)}</td><td>${Format.currency(9280)}</td><td>—</td><td style="color:var(--color-warning-400)">${Format.currency(18560)}</td></tr>
        <tr><td colspan="6" style="padding:var(--space-2) var(--space-4);font-size:var(--text-xs);color:var(--color-text-secondary)">ITC Available: ${Format.currency(14760)} | Net GST Payable: ${Format.currency(3800)}</td></tr>
      </tbody></table>`,
    sales: `
      <table class="data-table"><thead><tr><th>Date</th><th>Bill No</th><th>Customer</th><th>Items</th><th>GST</th><th>Total</th><th>Mode</th></tr></thead><tbody>
        ${DemoData.transactions.filter(t=>t.type==='income').slice(0,10).map((t,i)=>`
          <tr>
            <td style="font-size:var(--text-xs)">${Format.date(t.date)}</td>
            <td style="font-family:monospace;font-size:var(--text-xs)">INV-${String(1000+i).padStart(5,'0')}</td>
            <td>${DemoData.customers[i%DemoData.customers.length]?.name || 'Walk-in'}</td>
            <td>${Math.floor(Math.random()*8+2)}</td>
            <td>${Format.currency(t.amount*0.15)}</td>
            <td style="font-weight:700">${Format.currency(t.amount)}</td>
            <td><span class="badge badge-${['success','warning','primary'][i%3]}">${['Cash','UPI','Card'][i%3]}</span></td>
          </tr>
        `).join('')}
      </tbody></table>`,
    inventory: `
      <table class="data-table"><thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Cost Price</th><th>Stock Value</th><th>MRP</th><th>Status</th></tr></thead><tbody>
        ${DemoData.products.slice(0,12).map(p=>{
          const val=p.stock*p.price*0.7;
          return`<tr>
            <td>${p.name}</td><td><span class="chip">${p.category}</span></td>
            <td style="font-weight:700">${p.stock} ${p.unit}</td>
            <td>${Format.currency(p.price*0.7)}</td>
            <td style="font-weight:700;color:var(--color-brand-400)">${Format.currency(val)}</td>
            <td>${Format.currency(p.price)}</td>
            <td><span class="badge badge-${p.stock<=p.minStock?'danger':p.stock<=p.minStock*2?'warning':'success'}">${p.stock<=p.minStock?'Low':p.stock===0?'OOS':'OK'}</span></td>
          </tr>`;
        }).join('')}
        <tr style="font-weight:700;border-top:2px solid var(--color-border-default)"><td colspan="4" style="text-align:right">Total Inventory Value:</td><td style="color:var(--color-brand-400)">${Format.currency(DemoData.products.reduce((s,p)=>s+p.stock*p.price*0.7,0))}</td><td colspan="2"></td></tr>
      </tbody></table>`,
    payroll: `
      <table class="data-table"><thead><tr><th>Employee</th><th>Dept</th><th>Basic</th><th>HRA</th><th>PF (12%)</th><th>ESI (1.75%)</th><th>Net Pay</th></tr></thead><tbody>
        ${DemoData.staff.map(s=>{
          const basic=s.salary;const hra=basic*0.4;const pf=basic*0.12;const esi=basic*0.0175;const net=basic+hra-pf-esi;
          return`<tr>
            <td style="font-weight:600">${s.name}</td><td>${s.role}</td>
            <td>${Format.currency(basic)}</td><td>${Format.currency(hra)}</td>
            <td style="color:var(--color-danger-400)">-${Format.currency(pf)}</td>
            <td style="color:var(--color-danger-400)">-${Format.currency(esi)}</td>
            <td style="font-weight:700;color:var(--color-success-400)">${Format.currency(net)}</td>
          </tr>`;
        }).join('')}
        <tr style="font-weight:700;border-top:2px solid var(--color-border-default)">
          <td colspan="6" style="text-align:right">Total Payroll:</td>
          <td style="color:var(--color-success-400)">${Format.currency(DemoData.staff.reduce((s,e)=>{const b=e.salary;return s+b+b*0.4-b*0.12-b*0.0175;},0))}</td>
        </tr>
      </tbody></table>`,
    customers: `
      <table class="data-table"><thead><tr><th>Customer</th><th>Phone</th><th>Total Orders</th><th>Total Spent</th><th>Avg Order</th><th>Outstanding</th><th>Last Visit</th></tr></thead><tbody>
        ${DemoData.customers.map(c=>`<tr>
          <td style="font-weight:600">${c.name}</td>
          <td style="font-size:var(--text-xs)">${c.phone}</td>
          <td>${c.totalOrders||Math.floor(c.totalSpent/850)}</td>
          <td style="font-weight:700;color:var(--color-brand-400)">${Format.currency(c.totalSpent)}</td>
          <td>${Format.currency(Math.round(c.totalSpent/(c.totalOrders||10)))}</td>
          <td style="color:${(c.credit||0)>0?'var(--color-warning-400)':'var(--color-success-400)'}">${(c.credit||0)>0?Format.currency(c.credit):'Clear'}</td>
          <td style="font-size:var(--text-xs)">${Format.date(c.lastVisit)}</td>
        </tr>`).join('')}
      </tbody></table>`,
    suppliers: `
      <table class="data-table"><thead><tr><th>Supplier</th><th>City</th><th>Total Orders</th><th>Total Paid</th><th>Outstanding</th><th>Credit Terms</th></tr></thead><tbody>
        ${DemoData.suppliers.map((s,i)=>`<tr>
          <td style="font-weight:600">${s.name}</td><td>${s.city}</td>
          <td>${[12,8,15,6,9,11][i%6]}</td>
          <td style="color:var(--color-success-400)">${Format.currency([184000,96000,231000,48000,72000,138000][i%6])}</td>
          <td style="color:${(s.outstanding||0)>0?'var(--color-danger-400)':'var(--color-success-400)'};">${(s.outstanding||0)>0?Format.currency(s.outstanding):'None'}</td>
          <td style="font-size:var(--text-xs)">${['30 days','45 days','21 days','60 days','30 days'][i%5]}</td>
        </tr>`).join('')}
      </tbody></table>`,
    stock: `
      <table class="data-table"><thead><tr><th>Product</th><th>Opening</th><th>IN (Purchased)</th><th>OUT (Sold)</th><th>Adjustments</th><th>Closing</th></tr></thead><tbody>
        ${DemoData.products.slice(0,10).map(p=>{
          const sold=Math.floor(Math.random()*80+20);const purchased=Math.floor(Math.random()*100+40);const adj=Math.floor(Math.random()*5-2);const opening=p.stock-purchased+sold-adj;
          return`<tr>
            <td>${p.name}</td>
            <td>${opening} ${p.unit}</td>
            <td style="color:var(--color-success-400)">+${purchased}</td>
            <td style="color:var(--color-danger-400)">-${sold}</td>
            <td style="color:${adj>=0?'var(--color-warning-400)':'var(--color-danger-400)'};">${adj>=0?'+':''}${adj}</td>
            <td style="font-weight:700">${p.stock} ${p.unit}</td>
          </tr>`;
        }).join('')}
      </tbody></table>`,
  };

  const titles = { pl:'P&L Statement', gst:'GST Tax Report', sales:'Daily Sales Report', inventory:'Inventory Valuation', customers:'Customer Ledger', suppliers:'Supplier Statement', payroll:'Payroll Report', stock:'Stock Movement Report' };

  Modal.create({
    title: `${titles[type]||type} · ${document.getElementById('report-month')?.value||''}`,
    wide: true,
    body: `<div style="overflow-x:auto;max-height:60vh;overflow-y:auto">${reportHTML[type]||'<div style="padding:40px;text-align:center;color:var(--color-text-secondary)">Preview not available</div>'}</div>`,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Close</button>
      <button class="btn btn-primary" onclick="downloadReport('${type}');document.querySelector('.modal-backdrop').remove()">⬇️ Download CSV</button>
    `
  });
}

function downloadReport(type) {
  const income  = DemoData.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = DemoData.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const csvData = {
    pl: [['Particulars','Amount'],['Total Income',income],['Total Expenses',expense],['Net Profit',income-expense]],
    sales: DemoData.transactions.filter(t=>t.type==='income').map((t,i)=>['INV-'+i,t.date,t.description,t.amount,t.category]),
    inventory: DemoData.products.map(p=>[p.name,p.category,p.stock,p.price,p.stock*p.price*0.7]),
    payroll: DemoData.staff.map(s=>[s.name,s.role,s.salary,s.salary*0.4,s.salary*0.12,s.salary*0.0175]),
    gst: [['Section','Taxable','CGST','SGST'],['B2B 18%',62000,5580,5580],['B2C 12%',48000,2880,2880],['B2C 5%',32800,820,820]],
    customers: DemoData.customers.map(c=>[c.name,c.phone,c.totalSpent,c.credit||0,c.lastVisit]),
    suppliers: DemoData.suppliers.map(s=>[s.name,s.city,s.phone,s.outstanding||0]),
    stock: DemoData.products.slice(0,10).map(p=>[p.name,p.category,p.stock]),
  };
  const data = type==='all' ? DemoData.transactions.map(t=>[t.date,t.type,t.category,t.description,t.amount]) : (csvData[type]||[]);
  exportCSV(data.map(row=>Array.isArray(row)?Object.fromEntries(row.map((v,i)=>['col'+i,v])):row), `nexaerp_${type}_report.csv`);
  Toast.success(`✅ ${type.toUpperCase()} report downloaded!`);
}

function generateReport(type) { previewReport(type); }

// ─── GST MODULE (SAP FI-TX) ──────────────────────────────────
function renderGST() {
  const gstData = {
    outward: { taxable:142800, cgst:10710, sgst:10710, igst:0, total:21420 },
    inward:  { taxable:98400,  cgst:7380,  sgst:7380,  igst:0, total:14760 },
    liability: 6660,
    itcBalance: 3200,
  };
  const months = ['Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  const filed  = [true,true,true,true,true,false,false];

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">GST Management</div><div class="page-meta">GSTR-1 · GSTR-3B · Input Tax Credit · Tax Rates</div></div>
      <div style="display:flex;gap:var(--space-3)">
        <select class="form-select" style="width:auto"><option>FY 2025-26</option><option>FY 2024-25</option></select>
        <button class="btn btn-primary" onclick="Toast.info('GSTR-1 JSON export coming soon!')">📤 Export GSTR-1</button>
      </div>
    </div>

    <!-- GST Summary KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
      ${[
        { l:'GST Collected (Output)',   v:Format.currency(gstData.outward.total),   color:'var(--color-success-400)', icon:'📤' },
        { l:'ITC Available (Input)',    v:Format.currency(gstData.inward.total),    color:'var(--color-brand-400)',   icon:'📥' },
        { l:'Net GST Liability',        v:Format.currency(gstData.liability),       color:'var(--color-warning-400)', icon:'⚖️' },
        { l:'ITC Balance (Closing)',    v:Format.currency(gstData.itcBalance),      color:'var(--color-success-400)', icon:'💳' },
      ].map(s=>`
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:24px;margin-bottom:var(--space-2)">${s.icon}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);font-weight:600;text-transform:uppercase;margin-bottom:4px">${s.l}</div>
          <div style="font-size:var(--text-2xl);font-weight:800;color:${s.color}">${s.v}</div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-5)">
      <div style="display:flex;flex-direction:column;gap:var(--space-5)">
        <!-- GSTR-1 -->
        <div class="panel-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
            <div style="font-weight:700">📤 GSTR-1 — Outward Supplies (April 2026)</div>
            <button class="btn btn-sm btn-primary" onclick="Toast.success('GSTR-1 prepared!')">Prepare Return</button>
          </div>
          <table class="data-table">
            <thead><tr><th>Section</th><th>Invoices</th><th>Taxable Value</th><th>Rate</th><th>CGST</th><th>SGST</th><th>Total Tax</th></tr></thead>
            <tbody>
              ${[
                { s:'B2B Sales (Reg. Buyer)',      inv:42, tax:62000, rate:'18%', cgst:5580, sgst:5580 },
                { s:'B2C Large (>₹2.5L)',          inv:8,  tax:22000, rate:'12%', cgst:1320, sgst:1320 },
                { s:'B2C Small',                   inv:286,tax:48000, rate:'5%',  cgst:1200, sgst:1200 },
                { s:'Nil Rated / Exempt',          inv:12, tax:10800, rate:'0%',  cgst:0,    sgst:0 },
              ].map(r=>`
                <tr>
                  <td style="font-size:var(--text-sm)">${r.s}</td>
                  <td>${r.inv}</td>
                  <td>${Format.currency(r.tax)}</td>
                  <td><span class="chip">${r.rate}</span></td>
                  <td>${Format.currency(r.cgst)}</td>
                  <td>${Format.currency(r.sgst)}</td>
                  <td style="font-weight:700;color:var(--color-warning-400)">${Format.currency(r.cgst+r.sgst)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight:700;border-top:2px solid var(--color-border-default)">
                <td>Total</td><td>348</td><td>${Format.currency(142800)}</td><td></td>
                <td style="color:var(--color-warning-400)">${Format.currency(8100)}</td>
                <td style="color:var(--color-warning-400)">${Format.currency(8100)}</td>
                <td style="color:var(--color-warning-400);font-size:var(--text-base)">${Format.currency(16200)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- GSTR-3B Summary -->
        <div class="panel-card">
          <div style="font-weight:700;margin-bottom:var(--space-4)">📥 GSTR-3B — Tax Liability Summary</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
            <div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:var(--space-3);font-weight:600">OUTPUT TAX</div>
              ${[['CGST',8100],['SGST',8100],['IGST',0],['Cess',220]].map(([t,v])=>`
                <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);font-size:var(--text-sm)"><span>${t}</span><span style="font-weight:600">${Format.currency(v)}</span></div>
              `).join('')}
              <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-weight:700"><span>Total Output</span><span style="color:var(--color-danger-400)">${Format.currency(16420)}</span></div>
            </div>
            <div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:var(--space-3);font-weight:600">INPUT TAX CREDIT</div>
              ${[['CGST ITC',6200],['SGST ITC',6200],['IGST ITC',0],['Cess ITC',160]].map(([t,v])=>`
                <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);font-size:var(--text-sm)"><span>${t}</span><span style="font-weight:600;color:var(--color-success-400)">${Format.currency(v)}</span></div>
              `).join('')}
              <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-weight:700"><span>Total ITC</span><span style="color:var(--color-success-400)">${Format.currency(12560)}</span></div>
            </div>
          </div>
          <div style="background:rgba(99,102,241,0.08);border-radius:var(--radius-lg);padding:var(--space-4);margin-top:var(--space-4);display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:700">Net Tax Payable</div>
            <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-warning-400)">${Format.currency(3860)}</div>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:var(--space-4)" onclick="Toast.success('GSTR-3B challan prepared! Due: 20th May')">🏦 Pay Tax Challan</button>
        </div>
      </div>

      <!-- Filing Status + HSN Summary -->
      <div style="display:flex;flex-direction:column;gap:var(--space-5)">
        <div class="panel-card">
          <div style="font-weight:700;margin-bottom:var(--space-4)">📅 Filing Status FY 2025-26</div>
          ${months.map((m,i)=>`
            <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle)">
              <div style="width:36px;font-size:var(--text-xs);font-weight:700;color:var(--color-text-secondary)">${m}</div>
              <div style="flex:1">
                <div style="font-size:var(--text-xs);margin-bottom:2px">GSTR-1 <span style="color:${filed[i]?'var(--color-success-400)':'var(--color-warning-400)'}">${filed[i]?'✅ Filed':'⏳ Pending'}</span></div>
                <div style="font-size:var(--text-xs)">GSTR-3B <span style="color:${filed[i]?'var(--color-success-400)':'var(--color-warning-400)'}">${filed[i]?'✅ Filed':'⏳ Pending'}</span></div>
              </div>
              ${!filed[i]?`<button class="btn btn-sm btn-warning" onclick="Toast.success('Return for ${m} marked as filed!')">File</button>`:''}
            </div>
          `).join('')}
        </div>

        <!-- Tax Rate Master -->
        <div class="panel-card">
          <div style="font-weight:700;margin-bottom:var(--space-4)">📊 HSN / Tax Rate Master</div>
          ${[
            { hsn:'1901', desc:'Horlicks / Cereals',     rate:'18%', cat:'Packaged Foods' },
            { hsn:'0402', desc:'Dairy Products',          rate:'5%',  cat:'Dairy' },
            { hsn:'2202', desc:'Beverages / Soft Drinks', rate:'12%', cat:'Beverages' },
            { hsn:'3401', desc:'Soaps / Detergents',      rate:'18%', cat:'Personal Care' },
            { hsn:'1001', desc:'Wheat / Rice',            rate:'0%',  cat:'Staples' },
          ].map(r=>`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle)">
              <div>
                <div style="font-size:var(--text-xs);font-weight:600">${r.desc}</div>
                <div style="font-size:10px;color:var(--color-text-secondary)">HSN ${r.hsn} · ${r.cat}</div>
              </div>
              <span class="badge badge-${r.rate==='0%'?'success':r.rate==='5%'?'warning':'primary'}">${r.rate}</span>
            </div>
          `).join('')}
          <button class="btn btn-sm btn-secondary" style="width:100%;margin-top:var(--space-3)" onclick="Toast.info('HSN master management coming soon!')">+ Add HSN Code</button>
        </div>
      </div>
    </div>
  `;
}

// ─── COST CENTER & BUDGET MODULE (SAP CO) ────────────────────
function renderCostCenter() {
  const departments = [
    { name:'Purchasing',   budget:80000, actual:74200, icon:'🛒', color:'#6366f1' },
    { name:'Salaries',     budget:60000, actual:58500, icon:'👥', color:'#10b981' },
    { name:'Rent',         budget:25000, actual:25000, icon:'🏪', color:'#f59e0b' },
    { name:'Marketing',    budget:15000, actual:18400, icon:'📣', color:'#ec4899' },
    { name:'Utilities',    budget:8000,  actual:7200,  icon:'💡', color:'#a855f7' },
    { name:'Maintenance',  budget:5000,  actual:3800,  icon:'🔧', color:'#14b8a6' },
    { name:'Transport',    budget:10000, actual:11200, icon:'🚛', color:'#f97316' },
    { name:'Misc',         budget:7000,  actual:4800,  icon:'📦', color:'#64748b' },
  ];
  const totalBudget = departments.reduce((s,d)=>s+d.budget,0);
  const totalActual = departments.reduce((s,d)=>s+d.actual,0);
  const variance = totalActual - totalBudget;

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Cost Centers & Budget</div><div class="page-meta">SAP CO — Budget vs Actual Tracking</div></div>
      <div style="display:flex;gap:var(--space-3)">
        <select class="form-select" style="width:auto"><option>April 2026</option><option>March 2026</option><option>FY 2025-26</option></select>
        <button class="btn btn-primary" onclick="openBudgetModal()">✏️ Edit Budgets</button>
      </div>
    </div>

    <!-- Summary KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
      ${[
        { l:'Total Budget',    v:Format.currency(totalBudget), color:'var(--color-brand-400)', icon:'📋' },
        { l:'Total Actual',    v:Format.currency(totalActual), color:'var(--color-warning-400)', icon:'💸' },
        { l:'Variance',        v:(variance>=0?'+':'')+Format.currency(Math.abs(variance)), color:variance>0?'var(--color-danger-400)':'var(--color-success-400)', icon:variance>0?'⚠️':'✅' },
        { l:'Budget Used',     v:((totalActual/totalBudget)*100).toFixed(1)+'%', color:'var(--color-brand-400)', icon:'📊' },
      ].map(s=>`
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:24px;margin-bottom:var(--space-2)">${s.icon}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);font-weight:600;text-transform:uppercase;margin-bottom:4px">${s.l}</div>
          <div style="font-size:var(--text-2xl);font-weight:800;color:${s.color}">${s.v}</div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-5)">
      <!-- Department Table -->
      <div class="panel-card">
        <div style="font-weight:700;margin-bottom:var(--space-4)">🏢 Department Budget vs Actual</div>
        ${departments.map(d=>{
          const pct = (d.actual/d.budget)*100;
          const over = d.actual > d.budget;
          return `
            <div style="margin-bottom:var(--space-5)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
                <div style="display:flex;align-items:center;gap:var(--space-2)">
                  <span style="font-size:18px">${d.icon}</span>
                  <span style="font-weight:600;font-size:var(--text-sm)">${d.name}</span>
                  ${over?`<span class="badge badge-danger">⚠️ Over Budget</span>`:''}
                </div>
                <div style="text-align:right">
                  <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Budget: ${Format.currency(d.budget)}</div>
                  <div style="font-size:var(--text-sm);font-weight:700;color:${over?'var(--color-danger-400)':'var(--color-success-400)'}">
                    Actual: ${Format.currency(d.actual)} (${pct.toFixed(0)}%)
                  </div>
                </div>
              </div>
              <div style="height:8px;background:var(--color-bg-elevated);border-radius:4px;overflow:hidden;position:relative">
                <div style="height:100%;width:${Math.min(pct,100)}%;background:${over?'var(--gradient-danger)':d.color};border-radius:4px;transition:width 0.8s ease"></div>
                ${over?`<div style="position:absolute;right:0;top:0;height:100%;width:2px;background:var(--color-danger-400)"></div>`:''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Budget Chart + Over-Budget Alerts -->
      <div style="display:flex;flex-direction:column;gap:var(--space-5)">
        <div class="panel-card">
          <div style="font-weight:700;margin-bottom:var(--space-4)">🎯 Budget Utilization</div>
          ${buildDonutChart(
            departments.map(d=>d.name),
            departments.map(d=>d.actual)
          )}
        </div>

        <div class="panel-card">
          <div style="font-weight:700;margin-bottom:var(--space-3);color:var(--color-danger-400)">⚠️ Alerts</div>
          ${departments.filter(d=>d.actual>d.budget).map(d=>`
            <div style="background:rgba(239,68,68,0.08);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-2)">
              <div style="font-weight:600;font-size:var(--text-sm)">${d.icon} ${d.name}</div>
              <div style="font-size:var(--text-xs);color:var(--color-danger-400)">Over by ${Format.currency(d.actual-d.budget)} (+${(((d.actual-d.budget)/d.budget)*100).toFixed(0)}%)</div>
            </div>
          `).join('')}
          ${departments.filter(d=>d.actual/d.budget>0.85&&d.actual<=d.budget).map(d=>`
            <div style="background:rgba(234,179,8,0.08);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-2)">
              <div style="font-weight:600;font-size:var(--text-sm)">${d.icon} ${d.name}</div>
              <div style="font-size:var(--text-xs);color:var(--color-warning-400)">${((d.actual/d.budget)*100).toFixed(0)}% used — approaching limit</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function openBudgetModal() {
  const departments = ['Purchasing','Salaries','Rent','Marketing','Utilities','Maintenance','Transport','Misc'];
  const defaults    = [80000,60000,25000,15000,8000,5000,10000,7000];
  Modal.create({
    title: '✏️ Edit Monthly Budgets — April 2026',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        ${departments.map((d,i)=>`
          <div class="form-group">
            <label class="form-label">${d} Budget (₹)</label>
            <input type="number" class="form-input" id="budget-${i}" value="${defaults[i]}" min="0" step="1000" />
          </div>
        `).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveBudgets()">💾 Save Budgets</button>
    `
  });
}
function saveBudgets() {
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success('✅ Budgets updated!');
  renderCostCenter();
}

// ─── ASSET MANAGEMENT MODULE (SAP FI-AA) ─────────────────────
function renderAssets() {
  const assets = [
    { id:'FA001', name:'Commercial Freezer (Samsung)', category:'Equipment', purchaseDate:'2023-03-15', cost:48000, life:10, method:'SLM', status:'active' },
    { id:'FA002', name:'POS Billing System',           category:'IT',        purchaseDate:'2024-01-10', cost:22000, life:3,  method:'WDV', status:'active' },
    { id:'FA003', name:'Shop AC Unit (Voltas 1.5T)',   category:'Equipment', purchaseDate:'2022-06-20', cost:35000, life:5,  method:'SLM', status:'active' },
    { id:'FA004', name:'CCTV System (8 cameras)',      category:'Security',  purchaseDate:'2023-09-01', cost:18000, life:5,  method:'SLM', status:'active' },
    { id:'FA005', name:'Delivery Bicycle',             category:'Transport', purchaseDate:'2024-04-01', cost:8500,  life:3,  method:'WDV', status:'active' },
    { id:'FA006', name:'Old Weighing Machine (Avery)', category:'Equipment', purchaseDate:'2019-01-01', cost:12000, life:5,  method:'SLM', status:'disposed' },
  ];

  function calcDepreciation(asset) {
    const years = (Date.now() - new Date(asset.purchaseDate)) / (365.25*24*3600*1000);
    if(asset.method==='SLM') {
      const annualDep = asset.cost / asset.life;
      const accDep = Math.min(annualDep * years, asset.cost);
      return { annual:annualDep, acc:accDep, bookValue:Math.max(0, asset.cost - accDep), pctDep:(accDep/asset.cost)*100 };
    } else {
      const rate = 1 - Math.pow(0.1, 1/asset.life); // WDV rate giving ~10% residual
      const bookValue = asset.cost * Math.pow(1-rate, years);
      const annualDep = bookValue * rate;
      const accDep = asset.cost - bookValue;
      return { annual:annualDep, acc:accDep, bookValue, pctDep:(accDep/asset.cost)*100 };
    }
  }

  const totalCost = assets.reduce((s,a)=>s+a.cost,0);
  const totalBook = assets.reduce((s,a)=>s+calcDepreciation(a).bookValue,0);
  const totalDep  = totalCost - totalBook;

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Asset Management</div><div class="page-meta">SAP FI-AA — Fixed Asset Register</div></div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="exportCSV([], 'assets.csv');Toast.success('Asset register exported!')">⬇️ Export</button>
        <button class="btn btn-primary" onclick="openAddAssetModal()">+ Add Asset</button>
      </div>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
      ${[
        { l:'Total Assets',      v:assets.filter(a=>a.status!=='disposed').length+' items',  color:'var(--color-brand-400)', icon:'🏭' },
        { l:'Original Cost',     v:Format.currency(totalCost),     color:'var(--color-text-primary)', icon:'💰' },
        { l:'Accum. Depreciation', v:Format.currency(totalDep),    color:'var(--color-danger-400)', icon:'📉' },
        { l:'Net Book Value',    v:Format.currency(totalBook),     color:'var(--color-success-400)', icon:'📈' },
      ].map(s=>`
        <div class="stat-card" style="padding:var(--space-5)">
          <div style="font-size:24px;margin-bottom:var(--space-2)">${s.icon}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);font-weight:600;text-transform:uppercase;margin-bottom:4px">${s.l}</div>
          <div style="font-size:var(--text-xl);font-weight:800;color:${s.color}">${s.v}</div>
        </div>
      `).join('')}
    </div>

    <!-- Asset Table -->
    <div class="panel-card" style="overflow-x:auto">
      <div style="font-weight:700;margin-bottom:var(--space-4)">📋 Fixed Asset Register</div>
      <table class="data-table">
        <thead><tr><th>Asset ID</th><th>Asset Name</th><th>Category</th><th>Purchase Date</th><th>Cost</th><th>Method</th><th>Accum. Dep.</th><th>Book Value</th><th>Dep. %</th><th>Status</th></tr></thead>
        <tbody>
          ${assets.map(a=>{
            const dep = calcDepreciation(a);
            return `<tr style="${a.status==='disposed'?'opacity:0.5':''}">
              <td style="font-family:monospace;font-size:var(--text-xs)">${a.id}</td>
              <td style="font-weight:600;font-size:var(--text-sm)">${a.name}</td>
              <td><span class="chip">${a.category}</span></td>
              <td style="font-size:var(--text-xs)">${Format.date(a.purchaseDate)}</td>
              <td>${Format.currency(a.cost)}</td>
              <td><span class="badge badge-${a.method==='SLM'?'primary':'warning'}">${a.method}</span></td>
              <td style="color:var(--color-danger-400);font-weight:600">${Format.currency(dep.acc)}</td>
              <td style="font-weight:700;color:var(--color-success-400)">${Format.currency(dep.bookValue)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:var(--space-2)">
                  <div style="width:48px;height:6px;background:var(--color-bg-elevated);border-radius:3px;overflow:hidden">
                    <div style="height:100%;width:${Math.min(dep.pctDep,100).toFixed(0)}%;background:${dep.pctDep>80?'var(--color-danger-400)':dep.pctDep>50?'var(--color-warning-400)':'var(--color-success-400)'};border-radius:3px"></div>
                  </div>
                  <span style="font-size:var(--text-xs)">${dep.pctDep.toFixed(0)}%</span>
                </div>
              </td>
              <td><span class="badge badge-${a.status==='active'?'success':a.status==='repair'?'warning':'danger'}">${a.status}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight:700;background:var(--color-bg-elevated)">
            <td colspan="4" style="padding:var(--space-3) var(--space-4);text-align:right">TOTAL</td>
            <td>${Format.currency(totalCost)}</td>
            <td></td>
            <td style="color:var(--color-danger-400)">${Format.currency(totalDep)}</td>
            <td style="color:var(--color-success-400)">${Format.currency(totalBook)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Monthly Depreciation Schedule -->
    <div class="panel-card" style="margin-top:var(--space-5)">
      <div style="font-weight:700;margin-bottom:var(--space-4)">📅 Monthly Depreciation Schedule (Active Assets)</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:var(--space-3)">
        ${['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'].map((m,i)=>{
          const monthly = totalDep/12 * (0.9 + Math.random()*0.2);
          return `
            <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg)">
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:4px">${m} '${i<6?'25':'26'}</div>
              <div style="font-weight:700;font-size:var(--text-sm);color:var(--color-danger-400)">${Format.currency(monthly/12)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function openAddAssetModal() {
  Modal.create({
    title: '+ Add Fixed Asset',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group"><label class="form-label">Asset Name *</label><input type="text" id="ast-name" class="form-input" placeholder="e.g. Refrigerator" /></div>
        <div class="form-group"><label class="form-label">Category *</label>
          <select id="ast-cat" class="form-select"><option>Equipment</option><option>IT</option><option>Furniture</option><option>Transport</option><option>Security</option><option>Other</option></select>
        </div>
        <div class="form-group"><label class="form-label">Purchase Date *</label><input type="date" id="ast-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" /></div>
        <div class="form-group"><label class="form-label">Cost (₹) *</label><input type="number" id="ast-cost" class="form-input" min="0" /></div>
        <div class="form-group"><label class="form-label">Useful Life (years)</label><input type="number" id="ast-life" class="form-input" value="5" min="1" /></div>
        <div class="form-group"><label class="form-label">Depreciation Method</label>
          <select id="ast-method" class="form-select"><option value="SLM">Straight Line (SLM)</option><option value="WDV">Written Down Value (WDV)</option></select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Description</label><input type="text" id="ast-desc" class="form-input" placeholder="Optional notes" /></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAsset()">💾 Add Asset</button>
    `
  });
}

function saveAsset() {
  const name = document.getElementById('ast-name')?.value?.trim();
  const cost = parseFloat(document.getElementById('ast-cost')?.value);
  if(!name||!cost) { Toast.error('Name and cost are required'); return; }
  document.querySelector('.modal-backdrop')?.remove();
  Toast.success(`✅ Asset "${name}" (${Format.currency(cost)}) added to register!`);
  renderAssets();
}

// ─── ENHANCED PAYROLL MODULE (SAP HCM) ───────────────────────
function renderPayroll() {
  const body = document.getElementById('page-body');
  body.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:400px; gap:20px;">
      <div style="font-weight:700; font-size:18px; color:var(--color-text-secondary)">📊 Accessing HR & Payroll Records...</div>
      <div class="progress-bar" style="width:300px; height:10px;">
        <div class="progress-fill" id="payroll-loading-bar" style="width:0%; background:var(--gradient-brand)"></div>
      </div>
      <div id="payroll-loading-msg" style="font-size:12px; color:var(--color-text-tertiary)">Initializing enterprise secure session...</div>
    </div>
  `;

  let p = 0;
  const bar = document.getElementById('payroll-loading-bar');
  const msg = document.getElementById('payroll-loading-msg');
  const interval = setInterval(() => {
    p += Math.random() * 25;
    if (p >= 100) {
      p = 100;
      clearInterval(interval);
      showPayrollUI();
    }
    if (bar) bar.style.width = p + '%';
    if (p > 40 && msg) msg.textContent = 'Calculating deductions and contributions...';
    if (p > 80 && msg) msg.textContent = 'Syncing with bank gateway...';
  }, 300);
}

function showPayrollUI() {
  const payrollItems = DemoData.staff.map(s => {
    const basic = s.salary;
    const hra = Math.round(basic * 0.4);
    const da = Math.round(basic * 0.1);
    const pf = Math.round(basic * 0.12);
    const esi = Math.round(basic * 0.0175);
    const tds = basic > 41667 ? Math.round((basic - 41667) * 0.05) : 0;
    const net = (basic + hra + da) - (pf + esi + tds);
    return { ...s, basic, hra, da, pf, esi, tds, net, worked: 24 + (Math.floor(Math.random()*3)) };
  });

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Payroll Management (SAP HCM)</div><div class="page-meta">Statutory Reports · Employee Payouts · TDS Compliance</div></div>
      <div style="display:flex;gap:var(--space-3)">
        <select class="form-select" id="payroll-month" style="width:auto"><option>April 2026</option><option>March 2026</option></select>
        <button class="btn btn-secondary" onclick="exportCSV(DemoData.staff, 'payroll_master_report.csv')">📦 Local File...</button>
        <button class="btn btn-primary" onclick="processBulkPayroll()">Process Runs</button>
      </div>
    </div>

    <div class="panel-card" style="padding:0; margin-bottom:var(--space-6)">
      <div style="background:var(--color-bg-tertiary); padding: 8px 16px; border-bottom: 1px solid var(--color-border-default); font-weight:700; font-size:11px; color:var(--color-text-secondary);">PAYROLL REGISTRY</div>
      <div style="overflow-x:auto">
        <table class="sap-dense-table">
          <thead>
            <tr>
              <th>Emp. No</th>
              <th>Personnel Name</th>
              <th>Basic Pay</th>
              <th>HRA</th>
              <th>DA</th>
              <th>PF Ded.</th>
              <th>ESI</th>
              <th>TDS</th>
              <th>Net Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${payrollItems.map(p => `
              <tr>
                <td style="font-family:var(--font-mono)">${p.id || 'E-SYD'+Math.floor(Math.random()*1000)}</td>
                <td style="font-weight:600">${p.name}</td>
                <td>${Format.currency(p.basic)}</td>
                <td>${Format.currency(p.hra)}</td>
                <td>${Format.currency(p.da)}</td>
                <td style="color:var(--color-danger-400)">-${Format.currency(p.pf)}</td>
                <td style="color:var(--color-danger-400)">-${Format.currency(p.esi)}</td>
                <td style="color:var(--color-danger-400)">${p.tds>0?'-'+Format.currency(p.tds):'0.00'}</td>
                <td style="font-weight:900; color:var(--color-brand-400)">${Format.currency(p.net)}</td>
                <td><span class="badge badge-success" style="font-size:9px">POSTED</span></td>
                <td><button class="btn btn-sm btn-ghost" onclick="viewPayslip('${p.name}', ${p.basic}, ${p.hra}, ${p.da}, ${p.pf}, ${p.esi}, ${p.tds}, ${p.net}, ${p.worked})">📄</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-6)">
      <div class="panel-card">
        <div style="font-weight:700; margin-bottom:15px;">🌴 Leave Entitlements Summary</div>
        <table class="sap-dense-table">
          <thead><tr><th>Personnel</th><th>Casual</th><th>Sick</th><th>Earned</th><th>Balance</th></tr></thead>
          <tbody>
            ${DemoData.staff.slice(0,5).map(s=>`
              <tr>
                <td>${s.name}</td>
                <td>8</td><td>12</td><td>15</td>
                <td style="font-weight:700; color:var(--color-success-400)">${35 - Math.floor(Math.random()*10)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="panel-card">
        <div style="font-weight:700; margin-bottom:15px;">📊 Statutory Contribution Totals</div>
        <div style="display:flex; flex-direction:column; gap:10px">
          ${[
            { l:'EPF Contribution (Employer)', v:Format.currency(payrollItems.reduce((s,p)=>s+p.pf,0)) },
            { l:'ESI Contribution', v:Format.currency(payrollItems.reduce((s,p)=>s+p.esi,0)) },
            { l:'Professional Tax', v:Format.currency(DemoData.staff.length * 200) },
          ].map(c => `
            <div style="display:flex; justify-content:space-between; font-size:12px; border-bottom:1px solid var(--color-border-subtle); padding-bottom:5px">
              <span>${c.l}</span><span style="font-weight:700">${c.v}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function processBulkPayroll() {
  Toast.info('Initiating bulk payroll run for all personnel...');
  setTimeout(() => Toast.success('Bulk payroll processed! 8 Personnel updated.'), 2000);
}

function viewPayslip(name, basic, hra, da, pf, esi, tds, net, worked) {
  Modal.create({
    title: `Payslip — ${name} (April 2026)`,
    body: `
      <div style="font-family:monospace; font-size:12px; border:1px solid var(--color-border-default); padding:20px; background:white; color:black;">
        <div style="text-align:center; font-weight:800; font-size:14px; margin-bottom:10px;">NEXA ENTERPRISE SOLUTIONS</div>
        <div style="border-bottom:2px solid black; margin-bottom:15px;"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; margin-bottom:15px;">
          <div>Emp Name: ${name}</div>
          <div>Worked Days: ${worked}/26</div>
          <div>Emp ID: E-SYD${Math.floor(Math.random()*1000)}</div>
          <div>Month: April 2026</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div>
            <div style="border-bottom:1px solid black; font-weight:700;">Earnings</div>
            <div style="display:flex; justify-content:space-between;"><span>Basic Pay</span><span>${Format.currency(basic)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>HRA</span><span>${Format.currency(hra)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>DA</span><span>${Format.currency(da)}</span></div>
          </div>
          <div>
            <div style="border-bottom:1px solid black; font-weight:700;">Deductions</div>
            <div style="display:flex; justify-content:space-between;"><span>PF Contribution</span><span>${Format.currency(pf)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>ESI</span><span>${Format.currency(esi)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>IT / TDS</span><span>${Format.currency(tds)}</span></div>
          </div>
        </div>
        <div style="border-top:2px solid black; margin-top:20px; padding-top:5px; font-weight:800; font-size:14px; display:flex; justify-content:space-between;">
          <span>Net Salary Paid</span>
          <span>${Format.currency(net)}</span>
        </div>
      </div>
    `,
    footer: `<button class="btn btn-primary" onclick="window.print()">🖨️ Print Payslip</button>`
  });
}

// ─── PURCHASE ORDERS (SAP MM) ────────────────────────────────
function renderPurchaseOrders() {
  const pos = [
    { id: '4500017777', vendor: 'HUL Suppliers', date: '2026-04-20', total: 42800, status: 'Confirmed', approval: 'Released', branch: 'main' },
    { id: '4500017778', vendor: 'Heritage Dairy', date: '2026-04-22', total: 15400, status: 'Draft', approval: 'To Release', branch: 'branch1' },
    { id: '4500017779', vendor: 'Reliance Market', date: '2026-04-24', total: 82000, status: 'In Ship', approval: 'Released', branch: 'branch2' },
    { id: '4500017780', vendor: 'Nestle India', date: '2026-04-25', total: 29300, status: 'Draft', approval: 'Rejected', branch: 'main' },
  ];

  const filtered = selectedBranches.includes('all') ? pos : pos.filter(p => selectedBranches.includes(p.branch));

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Purchasing Documents (MM-PUR)</div><div class="page-meta">Materials Management · Procurement Workflow</div></div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-secondary" onclick="exportCSV(pos, 'po_master.csv')">📦 Local File...</button>
        <button class="btn btn-primary" onclick="openPOSAPModal()">+ Create Purchase Order</button>
      </div>
    </div>

    <div class="panel-card" style="padding:0">
      <div style="background:var(--color-bg-tertiary); padding: 8px 16px; border-bottom: 1px solid var(--color-border-default); display: flex; justify-content:space-between;">
        <div style="font-size:11px; font-weight:700; color:var(--color-text-secondary); text-transform:uppercase;">STND PURCHASE ORDERS</div>
        <div style="font-size:10px; color:var(--color-text-tertiary); font-weight:600;">CONTEXT: ${selectedBranches.includes('all') ? 'Global' : selectedBranches.join(', ').toUpperCase()}</div>
      </div>
      <div style="overflow-x:auto">
        <table class="sap-dense-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Vendor Account</th>
              <th>Doc. Date</th>
              <th>Purch. Org.</th>
              <th>Net Amount</th>
              <th>Status</th>
              <th>Release Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(p => `
              <tr>
                <td style="font-family:var(--font-mono); font-weight:700; color:var(--color-brand-400)">${p.id}</td>
                <td>${p.vendor}</td>
                <td>${Format.date(p.date)}</td>
                <td>3000</td>
                <td style="font-weight:700">${Format.currency(p.total)}</td>
                <td><span class="badge badge-info" style="font-size:9px">${p.status.toUpperCase()}</span></td>
                <td>
                  <span class="badge badge-${p.approval==='Released'?'success':p.approval==='Rejected'?'danger':'warning'}" style="font-size:9px">
                    ${p.approval}
                  </span>
                </td>
                <td style="text-align:center"><button class="btn btn-sm btn-ghost" style="padding:2px" onclick="Toast.info('Opening Object ${p.id}...')">🔍</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openPOSAPModal() {
  const modal = Modal.create({
    title: 'Create Standard Purchase Order (ME21N)',
    size: 'lg',
    body: `
      <div id="po-sap-container"></div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop').remove()">Cancel Document</button>
      <button class="btn btn-secondary" onclick="Toast.info('Hold document successful.')">📦 Hold Document</button>
      <button class="btn btn-primary" onclick="Toast.success('PO 4500017781 Created!');document.querySelector('.modal-backdrop').remove()">💾 Post Document</button>
    `
  });

  const tabs = [
    { id: 'po-header', label: 'Header (General)', content: `
      <div class="sap-form-grid">
        <div><label class="sap-field-label">Vendor Account</label><select class="form-select">${DemoData.suppliers.map(s=>`<option>${s.name}</option>`).join('')}</select></div>
        <div><label class="sap-field-label">Purch. Org.</label><input type="text" class="form-input" value="3000" /></div>
        <div><label class="sap-field-label">Purch. Group</label><input type="text" class="form-input" value="001" /></div>
        <div><label class="sap-field-label">Company Code</label><input type="text" class="form-input" value="1000" /></div>
        <div><label class="sap-field-label">Doc. Date</label><input type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}" /></div>
        <div><label class="sap-field-label">Payment Terms</label><input type="text" class="form-input" value="ZT01" /></div>
      </div>
    `},
    { id: 'po-items', label: 'Item Overview', content: `
      <table class="sap-dense-table">
        <thead>
          <tr><th>Line</th><th>Material</th><th>Short Text</th><th>PO Quantity</th><th>Net Price</th><th>Total</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>10</td>
            <td><input type="text" class="form-input" style="padding:2px" value="WH-102" /></td>
            <td>Warehouse Staples Package</td>
            <td><input type="number" class="form-input" style="padding:2px" value="50" /></td>
            <td>280.00</td>
            <td>14,000.00</td>
          </tr>
          <tr><td>20</td><td><input type="text" class="form-input" style="padding:2px" /></td><td></td><td></td><td></td><td></td></tr>
          <tr><td>30</td><td><input type="text" class="form-input" style="padding:2px" /></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
      </table>
      <button class="btn btn-sm btn-ghost mt-2" onclick="Toast.info('Adding line...')">+ Append Item</button>
    `},
    { id: 'po-org', label: 'Org. Data', content: `
      <div class="sap-form-grid">
        <div><label class="sap-field-label">Plant</label><input type="text" class="form-input" value="3001" /></div>
        <div><label class="sap-field-label">Storage Loc.</label><input type="text" class="form-input" value="SL01" /></div>
      </div>
      <div style="margin-top:20px; font-size:12px; border-top:1px solid var(--color-border-subtle); padding-top:10px;">
        <span style="color:var(--color-text-secondary)">Tax Jurisdiction:</span> 2700-120 (GST Reg)
      </div>
    `}
  ];

  SAP_UI.renderTabs(tabs, 'po-sap-container');
}

// ─── PERSONNEL & ROLES ────────────────────────────────────────
function renderPersonnel() {
  const roles = [
    { name: 'Admin/Owner', desc: 'Full access to all branches and finances', count: 1 },
    { name: 'Manager', desc: 'Branch-specific management and approvals', count: 2 },
    { name: 'Cashier', desc: 'POS and initial sales reporting only', count: 4 },
    { name: 'Accountant', desc: 'GST, Accounting and Tax exports', count: 1 },
  ];

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Personnel & Roles</div><div class="page-meta">Manage multi-branch access and permissions</div></div>
      <button class="btn btn-primary" onclick="Toast.info('Opening user registration...')">+ Add Employee</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 300px;gap:var(--space-6)">
      <div class="panel-card">
        <div style="font-weight:700;margin-bottom:var(--space-4)">👥 Active Personnel</div>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Role</th><th>Primary Branch</th><th>Last Active</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${DemoData.staff.map((s,i) => `
              <tr>
                <td><div style="font-weight:600">${s.name}</div><div style="font-size:10px;color:var(--color-text-secondary)">emp_${100+i}@nexaerp.app</div></td>
                <td><span class="chip">${s.role}</span></td>
                <td><span style="font-size:var(--text-xs)">${['Main Store','Warehouse A','Retail B'][i%3]}</span></td>
                <td style="font-size:var(--text-xs)">Today, 2:45 PM</td>
                <td><span class="badge badge-success">Active</span></td>
                <td><button class="btn btn-sm btn-ghost" onclick="Toast.info('Editing ${s.name} permissions...')">Edit</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="panel-card">
        <div style="font-weight:700;margin-bottom:var(--space-4)">🛡️ Role Definitions</div>
        ${roles.map(r => `
          <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);margin-bottom:var(--space-3);border:1px solid var(--color-border-subtle)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-weight:700;font-size:var(--text-sm)">${r.name}</span>
              <span class="badge badge-primary">${r.count}</span>
            </div>
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${r.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── APPROVAL WORKFLOW (SAP RELEASE STRATEGY) ────────────────
function renderApprovals() {
  const requests = [
    { id: 'REL-001', type: 'Purchase Order', document: '4500017778', requester: 'Sita Devi', amount: 15400, priority: 'High', date: '2026-04-24' },
    { id: 'REL-002', type: 'Petty Cash', document: 'EXP-9921', requester: 'Ravi Kumar', amount: 2500, priority: 'Medium', date: '2026-04-25' },
    { id: 'REL-003', type: 'New Asset', document: 'AST-102', requester: 'Store Manager', amount: 45000, priority: 'Critical', date: '2026-04-25' },
  ];

  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Global Release Strategy</div><div class="page-meta">Approval Inbox · Release Codes: L1, L2, L3</div></div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 340px; gap: var(--space-6);">
      <div class="panel-card" style="padding:0">
        <div style="background:var(--color-bg-tertiary); padding: 8px 16px; border-bottom: 1px solid var(--color-border-default); font-weight:700; font-size:11px; text-transform:uppercase;">Pending Releases</div>
        <div style="overflow-x:auto">
          <table class="sap-dense-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Type</th>
                <th>Requisitioner</th>
                <th>Net Value</th>
                <th>Priority</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${requests.map(r => `
                <tr>
                  <td>${r.id}</td>
                  <td style="font-weight:600">${r.type} <span style="font-size:10px; color:var(--color-brand-400)">(${r.document})</span></td>
                  <td>${r.requester}</td>
                  <td style="font-weight:800">${Format.currency(r.amount)}</td>
                  <td><span class="chip" style="background:${r.priority==='Critical'?'var(--color-danger-900)':'transparent'}; color:${r.priority==='Critical'?'white':'inherit'}">${r.priority}</span></td>
                  <td>${Format.date(r.date)}</td>
                  <td>
                    <div style="display:flex; gap:4px">
                      <button class="btn btn-sm btn-success" onclick="Toast.success('Released document ${r.document}')">✅</button>
                      <button class="btn btn-sm btn-danger" onclick="Toast.error('Rejected request ${r.id}')">❌</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel-card">
        <div style="font-weight:700; margin-bottom:15px;">📥 Release Inbox Stats</div>
        <div style="display:flex; flex-direction:column; gap:12px">
          ${[
            { label: 'Awaiting Action', val: '3', color: 'var(--color-warning-400)' },
            { label: 'Released (MTD)', val: '24', color: 'var(--color-success-400)' },
            { label: 'Total Volume', val: '₹4.2L', color: 'var(--color-brand-400)' },
          ].map(s => `
            <div style="padding:15px; background:var(--color-bg-secondary); border-radius:12px; text-align:center;">
              <div style="font-size:10px; color:var(--color-text-secondary); text-transform:uppercase;">${s.label}</div>
              <div style="font-size:24px; font-weight:800; color:${s.color}">${s.val}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─── EXPORT CONTROL CENTER ──────────────────────────────────
function renderExport() {
  document.getElementById('page-body').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Export & Data Exchange</div><div class="page-meta">Unified Governance · SAP S/4HANA Compatibility</div></div>
    </div>

    <div class="grid grid-3col">
      <div class="panel-card">
        <div style="font-weight:700; margin-bottom:15px;">📦 Export Formats</div>
        <div style="display:flex; flex-direction:column; gap:8px">
          <button class="btn btn-outline btn-full" style="justify-content:flex-start" onclick="simulateExport('Excel')">📊 Microsoft Excel (.xlsx)</button>
          <button class="btn btn-outline btn-full" style="justify-content:flex-start" onclick="simulateExport('PDF')">📋 Adobe PDF (.pdf)</button>
          <button class="btn btn-outline btn-full" style="justify-content:flex-start" onclick="simulateExport('CSV')">📑 Flat File / CSV (.csv)</button>
          <button class="btn btn-outline btn-full" style="justify-content:flex-start" onclick="simulateExport('JSON')">💻 Developer JSON (.json)</button>
        </div>
      </div>

      <div class="panel-card grid-col-span-2">
        <div style="font-weight:700; margin-bottom:15px;">🛠️ Custom Data Requisition</div>
        <div class="form-grid" style="grid-template-columns: 1fr 1fr">
          <div class="form-group">
            <label class="form-label">Data Range</label>
            <input type="date" class="form-input" id="export-from" value="2026-04-01">
          </div>
          <div class="form-group">
            <label class="form-label">To</label>
            <input type="date" class="form-input" id="export-to" value="2026-04-25">
          </div>
          <div class="form-group">
            <label class="form-label">Module Filter</label>
            <select class="form-select" id="export-module">
              <option>All Transactions</option>
              <option>Payroll Only</option>
              <option>Procurement (MM)</option>
              <option>Sales (SD)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Entity Restriction</label>
            <select class="form-select" id="export-entity">
              <option>Global Business Area</option>
              <option>Main Branch</option>
              <option>Retail B</option>
            </select>
          </div>
        </div>
        <div style="margin-top:20px; display:flex; gap:10px">
          <button class="btn btn-primary" onclick="simulateExport('Custom Job')">Execute Export Job</button>
          <button class="btn btn-ghost" onclick="Toast.info('Previewing first 100 rows...')">Live Preview</button>
        </div>
      </div>
    </div>
    
    <div id="export-progress-container" style="margin-top:20px; display:none">
      <div class="panel-card" style="border:1px solid var(--color-brand-500)">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px">
          <span style="font-weight:700" id="export-msg">Processing Export...</span>
          <span style="font-weight:800; color:var(--color-brand-400)" id="export-pct">0%</span>
        </div>
        <div class="progress-bar" style="height:8px">
          <div class="progress-fill" id="export-bar" style="width:0%; background:var(--gradient-brand)"></div>
        </div>
      </div>
    </div>
  `;
}

function simulateExport(format) {
  const container = document.getElementById('export-progress-container');
  const bar = document.getElementById('export-bar');
  const pct = document.getElementById('export-pct');
  const msg = document.getElementById('export-msg');
  
  container.style.display = 'block';
  msg.textContent = `Gathering data for ${format} export...`;
  
  let p = 0;
  const interval = setInterval(() => {
    p += Math.random() * 15;
    if (p >= 100) {
      p = 100;
      clearInterval(interval);
      Toast.success(`${format} export completed successfully!`);
      setTimeout(() => { container.style.display = 'none'; }, 2000);
    }
    bar.style.width = p + '%';
    pct.textContent = Math.round(p) + '%';
    
    if (p > 30) msg.textContent = 'Formatting records...';
    if (p > 70) msg.textContent = 'Generating final file...';
  }, 400);
}

// ─── ENTERPRISE MESSENGER (CHAT) ──────────────────────────────
function renderChat() {
  const users = [
    { id: 1, name: 'Arjun Sharma', status: 'online', role: 'Owner', avatar: 'AS' },
    { id: 2, name: 'Priya Patel', status: 'away', role: 'Cashier', avatar: 'PP' },
    { id: 3, name: 'Rahul Kumar', status: 'online', role: 'Manager', avatar: 'RK' },
    { id: 4, name: 'System Bot', status: 'online', role: 'NexaAI', avatar: 'AI' },
  ];

  const messages = [
    { from: 2, text: 'Arjun, we need to restock the Heritage Dairy products for Warehouse A.', time: '09:12 AM' },
    { from: 1, text: 'I saw the notification. I will release the PO now.', time: '09:15 AM' },
    { from: 4, text: 'Alert: Low stock on [Basmati Rice] in Retail B. Recommending order of 50 units.', time: '10:01 AM' },
    { from: 3, text: 'Accepted the recommendation. PO created.', time: '10:05 AM' },
  ];

  document.getElementById('page-body').innerHTML = `
    <div style="display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 160px); background: var(--color-bg-card); border-radius: var(--radius-2xl); border: 1px solid var(--color-border-default); overflow: hidden;">
      <!-- Chat Sidebar -->
      <div style="border-right: 1px solid var(--color-border-default); display: flex; flex-direction: column; background: var(--color-bg-secondary);">
        <div style="padding: 20px; border-bottom: 1px solid var(--color-border-default);">
          <div class="heading-4">Teams Messenger</div>
          <p class="caption">Enterprise Communication</p>
        </div>
        <div style="flex: 1; overflow-y: auto; padding: 10px;">
          ${users.map(u => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: var(--radius-lg); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--color-surface-subtle)'" onmouseout="this.style.background='transparent'">
              <div style="position: relative;">
                <div class="avatar avatar-sm">${u.avatar}</div>
                <div style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; border-radius: 50%; background: ${u.status === 'online' ? 'var(--color-success-400)' : 'var(--color-warning-400)'}; border: 2px solid var(--color-bg-secondary);"></div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 600;">${u.name}</div>
                <div style="font-size: 11px; color: var(--color-text-tertiary);">${u.role}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Chat Main -->
      <div style="display: flex; flex-direction: column;">
        <div style="padding: 16px 24px; border-bottom: 1px solid var(--color-border-default); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="avatar avatar-sm">AS</div>
            <div>
              <div style="font-size: 14px; font-weight: 700;">General Channel</div>
              <div style="font-size: 11px; color: var(--color-success-400);">4 members active</div>
            </div>
          </div>
          <button class="btn btn-sm btn-ghost">⚙️</button>
        </div>
        
        <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px;">
          ${messages.map(m => {
            const user = users.find(u => u.id === m.from);
            return `
              <div style="display: flex; gap: 12px;">
                <div class="avatar avatar-sm">${user?.avatar || '?'}</div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 13px; font-weight: 700;">${user?.name || 'Unknown'}</span>
                    <span style="font-size: 10px; color: var(--color-text-tertiary);">${m.time}</span>
                  </div>
                  <div style="padding: 10px 14px; background: var(--color-bg-primary); border: 1px solid var(--color-border-default); border-radius: 0 12px 12px 12px; font-size: 13px; line-height: 1.5; color: var(--color-text-secondary); max-width: 500px;">
                    ${m.text}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="padding: 20px; border-top: 1px solid var(--color-border-default);">
          <div style="display: flex; gap: 12px; background: var(--color-bg-secondary); padding: 8px 16px; border-radius: var(--radius-xl); border: 1px solid var(--color-border-default);">
            <button class="btn btn-icon btn-ghost" style="padding: 0;">📎</button>
            <input type="text" placeholder="Type a message to the team..." style="flex: 1; background: transparent; border: none; outline: none; color: var(--color-text-primary); font-size: 13px;" onkeydown="if(event.key==='Enter') Toast.success('Message sent!')">
            <button class="btn btn-icon btn-ghost" style="padding: 0;">😊</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Scroll to bottom
  const container = document.getElementById('chat-messages');
  if (container) container.scrollTop = container.scrollHeight;
}

/**
 * NexaERP — Frontend Utilities
 * API Client (real backend + demo fallback), Auth, Format, Toast, Modal, DOM, Theme
 * v2.0 — with MongoDB backend support + Socket.io + Themes
 */

// ─── CONFIG ───────────────────────────────────────────────
const CONFIG = {
  // Change this to your Render.com backend URL after deployment
  API_BASE: window.NEXAERP_API || 'https://nexaerp-api.onrender.com/api',
  DEMO_MODE: false, // Set to true to bypass backend
  SOCKET_URL: window.NEXAERP_SOCKET || 'https://nexaerp-api.onrender.com',
};

// ─── THEMES ───────────────────────────────────────────────
const THEMES = {
  dark: {
    '--color-bg-primary':    '#0a0a0f',
    '--color-bg-secondary':  '#111118',
    '--color-bg-card':       '#161622',
    '--color-bg-elevated':   '#1e1e2e',
    '--color-brand-400':     '#818cf8',
    '--color-brand-500':     '#6366f1',
    '--gradient-brand':      'linear-gradient(135deg, #6366f1, #8b5cf6)',
    '--color-text-primary':  '#f8fafc',
    '--color-text-secondary':'#94a3b8',
    '--color-border-default':'rgba(255,255,255,0.08)',
    '--sidebar-bg':          '#0d0d15',
  },
  light: {
    '--color-bg-primary':    '#f8fafc',
    '--color-bg-secondary':  '#f1f5f9',
    '--color-bg-card':       '#ffffff',
    '--color-bg-elevated':   '#e2e8f0',
    '--color-brand-400':     '#4f46e5',
    '--color-brand-500':     '#4338ca',
    '--gradient-brand':      'linear-gradient(135deg, #4338ca, #7c3aed)',
    '--color-text-primary':  '#0f172a',
    '--color-text-secondary':'#475569',
    '--color-border-default':'rgba(0,0,0,0.1)',
    '--sidebar-bg':          '#1e1b4b',
  },
  ocean: {
    '--color-bg-primary':    '#040d14',
    '--color-bg-secondary':  '#071522',
    '--color-bg-card':       '#0a1f30',
    '--color-bg-elevated':   '#102a40',
    '--color-brand-400':     '#38bdf8',
    '--color-brand-500':     '#0ea5e9',
    '--gradient-brand':      'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    '--color-text-primary':  '#e0f2fe',
    '--color-text-secondary':'#7dd3fc',
    '--color-border-default':'rgba(56,189,248,0.12)',
    '--sidebar-bg':          '#040d14',
  },
  forest: {
    '--color-bg-primary':    '#050e06',
    '--color-bg-secondary':  '#0a1a0b',
    '--color-bg-card':       '#0f2210',
    '--color-bg-elevated':   '#162c17',
    '--color-brand-400':     '#4ade80',
    '--color-brand-500':     '#22c55e',
    '--gradient-brand':      'linear-gradient(135deg, #16a34a, #15803d)',
    '--color-text-primary':  '#dcfce7',
    '--color-text-secondary':'#86efac',
    '--color-border-default':'rgba(74,222,128,0.12)',
    '--sidebar-bg':          '#050e06',
  },
  sunset: {
    '--color-bg-primary':    '#140808',
    '--color-bg-secondary':  '#1f0f0a',
    '--color-bg-card':       '#271210',
    '--color-bg-elevated':   '#341a16',
    '--color-brand-400':     '#fb923c',
    '--color-brand-500':     '#f97316',
    '--gradient-brand':      'linear-gradient(135deg, #f97316, #dc2626)',
    '--color-text-primary':  '#fff7ed',
    '--color-text-secondary':'#fed7aa',
    '--color-border-default':'rgba(249,115,22,0.12)',
    '--sidebar-bg':          '#140808',
  }
};

// ─── THEME MANAGER ────────────────────────────────────────
const ThemeManager = {
  current: 'dark',

  apply(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;
    this.current = themeName;
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, val]) => root.style.setProperty(key, val));
    localStorage.setItem('nexaerp_theme', themeName);
    document.body.dataset.theme = themeName;

    // Update theme buttons if present
    document.querySelectorAll('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === themeName);
    });
  },

  init() {
    const saved = localStorage.getItem('nexaerp_theme') || Auth.getUser()?.preferences?.theme || 'dark';
    this.apply(saved);
  },

  toggle() {
    const themes = Object.keys(THEMES);
    const idx = themes.indexOf(this.current);
    this.apply(themes[(idx + 1) % themes.length]);
  }
};

// ─── AUTH ─────────────────────────────────────────────────
const Auth = {
  TOKEN_KEY: 'nexaerp_token',
  USER_KEY:  'nexaerp_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser()  {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY)); }
    catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },
  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  },
  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = 'index.html'; return false; }
    return true;
  },
  can(roles) {
    const user = this.getUser();
    if (!user) return false;
    return roles.includes(user.role);
  }
};

// ─── HTTP CLIENT ──────────────────────────────────────────
const Http = {
  _isOnline: true,
  _requestQueue: [],

  async request(method, path, data = null, opts = {}) {
    const token = Auth.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    try {
      const url = path.startsWith('http') ? path : `${CONFIG.API_BASE}${path}`;
      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(opts.timeout || 15000),
      });

      const json = await res.json().catch(() => ({ success: false, message: res.statusText }));

      if (res.status === 401) {
        Auth.clearSession();
        if (!window.location.pathname.includes('index')) {
          window.location.href = 'index.html';
          return;
        }
      }

      if (!res.ok && !opts.raw) {
        throw new Error(json.message || `HTTP ${res.status}`);
      }

      this._isOnline = true;
      return json;

    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'TypeError' || err.message.includes('fetch')) {
        this._isOnline = false;
        // Fallback to demo mode if backend is unreachable
        if (CONFIG.DEMO_MODE) {
          return this._demoResponse(method, path, data);
        }
        Toast.error('Cannot reach server. Check your connection or the backend is starting up (Render free tier may take ~30s).');
        return null;
      }
      throw err;
    }
  },

  get(path, opts)         { return this.request('GET', path, null, opts); },
  post(path, data, opts)  { return this.request('POST', path, data, opts); },
  put(path, data, opts)   { return this.request('PUT', path, data, opts); },
  patch(path, data, opts) { return this.request('PATCH', path, data, opts); },
  delete(path, opts)      { return this.request('DELETE', path, null, opts); },

  // Demo responses (fallback when no backend)
  _demoResponse(method, path, data) {
    const segments = path.replace('/api/', '').split('/');
    const resource = segments[0];
    console.warn(`[DEMO] ${method} ${path}`);

    const resourceMap = {
      products:      DemoData?.products || [],
      orders:        DemoData?.orders || [],
      customers:     DemoData?.customers || [],
      staff:         DemoData?.staff || [],
      notifications: DemoData?.notifications || [],
      suppliers:     DemoData?.suppliers || [],
      transactions:  DemoData?.transactions || [],
    };

    if (method === 'GET') {
      if (resource === 'analytics' && segments[1] === 'dashboard') {
        return { success: true, data: {
          todaySales: 12480, todayOrders: 34,
          totalCustomers: DemoData?.customers?.length || 0,
          totalProducts: DemoData?.products?.length || 0,
          lowStockCount: DemoData?.products?.filter(p => p.stock <= p.minStock)?.length || 0,
          weekRevenue: 84320,
        }};
      }
      const items = resourceMap[resource] || [];
      return { success: true, data: items, meta: { total: items.length } };
    }

    if (method === 'POST' && resource === 'auth') {
      if (segments[1] === 'login') {
        return {
          success: true, token: 'demo.jwt.token',
          user: { name: 'Demo User', role: 'owner', email: data?.email, storeId: 'store-001' }
        };
      }
    }

    return { success: true, message: 'Demo mode — changes not persisted', data };
  }
};

// ─── SOCKET MANAGER ───────────────────────────────────────
const SocketManager = {
  socket: null,
  connected: false,

  connect() {
    if (typeof io === 'undefined') return; // Socket.io not loaded

    const token = Auth.getToken();
    this.socket = io(CONFIG.SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('🔌 Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
    });

    // ── Real-time notifications ─────────────────────────
    this.socket.on('notification', (data) => {
      NotificationManager.showBanner(data);
      NotificationManager.incrementBadge();
    });

    this.socket.on('critical_stock', (data) => {
      Toast.error(`🚨 CRITICAL: ${data.count} item(s) are OUT OF STOCK: ${data.items.join(', ')}`);
    });

    this.socket.on('new_sale', (data) => {
      // Refresh dashboard if visible
      if (window.currentModule === 'dashboard') {
        Toast.info(`💰 New sale: ${Format.currency(data.total)} by ${data.cashier}`);
      }
    });

    this.socket.on('stock_changed', (data) => {
      // If on inventory page, refresh
      if (window.currentModule === 'inventory') {
        refreshInventoryStock(data);
      }
    });

    this.socket.on('order_updated', (data) => {
      if (window.currentModule === 'orders') {
        Toast.info(`📦 Order ${data.orderNo}: ${data.stage} → ${data.status}`);
      }
    });

    this.socket.on('user_online', (data) => {
      console.log(`👤 ${data.name} (${data.role}) came online`);
    });
  },

  emit(event, data) {
    if (this.socket?.connected) this.socket.emit(event, data);
  },

  disconnect() {
    this.socket?.disconnect();
  }
};

// ─── NOTIFICATION MANAGER ─────────────────────────────────
const NotificationManager = {
  _count: 0,

  async init() {
    const res = await Http.get('/notifications?limit=1');
    if (res?.meta?.unreadCount !== undefined) {
      this._count = res.meta.unreadCount;
      this.updateBadge();
    }
  },

  incrementBadge() {
    this._count++;
    this.updateBadge();
  },

  updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    badge.textContent = this._count > 99 ? '99+' : this._count;
    badge.style.display = this._count > 0 ? 'flex' : 'none';
  },

  showBanner(data) {
    const bannerEl = document.createElement('div');
    bannerEl.className = 'notif-banner';
    bannerEl.innerHTML = `
      <div class="notif-banner-icon">${data.type === 'out_of_stock' ? '🚨' : data.type === 'low_stock' ? '⚠️' : '🔔'}</div>
      <div>
        <div class="notif-banner-title">${data.title}</div>
        <div class="notif-banner-msg">${data.message}</div>
      </div>
      <button class="notif-banner-close" onclick="this.closest('.notif-banner').remove()">×</button>
    `;
    bannerEl.dataset.priority = data.priority || 'medium';
    document.body.appendChild(bannerEl);
    setTimeout(() => bannerEl.remove(), 8000);
  },

  async markAllRead() {
    await Http.patch('/notifications/read-all');
    this._count = 0;
    this.updateBadge();
  }
};

// ─── FORMAT HELPERS ───────────────────────────────────────
const Format = {
  currency(val, currency = '₹') {
    if (val === null || val === undefined) return `${currency}0.00`;
    return `${currency}${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
  number(val) {
    if (!val && val !== 0) return '—';
    return Number(val).toLocaleString('en-IN');
  },
  percent(val, decimals = 1) {
    return `${Number(val || 0).toFixed(decimals)}%`;
  },
  date(val) {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  datetime(val) {
    if (!val) return '—';
    const d = new Date(val);
    return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  },
  relativeTime(val) {
    if (!val) return '';
    const diff = Date.now() - new Date(val).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return Format.date(val);
  },
  initials(name = '') {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  },
  stockStatus(stock, minStock) {
    if (stock === 0)         return { label: 'Out of Stock', class: 'badge-danger',  icon: '🔴' };
    if (stock <= minStock)   return { label: 'Low Stock',    class: 'badge-warning', icon: '🟡' };
    return                          { label: 'In Stock',     class: 'badge-success', icon: '🟢' };
  }
};

// ─── DOM HELPERS ──────────────────────────────────────────
const DOM = {
  $(sel)          { return document.querySelector(sel); },
  $$(sel)         { return document.querySelectorAll(sel); },
  setText(sel, txt) {
    const el = typeof sel === 'string' ? this.$(sel) : sel;
    if (el) el.textContent = txt;
  },
  setHTML(sel, html) {
    const el = typeof sel === 'string' ? this.$(sel) : sel;
    if (el) el.innerHTML = html;
  },
  show(sel) { const el = this.$(sel); if (el) el.style.display = ''; },
  hide(sel) { const el = this.$(sel); if (el) el.style.display = 'none'; },
  addClass(sel, cls)    { const el = this.$(sel); if (el) el.classList.add(cls); },
  removeClass(sel, cls) { const el = this.$(sel); if (el) el.classList.remove(cls); },
  toggle(sel, cls)      { const el = this.$(sel); if (el) el.classList.toggle(cls); },
  on(sel, event, fn) {
    const el = typeof sel === 'string' ? this.$(sel) : sel;
    if (el) el.addEventListener(event, fn);
  }
};

// ─── TOAST NOTIFICATIONS ──────────────────────────────────
const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'toast-container';
      this._container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:380px';
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(msg, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const colors = {
      success: 'var(--color-success-400)',
      error:   'var(--color-danger-400)',
      warning: 'var(--color-warning-400)',
      info:    'var(--color-brand-400)',
    };

    const el = document.createElement('div');
    el.className = 'toast-item';
    el.style.cssText = `
      display:flex;align-items:flex-start;gap:12px;
      background:var(--color-bg-elevated);
      border:1px solid var(--color-border-default);
      border-left:3px solid ${colors[type]};
      border-radius:12px;padding:12px 16px;
      animation:slideInRight 0.3s ease;
      box-shadow:var(--shadow-xl);
      backdrop-filter:blur(8px);
      max-width:380px;
      cursor:pointer;
    `;
    el.innerHTML = `
      <span style="font-size:18px;flex-shrink:0;margin-top:1px">${icons[type]}</span>
      <span style="font-size:13px;color:var(--color-text-primary);flex:1;line-height:1.4">${msg}</span>
      <button onclick="this.closest('.toast-item').remove()" style="background:none;border:none;color:var(--color-text-tertiary);cursor:pointer;font-size:16px;line-height:1;flex-shrink:0">×</button>
    `;
    el.onclick = (e) => { if (e.target.tagName !== 'BUTTON') el.remove(); };

    this._getContainer().appendChild(el);
    if (duration > 0) setTimeout(() => el.remove(), duration);
    return el;
  },

  success(msg, dur) { return this.show(msg, 'success', dur); },
  error(msg, dur)   { return this.show(msg, 'error', dur ||6000); },
  warning(msg, dur) { return this.show(msg, 'warning', dur); },
  info(msg, dur)    { return this.show(msg, 'info', dur); },
};

// ─── MODAL ────────────────────────────────────────────────
const Modal = {
  create({ title = '', body = '', footer = '', size = '' } = {}) {
    document.querySelector('.modal-backdrop')?.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal ${size === 'lg' ? 'modal-large' : ''}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="document.querySelector('.modal-backdrop').remove()" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(backdrop);
    return backdrop;
  },
  close() { document.querySelector('.modal-backdrop')?.remove(); }
};

// ─── LOADING OVERLAY ──────────────────────────────────────
const Loading = {
  show(msg = 'Loading...') {
    let el = document.getElementById('global-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-loader';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(4px)';
      el.innerHTML = `<div style="text-align:center;color:white"><div class="spinner" style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.2);border-top-color:var(--color-brand-500);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px"></div><div style="font-size:14px;opacity:0.8">${msg}</div></div>`;
      document.body.appendChild(el);
    }
  },
  hide() { document.getElementById('global-loader')?.remove(); }
};

// ─── CSV EXPORT (OPTIMIZED) ───────────────────────────────
function exportCSV(data, filename = 'export.csv') {
  if (!data?.length) { Toast.warning('No data to export'); return; }
  
  Loading.show(`Preparing ${filename}...`);
  
  // Use setTimeout to allow the loader to appear before the heavy work
  setTimeout(() => {
    try {
      const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
      
      // Build CSV with proper escaping for Excel compatibility
      let csvContent = keys.join(',') + '\r\n';
      
      data.forEach(row => {
        const line = keys.map(k => {
          let val = row[k] ?? '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',');
        csvContent += line + '\r\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.setAttribute('download', filename);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      Toast.success(`✅ ${filename} ready!`);
    } catch (err) {
      console.error(err);
      Toast.error('Failed to generate export file.');
    } finally {
      Loading.hide();
    }
  }, 100);
}

// ─── SAP UI COMPONENTS ────────────────────────────────────
const SAP_UI = {
  renderTabs(tabs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="sap-tabs">
        <div class="sap-tab-header">
          ${tabs.map((t, i) => `
            <button class="sap-tab-btn ${i===0?'active':''}" onclick="SAP_UI.switchTab(this, '${t.id}')">
              ${t.label}
            </button>
          `).join('')}
        </div>
        <div class="sap-tab-content">
          ${tabs.map((t, i) => `
            <div id="${t.id}" class="sap-tab-pane ${i===0?'active':''}">
              ${t.content}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  
  switchTab(btn, paneId) {
    const parent = btn.closest('.sap-tabs');
    parent.querySelectorAll('.sap-tab-btn').forEach(b => b.classList.remove('active'));
    parent.querySelectorAll('.sap-tab-pane').forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(paneId).classList.add('active');
  }
};

// ─── PRINT ────────────────────────────────────────────────
function printElement(el) {
  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`<html><head><title>NexaERP Invoice</title><style>body{font-family:Arial,sans-serif;margin:0}</style></head><body>${el.outerHTML}</body></html>`);
  win.document.close();
  win.print();
  win.close();
}

// ─── ID GENERATOR ─────────────────────────────────────────
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── DEBOUNCE ─────────────────────────────────────────────
function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ─── INIT (runs on page load) ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
});

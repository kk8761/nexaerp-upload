// app.js

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    initNavigation();
    setupSyncButton();
    setupLogin();
});

async function checkSession() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success && data.user) {
            currentUser = data.user;
            showApp();
        } else {
            showLogin();
        }
    } catch (e) {
        showLogin();
    }
}

function setupLogin() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');
        errorEl.style.display = 'none';

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (data.success) {
                currentUser = data.user;
                showApp();
            } else {
                errorEl.textContent = data.message || 'Invalid credentials';
                errorEl.style.display = 'block';
            }
        } catch (error) {
            errorEl.textContent = 'Server connection failed';
            errorEl.style.display = 'block';
        }
    });
}

function showLogin() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    loadDashboardView();
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            e.currentTarget.parentElement.classList.add('active');
            
            const view = e.currentTarget.getAttribute('data-view');
            switchView(view);
        });
    });
}

function switchView(viewName) {
    const container = document.getElementById('view-container');
    container.innerHTML = ''; 
    
    let viewHTML = '';
    if(viewName === 'dashboard') {
        viewHTML = getDashboardHTML();
    } else {
        viewHTML = getPlaceholderHTML(viewName);
    }
    
    container.innerHTML = viewHTML;
    
    container.classList.remove('fade-in');
    void container.offsetWidth; 
    container.classList.add('fade-in');
    
    if (viewName !== 'dashboard') {
        fetchRealData(viewName);
    }
}

function getDashboardHTML() {
    return `
        <div class="glass-banner">
            <h1>Welcome back, ${currentUser ? currentUser.name : 'Admin'}! 👋</h1>
            <p>Here's what's happening across your NexaERP enterprise today.</p>
        </div>

        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-header">
                    <span>Total Revenue</span>
                    <div class="stat-icon"><i class="fa-solid fa-dollar-sign"></i></div>
                </div>
                <div class="stat-value">$124,500</div>
                <div class="stat-trend positive"><i class="fa-solid fa-arrow-trend-up"></i> +12.5% from last month</div>
            </div>
            <!-- More dynamic stats could be fetched from /api/bi/report -->
        </div>
    `;
}

function getPlaceholderHTML(moduleName) {
    const formattedName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    return `
        <div class="glass-banner">
            <h1>${formattedName} Module</h1>
            <p>Enterprise Grade feature suite loaded.</p>
        </div>
        <div id="${moduleName}-content" class="stat-card" style="min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;">
            <div class="spinner"></div>
            <p>Fetching real-time data from /api/${moduleName}...</p>
        </div>
    `;
}

async function fetchRealData(moduleName) {
    const contentDiv = document.getElementById(`${moduleName}-content`);
    try {
        // We will attempt to fetch from the actual API routes built in earlier steps
        let endpoint = `/api/${moduleName}`;
        if (moduleName === 'inventory') endpoint = '/api/inventory/warehouses';
        if (moduleName === 'accounting') endpoint = '/api/accounting/coa';
        if (moduleName === 'hrms') endpoint = '/api/hrms/employees';

        const res = await fetch(endpoint);
        const data = await res.json();
        
        let html = \`<div style="width: 100%; text-align: left;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h3>\${moduleName.toUpperCase()} Data</h3>
                <button class="btn-primary" onclick="alert('Action triggered for \${moduleName}')">+ Create New</button>
            </div>
            <pre style="background: rgba(0,0,0,0.5); padding: 16px; border-radius: 8px; overflow-x: auto; color: #a5b4fc;"><code>\${JSON.stringify(data, null, 2)}</code></pre>
        </div>\`;
        
        contentDiv.innerHTML = html;
        contentDiv.style.justifyContent = 'flex-start';
    } catch (e) {
        contentDiv.innerHTML = \`<p style="color: var(--danger)">Failed to fetch data: \${e.message}</p>\`;
    }
}

function loadDashboardView() {
    switchView('dashboard');
}

function setupSyncButton() {
    const btn = document.getElementById('btn-sync-db');
    if(btn) {
        btn.addEventListener('click', async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.reload();
        });
        btn.innerHTML = '<i class="fa-solid fa-sign-out"></i> Logout';
    }
}


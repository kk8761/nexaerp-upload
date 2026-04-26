/**
 * NexaERP — Authentication Module
 * Handles login, registration, demo login, and password utilities
 */

// ─── Demo Credentials ──────────────────────────────────────────
const DEMO_USERS = {
  owner: {
    id: 'demo-owner-001',
    email: 'owner@nexaerp.demo',
    name: 'Arjun Sharma',
    role: 'owner',
    business: 'Sharma Grocery & Provisions',
    businessType: 'grocery',
    avatar: 'AS',
    plan: 'free',
    storeId: 'store-001'
  },
  cashier: {
    id: 'demo-cashier-001',
    email: 'cashier@nexaerp.demo',
    name: 'Priya Patel',
    role: 'cashier',
    business: 'Sharma Grocery & Provisions',
    businessType: 'grocery',
    avatar: 'PP',
    plan: 'free',
    storeId: 'store-001'
  },
  manager: {
    id: 'demo-manager-001',
    email: 'manager@nexaerp.demo',
    name: 'Rahul Kumar',
    role: 'manager',
    business: 'Sharma Grocery & Provisions',
    businessType: 'grocery',
    avatar: 'RK',
    plan: 'free',
    storeId: 'store-001'
  }
};

// ─── Tab Switching ─────────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.auth-form-section').forEach(s => {
    s.classList.remove('active');
  });

  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`tab-${tab}`).setAttribute('aria-selected', 'true');
  document.getElementById(`form-${tab}`).classList.add('active');
}

// ─── Login Handler ─────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me')?.checked || false;
  let valid = true;

  // Validate
  Validate.clearError('login-email');
  Validate.clearError('login-password');

  if (!Validate.email(email)) {
    Validate.showError('login-email', 'Enter a valid email address');
    valid = false;
  }

  if (!Validate.minLength(password, 6)) {
    Validate.showError('login-password', 'Password must be at least 6 characters');
    valid = false;
  }

  if (!valid) return;

  // Show loading state
  setLoading('login-btn', true);

  try {
    // Try API login first
    let user, token;

    // Demo mode — check hardcoded creds
    const demoUser = Object.values(DEMO_USERS).find(u => u.email === email);
    if (demoUser && password === 'demo123') {
      token = generateDemoToken(demoUser);
      user = demoUser;
    } else {
      // Real API call
      const res = await Http.post('/auth/login', { email, password, rememberMe });
      
      // Check if MFA is required
      if (res.requireMFA) {
        Toast.info('MFA verification required');
        setTimeout(() => {
          window.location.href = '/mfa/verify';
        }, 500);
        return;
      }
      
      token = res.token;
      user  = res.user;
    }

    // Persist session
    Auth.setSession(token, user);

    // Remember me
    if (rememberMe) {
      Storage.set('nexaerp_remember_email', email);
    }

    Toast.success(`Welcome back, ${user.name}! 👋`);

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);

  } catch (err) {
    Toast.error(err.message || 'Login failed. Check your credentials.');
    Validate.showError('login-email', 'Invalid email or password');
  } finally {
    setLoading('login-btn', false);
  }
}

// ─── Register Handler ──────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();

  const firstName    = document.getElementById('reg-fname').value.trim();
  const lastName     = document.getElementById('reg-lname').value.trim();
  const businessName = document.getElementById('reg-business').value.trim();
  const businessType = document.getElementById('reg-type').value;
  const email        = document.getElementById('reg-email').value.trim();
  const phone        = document.getElementById('reg-phone').value.trim();
  const password     = document.getElementById('reg-password').value;
  const agreed       = document.getElementById('agree-terms').checked;

  let valid = true;
  ['reg-fname', 'reg-email'].forEach(f => Validate.clearError(f));

  if (!Validate.required(firstName)) {
    Validate.showError('reg-fname', 'First name is required');
    valid = false;
  }

  if (!Validate.email(email)) {
    Validate.showError('reg-email', 'Enter a valid email address');
    valid = false;
  }

  if (!businessName) {
    Toast.error('Please enter your business name');
    valid = false;
  }

  if (!businessType) {
    Toast.error('Please select your business type');
    valid = false;
  }

  if (!Validate.minLength(password, 8)) {
    Toast.error('Password must be at least 8 characters');
    valid = false;
  }

  if (!agreed) {
    Toast.error('Please accept the Terms of Service');
    valid = false;
  }

  if (!valid) return;

  setLoading('register-btn', true);

  try {
    const payload = {
      firstName, lastName,
      name: `${firstName} ${lastName}`,
      businessName, businessType,
      email, phone, password
    };

    let user, token;

    try {
      const res = await Http.post('/auth/register', payload);
      token = res.token;
      user  = res.user;
    } catch {
      // Demo mode: create a local user
      user = {
        id: generateId(),
        name: `${firstName} ${lastName}`,
        email,
        role: 'owner',
        business: businessName,
        businessType,
        avatar: `${firstName[0]}${lastName[0]}`.toUpperCase(),
        plan: 'free',
        storeId: generateId()
      };
      token = generateDemoToken(user);
    }

    Auth.setSession(token, user);
    Toast.success(`Account created! Welcome to NexaERP, ${firstName}! 🎉`);

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);

  } catch (err) {
    Toast.error(err.message || 'Registration failed. Please try again.');
  } finally {
    setLoading('register-btn', false);
  }
}

// ─── Demo Login ────────────────────────────────────────────────
function loginDemo(role = 'owner') {
  const user = DEMO_USERS[role];
  if (!user) return;

  const token = generateDemoToken(user);
  Auth.setSession(token, user);

  Toast.info(`Logging in as ${user.name} (${role})...`);

  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 600);
}

// ─── Demo Token Generator ──────────────────────────────────────
function generateDemoToken(user) {
  // Create a fake JWT-like token for demo (not cryptographically secure)
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 3600), // 7 days
    iat: Math.floor(Date.now() / 1000),
    demo: true
  }));
  const sig = btoa('demo-signature');
  return `${header}.${payload}.${sig}`;
}

// ─── Password Visibility Toggle ───────────────────────────────
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ─── Password Strength Indicator ──────────────────────────────
function initPasswordStrength() {
  const passInput = document.getElementById('reg-password');
  const strengthEl = document.getElementById('password-strength');
  if (!passInput || !strengthEl) return;

  passInput.addEventListener('input', () => {
    const score = Validate.passwordStrength(passInput.value);
    const level = score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong';
    const bars = Array.from({ length: 4 }, (_, i) => {
      const active = i < score ? `active-${level}` : '';
      return `<div class="strength-bar ${active}"></div>`;
    }).join('');
    strengthEl.innerHTML = bars;
  });
}

// ─── Loading State Helper ──────────────────────────────────────
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');

  if (loading) {
    btn.disabled = true;
    text?.classList.add('hidden');
    loader?.classList.remove('hidden');
  } else {
    btn.disabled = false;
    text?.classList.remove('hidden');
    loader?.classList.add('hidden');
  }
}

// ─── Forgot Password ───────────────────────────────────────────
function showForgotPassword() {
  Modal.create({
    title: 'Reset Password',
    body: `
      <p class="body-sm" style="color:var(--color-text-secondary);margin-bottom:var(--space-4)">
        Enter your email address and we'll send you a reset link.
      </p>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" id="forgot-email" class="form-input" placeholder="you@business.com" />
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close(this)">Cancel</button>
      <button class="btn btn-primary" onclick="submitForgotPassword()">Send Reset Link</button>
    `
  });
}

async function submitForgotPassword() {
  const email = document.getElementById('forgot-email')?.value?.trim();
  if (!email || !Validate.email(email)) {
    Toast.error('Enter a valid email address');
    return;
  }

  try {
    await Http.post('/auth/forgot-password', { email });
  } catch {}

  Toast.success('If this email exists, you\'ll receive a reset link shortly.');
  document.querySelector('.modal-backdrop')?.remove();
}

// ─── Pre-fill remembered email ────────────────────────────────
function initRememberedEmail() {
  const savedEmail = Storage.get('nexaerp_remember_email');
  if (savedEmail) {
    const emailInput = document.getElementById('login-email');
    if (emailInput) emailInput.value = savedEmail;
    const rememberCheckbox = document.getElementById('remember-me');
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
}

// ─── Redirect if already logged in ───────────────────────────
function checkAlreadyLoggedIn() {
  if (Auth.isAuthenticated()) {
    window.location.href = 'dashboard.html';
  }
}

// ─── Initialise ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAlreadyLoggedIn();
  initRememberedEmail();
  initPasswordStrength();

  // Input validation on blur
  document.getElementById('login-email')?.addEventListener('blur', function() {
    if (this.value && !Validate.email(this.value)) {
      Validate.showError('login-email', 'Enter a valid email address');
    } else {
      Validate.clearError('login-email');
    }
  });

  document.getElementById('reg-email')?.addEventListener('blur', function() {
    if (this.value && !Validate.email(this.value)) {
      Validate.showError('reg-email', 'Enter a valid email address');
    } else {
      Validate.clearError('reg-email');
    }
  });
});

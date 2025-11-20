const API_BASE = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

function parseToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

function setAuthUI() {
  const token = getToken();
  const navRole = document.getElementById('navRole');
  if (token && navRole) {
    const payload = parseToken(token);
    navRole.textContent = payload ? `${payload.name || 'User'} • ${payload.role}` : 'User';
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      window.location.replace('login.html');
    });
  }
}

async function authorizedFetch(url, options = {}) {
  const token = getToken();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return Promise.reject(new Error('Unauthorized'));
  }
  return res;
}

// Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role') ? document.getElementById('role').value : undefined;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('loginBtnText');
    const btnSpinner = document.getElementById('loginBtnSpinner');
    if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Logging in...';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        const decodedRole = parseToken(data.token)?.role;
        window.location.href = decodedRole === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
      } else {
        const msg = data.message || `Login failed (${res.status})`;
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; } else { alert(msg); }
      }
    } catch (err) {
      if (errorEl) { errorEl.textContent = 'Cannot reach server. Is the backend running on http://localhost:5000?'; errorEl.style.display = 'block'; }
      console.error('Login error', err);
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'LOGIN';
      if (btnSpinner) btnSpinner.style.display = 'none';
    }
  });
}

// Handle Register
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Registered successfully. Please login.');
      window.location.href = 'login.html';
    } else {
      alert(data.message || 'Registration failed');
    }
  });
}

// Gate dashboards by role
document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const payload = token ? parseToken(token) : null;
  const isAdminPage = /admin-.*\.html$/.test(location.pathname);
  const isUserPage = location.pathname.endsWith('dashboard.html');
  if ((isAdminPage || isUserPage) && !payload) {
    window.location.href = 'login.html';
    return;
  }
  if (isAdminPage && payload?.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return;
  }
  if (isUserPage && payload?.role !== 'user') {
    window.location.href = 'admin-dashboard.html';
    return;
  }
  setAuthUI();
  // Password show/hide toggles
  // Login page
  const loginPw = document.getElementById('password');
  const toggleLogin = document.getElementById('toggleLoginPassword');
  if (loginPw && toggleLogin) {
    toggleLogin.addEventListener('click', (e) => {
      e.preventDefault();
      if (loginPw.type === 'password') {
        loginPw.type = 'text';
        toggleLogin.innerHTML = '<i class="bi bi-eye-slash"></i>';
        toggleLogin.setAttribute('aria-label', 'Hide password');
      } else {
        loginPw.type = 'password';
        toggleLogin.innerHTML = '<i class="bi bi-eye"></i>';
        toggleLogin.setAttribute('aria-label', 'Show password');
      }
    });
  }
  // Register page
  const regPw = document.getElementById('password');
  const toggleReg = document.getElementById('toggleRegisterPassword');
  if (regPw && toggleReg) {
    toggleReg.addEventListener('click', (e) => {
      e.preventDefault();
      if (regPw.type === 'password') {
        regPw.type = 'text';
        toggleReg.innerHTML = '<i class="bi bi-eye-slash"></i>';
        toggleReg.setAttribute('aria-label', 'Hide password');
      } else {
        regPw.type = 'password';
        toggleReg.innerHTML = '<i class="bi bi-eye"></i>';
        toggleReg.setAttribute('aria-label', 'Show password');
      }
    });
  }
  // Login page role selector
  const roleStudent = document.getElementById('roleStudent');
  const roleAdmin = document.getElementById('roleAdmin');
  const roleInput = document.getElementById('role');
  if (roleStudent && roleAdmin && roleInput) {
    roleStudent.addEventListener('click', () => {
      roleStudent.classList.add('active');
      roleAdmin.classList.remove('active');
      roleInput.value = 'user';
    });
    roleAdmin.addEventListener('click', () => {
      roleAdmin.classList.add('active');
      roleStudent.classList.remove('active');
      roleInput.value = 'admin';
    });
  }
});

window.API_BASE = API_BASE;
window.authorizedFetch = authorizedFetch;

// Global fallback: handle any element marked for logout
document.addEventListener('click', (e) => {
  const target = e.target.closest('#logoutBtn, [data-logout]');
  if (!target) return;
  e.preventDefault();
  try { localStorage.removeItem('token'); } catch {}
  window.location.replace('login.html');
});


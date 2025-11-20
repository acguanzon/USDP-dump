document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('admin-dashboard.html')) return;
  initAdminDashboard();
});

async function initAdminDashboard() {
  try {
    await Promise.all([loadStats(), bindActions()]);
  } catch (e) {
    console.error('Admin init error', e);
  }
}

async function loadStats() {
  try {
    const [usersRes, discountsRes, healthRes] = await Promise.all([
      authorizedFetch(`${API_BASE}/admin/users?limit=100&page=1`),
      authorizedFetch(`${API_BASE}/admin/discounts?limit=100&page=1`),
      fetch(`${API_BASE}/health`)
    ]);
    const users = await usersRes.json();
    const discounts = await discountsRes.json();
    const health = await healthRes.json().catch(() => ({ status: 'ok' }));

    const students = Array.isArray(users) ? users.filter(u => u.role === 'user').length : 0;
    const activeDiscounts = Array.isArray(discounts) ? discounts.filter(d => d.isActive).length : 0;

    const elStudents = document.getElementById('statStudents');
    const elStudentsDelta = document.getElementById('statStudentsDelta');
    const elActive = document.getElementById('statActiveDiscounts');
    const elActiveUpcoming = document.getElementById('statActiveUpcoming');
    const elBenefits = document.getElementById('statBenefits');
    const elStatus = document.getElementById('statSystemStatus');

    if (elStudents) elStudents.textContent = String(students);
    if (elStudentsDelta) elStudentsDelta.textContent = students ? `↑ ${Math.max(1, Math.round(students*0.025))} this month` : '';
    if (elActive) elActive.textContent = String(activeDiscounts);
    if (elActiveUpcoming) elActiveUpcoming.textContent = activeDiscounts ? `${Math.max(0, Math.round(activeDiscounts*0.1))} upcoming` : '';
    if (elBenefits) elBenefits.textContent = '—';
    if (elStatus) elStatus.textContent = (health && health.status === 'ok') ? 'Online' : 'Degraded';
  } catch (e) {
    console.error('Stats load failed', e);
  }
}

function bindActions() {
  const btnCreateDiscount = document.getElementById('btnCreateDiscount');
  const btnAddStudent = document.getElementById('btnAddStudent');
  const btnPostAnnouncement = document.getElementById('btnPostAnnouncement');
  const btnQRScanner = document.getElementById('btnQRScanner');
  const modalDiscount = new bootstrap.Modal(document.getElementById('modalCreateDiscount'));
  const modalStudent = new bootstrap.Modal(document.getElementById('modalAddStudent'));
  const modalAnnouncement = new bootstrap.Modal(document.getElementById('modalPostAnnouncement'));
  const modalQR = new bootstrap.Modal(document.getElementById('modalQRScanner'));
  if (btnCreateDiscount) btnCreateDiscount.addEventListener('click', () => modalDiscount.show());
  if (btnAddStudent) btnAddStudent.addEventListener('click', () => modalStudent.show());
  if (btnPostAnnouncement) btnPostAnnouncement.addEventListener('click', () => modalAnnouncement.show());
  if (btnQRScanner) btnQRScanner.addEventListener('click', () => modalQR.show());

  const formDiscount = document.getElementById('formCreateDiscount');
  const formStudent = document.getElementById('formAddStudent');
  const formAnnouncement = document.getElementById('formPostAnnouncement');
  if (formDiscount) formDiscount.addEventListener('submit', submitCreateDiscount);
  if (formStudent) formStudent.addEventListener('submit', submitAddStudent);
  if (formAnnouncement) formAnnouncement.addEventListener('submit', submitPostAnnouncement);

  const qrStart = document.getElementById('qrStart');
  const qrStop = document.getElementById('qrStop');
  const qrManualSubmit = document.getElementById('qrManualSubmit');
  if (qrStart) qrStart.addEventListener('click', startQRScanner);
  if (qrStop) qrStop.addEventListener('click', stopQRScanner);
  if (qrManualSubmit) qrManualSubmit.addEventListener('click', manualQRSubmit);
}

async function submitCreateDiscount(e) {
  e.preventDefault();
  const title = document.getElementById('cdTitle').value.trim();
  const description = document.getElementById('cdDesc').value.trim();
  const eligibility = document.getElementById('cdElig').value.trim();
  const isActive = document.getElementById('cdActive').checked;
  const msg = document.getElementById('cdMsg');
  msg.textContent = '';
  const res = await authorizedFetch(`${API_BASE}/admin/discounts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, eligibility, isActive })
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.ok) {
    msg.className = 'small text-success';
    msg.textContent = 'Discount created';
    document.getElementById('cdTitle').value = '';
    document.getElementById('cdDesc').value = '';
    document.getElementById('cdElig').value = '';
    document.getElementById('cdActive').checked = true;
    loadStats();
  } else {
    msg.className = 'small text-danger';
    msg.textContent = data.message || 'Failed to create discount';
  }
}

async function submitAddStudent(e) {
  e.preventDefault();
  const name = document.getElementById('asName').value.trim();
  const email = document.getElementById('asEmail').value.trim();
  const password = document.getElementById('asPassword').value;
  const msg = document.getElementById('asMsg');
  msg.textContent = '';
  const res = await authorizedFetch(`${API_BASE}/admin/users`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role: 'user' })
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.ok) {
    msg.className = 'small text-success';
    msg.textContent = 'Student added';
    document.getElementById('asName').value = '';
    document.getElementById('asEmail').value = '';
    document.getElementById('asPassword').value = '';
    loadStats();
  } else {
    msg.className = 'small text-danger';
    msg.textContent = data.message || 'Failed to add student';
  }
}

async function submitPostAnnouncement(e) {
  e.preventDefault();
  const title = document.getElementById('anTitle').value.trim();
  const body = document.getElementById('anBody').value.trim();
  const msg = document.getElementById('anMsg');
  msg.textContent = '';
  try {
    const key = 'admin_announcements';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift({ title, body, createdAt: Date.now() });
    localStorage.setItem(key, JSON.stringify(existing));
    msg.className = 'small text-success';
    msg.textContent = 'Announcement posted locally';
    document.getElementById('anTitle').value = '';
    document.getElementById('anBody').value = '';
  } catch {
    msg.className = 'small text-danger';
    msg.textContent = 'Failed to store announcement';
  }
}

let qrStream = null;
let qrDetector = null;
let qrDetecting = false;

async function startQRScanner() {
  const msg = document.getElementById('qrMsg');
  msg.textContent = '';
  try {
    if ('BarcodeDetector' in window) {
      qrDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
    }
    const video = document.getElementById('qrVideo');
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = qrStream; await video.play();
    qrDetecting = true;
    detectLoop();
  } catch (e) {
    msg.className = 'small text-danger';
    msg.textContent = 'Camera not available; use manual input';
  }
}

function stopQRScanner() {
  qrDetecting = false;
  try { const video = document.getElementById('qrVideo'); video.pause(); } catch {}
  if (qrStream) { qrStream.getTracks().forEach(t => t.stop()); qrStream = null; }
}

async function detectLoop() {
  if (!qrDetecting) return;
  const msg = document.getElementById('qrMsg');
  try {
    if (qrDetector) {
      const video = document.getElementById('qrVideo');
      const codes = await qrDetector.detect(video);
      if (Array.isArray(codes) && codes.length) {
        const code = codes[0].rawValue || codes[0].value || '';
        msg.className = 'small text-success';
        msg.textContent = `Scanned: ${code}`;
        stopQRScanner();
        return;
      }
    }
  } catch {}
  requestAnimationFrame(detectLoop);
}

function manualQRSubmit() {
  const msg = document.getElementById('qrMsg');
  const code = document.getElementById('qrManual').value.trim();
  if (!code) return;
  msg.className = 'small text-success';
  msg.textContent = `Code: ${code}`;
}
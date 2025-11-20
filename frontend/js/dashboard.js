async function loadDiscounts() {
  const loadingDiv = document.getElementById('discountsLoading');
  if (loadingDiv) loadingDiv.style.display = '';
  const res = await authorizedFetch(`${API_BASE}/user/discounts`);
  const discounts = await res.json();
  const list = document.getElementById('discountsList');
  if (loadingDiv) loadingDiv.style.display = 'none';
  if (!list) return;
  list.innerHTML = discounts.map(d => `
    <div class="col-md-6">
      <div class="card h-100 p-3 card-hover">
        <h5 class="mb-1">${d.title}</h5>
        <p class="text-secondary small">${d.description || ''}</p>
        ${d.eligibility ? `<div class="small text-secondary mb-2">Eligibility: ${d.eligibility}</div>` : ''}
        <button class="btn btn-primary" data-apply="${d._id}">Apply</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-apply]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-apply');
      const resApply = await authorizedFetch(`${API_BASE}/user/discounts/${id}/apply`, { method: 'POST' });
      const data = await resApply.json();
      if (resApply.ok) {
        alert('Application submitted');
        await loadApplications();
      } else {
        alert(data.message || 'Unable to apply');
      }
    });
  });
}

async function loadApplications() {
  const loadingRow = document.getElementById('appsLoading');
  if (loadingRow) loadingRow.style.display = '';
  const res = await authorizedFetch(`${API_BASE}/user/applications`);
  const apps = await res.json();
  const table = document.getElementById('applicationsTable');
  if (loadingRow) loadingRow.style.display = 'none';
  if (!table) return;
  if (!apps.length) {
    table.innerHTML = `<tr><td colspan="3" class="text-center text-secondary">No applications yet</td></tr>`;
    return;
  }
  table.innerHTML = apps.map(a => `
    <tr>
      <td>${a.title}</td>
      <td><span class="badge ${a.status==='approved'?'bg-success':a.status==='rejected'?'bg-danger':'bg-secondary'}">${a.status}</span></td>
      <td>${new Date(a.appliedAt).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

async function loadProfile() {
  const res = await authorizedFetch(`${API_BASE}/user/profile`);
  const me = await res.json();
  const name = document.getElementById('profileName');
  const email = document.getElementById('profileEmail');
  if (name) name.value = me.name || '';
  if (email) email.value = me.email || '';
  const cardName = document.getElementById('userCardName');
  const cardSid = document.getElementById('userStudentId');
  const cardTypeBadge = document.getElementById('userCardType');
  const cardHeader = document.getElementById('userCardHeader');
  const cardQr = document.getElementById('userCardQr');
  if (cardName) cardName.textContent = me.name || '';
  if (cardSid) cardSid.textContent = me.studentId || '';
  const type = (me.cardType === 'gold') ? 'gold' : 'blue';
  if (cardTypeBadge) {
    if (type === 'gold') { cardTypeBadge.textContent = 'GOLD'; cardTypeBadge.className = 'badge bg-warning text-dark'; }
    else { cardTypeBadge.textContent = 'BLUE'; cardTypeBadge.className = 'badge bg-primary'; }
  }
  if (cardHeader) {
    cardHeader.style.background = (type === 'gold') ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'linear-gradient(135deg,#1E40AF,#6D28D9)';
  }
  if (cardQr && window.QRCode) {
    const payload = (me.qrCode && me.qrCode !== '') ? me.qrCode : `SID:${me.studentId||''}|NAME:${me.name||''}`;
    try { QRCode.toCanvas(cardQr, payload, { width: 128 }); } catch {}
  }
}

function initProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profileName').value.trim();
    const res = await authorizedFetch(`${API_BASE}/user/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok) alert('Profile updated'); else alert(data.message || 'Failed to update');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!location.pathname.endsWith('dashboard.html')) return;
  await Promise.all([loadDiscounts(), loadApplications(), loadProfile()]);
  initProfileForm();
  initRedeem();
  initDownloadCard();
  initAnnouncements();
  initEvents();
  updateStats();
  initSidebarNav();
});

function initRedeem() {
  const form = document.getElementById('redeemForm');
  const msg = document.getElementById('redeemMsg');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const code = document.getElementById('redeemCode').value.trim();
    const res = await authorizedFetch(`${API_BASE}/user/tokens/redeem`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (res.ok) {
      msg.className = 'small mt-2 text-success';
      msg.textContent = data.message || 'Redeemed successfully';
      document.getElementById('redeemCode').value = '';
      await loadApplications();
    } else {
      msg.className = 'small mt-2 text-danger';
      msg.textContent = data.message || 'Failed to redeem';
    }
  });
}

function initDownloadCard() {
  const btn = document.getElementById('downloadCard');
  const card = document.getElementById('userCard');
  if (!btn || !card) return;
  btn.addEventListener('click', () => {
    try {
      const canvas = document.createElement('canvas');
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      canvas.width = w * 2; canvas.height = h * 2;
      const ctx = canvas.getContext('2d');
      const scale = 2;
      ctx.scale(scale, scale);
      const img = new Image();
      const dataUrl = svgOrCanvasToDataURL(card);
      if (!dataUrl) return;
      img.onload = () => { ctx.drawImage(img, 0, 0, w, h); downloadCanvas(canvas, 'student-card.png'); };
      img.src = dataUrl;
    } catch {}
  });
}

function svgOrCanvasToDataURL(el) {
  try {
    const rect = el.getBoundingClientRect();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);
    const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreign.setAttribute('width', '100%'); foreign.setAttribute('height', '100%');
    const clone = el.cloneNode(true);
    foreign.appendChild(clone);
    svg.appendChild(foreign);
    const s = new XMLSerializer().serializeToString(svg);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  } catch { return null; }
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function initAnnouncements() {
  const wrap = document.getElementById('announcementsList');
  if (!wrap) return;
  let items = [];
  try { items = JSON.parse(localStorage.getItem('admin_announcements') || '[]'); } catch {}
  if (!items.length) { wrap.innerHTML = '<div class="text-secondary">No announcements yet</div>'; return; }
  wrap.innerHTML = items.slice(0, 5).map(a => `
    <div class="mb-3">
      <div class="fw-semibold">${escapeHtml(a.title || '')}</div>
      <div class="text-secondary">${escapeHtml(a.body || '')}</div>
      <div class="small text-muted">${new Date(a.createdAt).toLocaleString()}</div>
    </div>
  `).join('');
}

function initEvents() {
  const wrap = document.getElementById('eventsList');
  if (!wrap) return;
  let events = [];
  try { events = JSON.parse(localStorage.getItem('admin_events') || '[]'); } catch {}
  const future = events.filter(e => (e.date ? new Date(e.date).getTime() : 0) > Date.now());
  if (!future.length) { wrap.innerHTML = '<div class="text-secondary">No upcoming events</div>'; return; }
  wrap.innerHTML = future.slice(0, 4).map(e => `
    <div class="card mb-2">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <span class="badge bg-success me-2">Eligible</span>
            <strong>${escapeHtml(e.title || '')}</strong>
          </div>
          <div class="small text-muted">${escapeHtml(e.location || '')}</div>
        </div>
        <div class="text-secondary">${escapeHtml(e.description || '')}</div>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <small class="text-muted">${new Date(e.date).toLocaleDateString()}</small>
          <button class="btn btn-sm btn-outline-primary">View Details</button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateStats() {
  const statBenefits = document.getElementById('statBenefitsClaimed');
  const statUpcoming = document.getElementById('statUpcomingEvents');
  const statCardStatus = document.getElementById('statCardStatus');
  const statCardTier = document.getElementById('statCardTier');
  const statNotif = document.getElementById('statNotifications');
  try {
    const apps = JSON.parse(sessionStorage.getItem('apps_cache') || '[]');
    const claimed = apps.filter(a => a.status === 'approved').length;
    if (statBenefits) statBenefits.textContent = String(claimed);
  } catch {}
  try {
    const events = JSON.parse(localStorage.getItem('admin_events') || '[]');
    const upcoming = events.filter(e => (e.date ? new Date(e.date).getTime() : 0) > Date.now()).length;
    if (statUpcoming) statUpcoming.textContent = String(upcoming);
  } catch {}
  try {
    const badge = document.getElementById('userCardType');
    const tierText = badge && badge.textContent === 'GOLD' ? 'Gold Card' : 'Blue Card';
    if (statCardStatus) statCardStatus.textContent = 'Active';
    if (statCardTier) statCardTier.textContent = tierText;
  } catch {}
  try {
    const anns = JSON.parse(localStorage.getItem('admin_announcements') || '[]');
    if (statNotif) statNotif.textContent = String(anns.length);
  } catch {}
}

function initSidebarNav() {
  document.querySelectorAll('[data-goto]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.list-group-item').forEach(i => i.classList.remove('active'));
      a.classList.add('active');
      const target = a.getAttribute('data-goto');
      const map = {
        studentDashboard: ['announcementsList','eventsList','discountsList','applicationsTable','profileForm','redeemForm'],
        studentBenefits: ['applicationsTable'],
        studentEvents: ['eventsList'],
        studentProfile: ['profileForm']
      };
      const allSections = ['announcementsList','eventsList','discountsList','applicationsTable','profileForm','redeemForm'];
      const show = new Set(map[target] || []);
      document.querySelectorAll('#discountsList,#applicationsTable,#announcementsList,#eventsList,#profileForm,#redeemForm').forEach(el => {
        const card = el.closest('.card') || el.closest('.mt-5') || el;
        if (show.has(el.id)) { card.style.display = ''; } else { card.style.display = 'none'; }
      });
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}



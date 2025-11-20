let usersCache = [];
let discountsCache = [];
let usersPage = 1;
let discountsPage = 1;
const PAGE_LIMIT = 20;
const ROW_HEIGHT = 56;
const VIRTUAL_WINDOW = 40;

function renderUsers(users) {
  usersCache = Array.isArray(users) ? users : [];
  const loadingRow = document.getElementById('usersLoading');
  if (loadingRow) loadingRow.style.visibility = 'hidden';
  renderUsersVirtual(0);
}

function initAddUser() {
  const form = document.getElementById('addUserForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('uName').value.trim();
    const email = document.getElementById('uEmail').value.trim();
    const password = document.getElementById('uPassword').value;
    const role = document.getElementById('uRole').value;
    const res = await authorizedFetch(`${API_BASE}/admin/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    if (res.ok) { form.reset(); fetchUsers(); } else { alert('Failed to create'); }
  });
}

function renderDiscounts(discounts) {
  discountsCache = Array.isArray(discounts) ? discounts : [];
  const loadingRow = document.getElementById('discountsLoading');
  if (loadingRow) loadingRow.style.visibility = 'hidden';
  renderDiscountsVirtual(0);
}

function usersRowHTML(u) {
  return `
    <tr data-user-row="${u._id}">
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>
        <select class="form-select form-select-sm" data-role="${u._id}">
          <option value="user" ${u.role==='user'?'selected':''}>User</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
        </select>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger" data-del="${u._id}">Delete</button>
      </td>
    </tr>`;
}

function discountsRowHTML(d) {
  return `
    <tr data-discount-row="${d._id}">
      <td>${d.title}</td>
      <td><code>${d._id}</code> <button class="btn btn-sm btn-link p-0 ms-1" data-copy-id="${d._id}">Copy</button></td>
      <td>${d.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
      <td>${(d.applications||[]).length}</td>
      <td class="text-end">
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary" data-toggle-active="${d._id}" data-active="${d.isActive}">${d.isActive?'Deactivate':'Activate'}</button>
          <button class="btn btn-sm btn-outline-danger" data-del-discount="${d._id}">Delete</button>
        </div>
      </td>
    </tr>`;
}

function renderUsersVirtual(startIndex) {
  const table = document.getElementById('usersTable');
  if (!table) return;
  const total = usersCache.length;
  const from = Math.max(0, Math.min(startIndex, Math.max(0, total - 1)));
  const to = Math.min(total, from + VIRTUAL_WINDOW);
  const topPad = from * ROW_HEIGHT;
  const bottomPad = Math.max(0, (total - to) * ROW_HEIGHT);
  const rowsHTML = usersCache.slice(from, to).map(usersRowHTML).join('');
  table.innerHTML = `${topPad?`<tr style="height:${topPad}px"></tr>`:''}${rowsHTML}${bottomPad?`<tr style="height:${bottomPad}px"></tr>`:''}`;
}

function renderDiscountsVirtual(startIndex) {
  const table = document.getElementById('discountsTable');
  if (!table) return;
  const total = discountsCache.length;
  const from = Math.max(0, Math.min(startIndex, Math.max(0, total - 1)));
  const to = Math.min(total, from + VIRTUAL_WINDOW);
  const topPad = from * ROW_HEIGHT;
  const bottomPad = Math.max(0, (total - to) * ROW_HEIGHT);
  const rowsHTML = discountsCache.slice(from, to).map(discountsRowHTML).join('');
  table.innerHTML = `${topPad?`<tr style="height:${topPad}px"></tr>`:''}${rowsHTML}${bottomPad?`<tr style="height:${bottomPad}px"></tr>`:''}`;
}

function throttle(fn, wait = 16) {
  let last = 0, timer;
  return function(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

function initAddDiscount() {
  const form = document.getElementById('addDiscountForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('dTitle').value.trim();
    const description = document.getElementById('dDesc').value.trim();
    const eligibility = document.getElementById('dElig').value.trim();
    const isActive = document.getElementById('dActive').checked;
    const res = await authorizedFetch(`${API_BASE}/admin/discounts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, eligibility, isActive })
    });
    if (res.ok) { form.reset(); document.getElementById('dActive').checked = true; fetchDiscounts(); } else { alert('Failed to create'); }
  });
}

async function loadAdmin() {
  const usersLoading = document.getElementById('usersLoading');
  const discountsLoading = document.getElementById('discountsLoading');
  if (usersLoading) usersLoading.style.visibility = 'visible';
  if (discountsLoading) discountsLoading.style.visibility = 'visible';
  usersPage = 1; discountsPage = 1; usersCache = []; discountsCache = [];
  const usersPromise = authorizedFetch(`${API_BASE}/admin/users?limit=${PAGE_LIMIT}&page=${usersPage}`).then(r => r.json()).catch(() => []);
  const discountsPromise = authorizedFetch(`${API_BASE}/admin/discounts?limit=${PAGE_LIMIT}&page=${discountsPage}`).then(r => r.json()).catch(() => []);
  const [users, discounts] = await Promise.all([usersPromise, discountsPromise]);
  requestAnimationFrame(() => {
    renderUsers(users);
    renderDiscounts(discounts);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('admin-dashboard.html')) return;
  initPerfMonitor();
  loadAdmin();
  initAddUser();
  initAddDiscount();
  initTokens();
  const usersTable = document.getElementById('usersTable');
  const discountsTable = document.getElementById('discountsTable');
  const usersLoadMore = document.getElementById('usersLoadMore');
  const discountsLoadMore = document.getElementById('discountsLoadMore');
  const btnScanSuccess = document.getElementById('btnScanSuccess');
  const btnScanFail = document.getElementById('btnScanFail');
  const btnPostAnnouncement = document.getElementById('btnPostAnnouncement');
  const usersScroll = usersTable ? usersTable.closest('.virtual-table') : null;
  const discountsScroll = discountsTable ? discountsTable.closest('.virtual-table') : null;
  if (usersTable) {
    usersTable.addEventListener('change', async (e) => {
      const sel = e.target.closest('[data-role]');
      if (!sel) return;
      const id = sel.getAttribute('data-role');
      const role = sel.value;
      const resUp = await authorizedFetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!resUp.ok) alert('Failed to update');
      const idx = usersCache.findIndex(u => u._id === id);
      if (idx >= 0) usersCache[idx].role = role;
    });
    usersTable.addEventListener('click', async (e) => {
      const btnDel = e.target.closest('[data-del]');
      if (!btnDel) return;
      const id = btnDel.getAttribute('data-del');
      if (!confirm('Delete this user?')) return;
      const resDel = await authorizedFetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' });
      if (!resDel.ok) { alert('Failed to delete'); return; }
      const row = usersTable.querySelector(`[data-user-row="${id}"]`);
      if (row) row.remove();
      usersCache = usersCache.filter(u => u._id !== id);
    });
    if (usersScroll) {
      usersScroll.addEventListener('scroll', throttle(() => {
        const index = Math.floor(usersScroll.scrollTop / ROW_HEIGHT);
        renderUsersVirtual(index);
      }));
    }
    if (usersLoadMore) {
      usersLoadMore.addEventListener('click', async () => {
        usersLoadMore.disabled = true;
        try {
          const nextPage = usersPage + 1;
          const res = await authorizedFetch(`${API_BASE}/admin/users?limit=${PAGE_LIMIT}&page=${nextPage}`);
          const chunk = await res.json();
          if (Array.isArray(chunk) && chunk.length) {
            usersPage = nextPage;
            usersCache = usersCache.concat(chunk);
            const index = Math.floor((usersScroll?.scrollTop||0) / ROW_HEIGHT);
            renderUsersVirtual(index);
          } else {
            usersLoadMore.textContent = 'No more';
            usersLoadMore.disabled = true;
          }
        } finally {
          usersLoadMore.disabled = false;
        }
      });
    }
  }
  if (discountsTable) {
    discountsTable.addEventListener('click', async (e) => {
      const btnToggle = e.target.closest('[data-toggle-active]');
      const btnDel = e.target.closest('[data-del-discount]');
      const btnCopy = e.target.closest('[data-copy-id]');
      if (btnToggle) {
        const id = btnToggle.getAttribute('data-toggle-active');
        const isActive = btnToggle.getAttribute('data-active') === 'true';
        const resUp = await authorizedFetch(`${API_BASE}/admin/discounts/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !isActive })
        });
        if (!resUp.ok) { alert('Failed to update'); return; }
        const idx = discountsCache.findIndex(d => d._id === id);
        if (idx >= 0) discountsCache[idx].isActive = !isActive;
        renderDiscounts(discountsCache);
      } else if (btnDel) {
        const id = btnDel.getAttribute('data-del-discount');
        if (!confirm('Delete this discount?')) return;
        const resDel = await authorizedFetch(`${API_BASE}/admin/discounts/${id}`, { method: 'DELETE' });
        if (!resDel.ok) { alert('Failed to delete'); return; }
        discountsCache = discountsCache.filter(d => d._id !== id);
        renderDiscounts(discountsCache);
      } else if (btnCopy) {
        const id = btnCopy.getAttribute('data-copy-id');
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(id);
          } else {
            const ta = document.createElement('textarea');
            ta.value = id; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          }
          btnCopy.textContent = 'Copied';
          setTimeout(() => btnCopy.textContent = 'Copy', 1200);
        } catch {
          alert('Copy failed. Manually select the ID to copy.');
        }
      }
    });
    if (discountsScroll) {
      discountsScroll.addEventListener('scroll', throttle(() => {
        const index = Math.floor(discountsScroll.scrollTop / ROW_HEIGHT);
        renderDiscountsVirtual(index);
      }));
    }
    if (discountsLoadMore) {
      discountsLoadMore.addEventListener('click', async () => {
        discountsLoadMore.disabled = true;
        try {
          const nextPage = discountsPage + 1;
          const res = await authorizedFetch(`${API_BASE}/admin/discounts?limit=${PAGE_LIMIT}&page=${nextPage}`);
          const chunk = await res.json();
          if (Array.isArray(chunk) && chunk.length) {
            discountsPage = nextPage;
            discountsCache = discountsCache.concat(chunk);
            const index = Math.floor((discountsScroll?.scrollTop||0) / ROW_HEIGHT);
            renderDiscountsVirtual(index);
          } else {
            discountsLoadMore.textContent = 'No more';
            discountsLoadMore.disabled = true;
          }
        } finally {
          discountsLoadMore.disabled = false;
        }
      });
    }
  }

  if (btnScanSuccess) {
    btnScanSuccess.addEventListener('click', () => simulateScan('success'));
  }
  if (btnScanFail) {
    btnScanFail.addEventListener('click', () => simulateScan('fail'));
  }
  if (btnPostAnnouncement) {
    btnPostAnnouncement.addEventListener('click', () => postAnnouncement());
  }
});

function simulateScan(type) {
  const resultsDiv = document.getElementById('scanResults');
  if (!resultsDiv) return;
  if (type === 'success') {
    resultsDiv.innerHTML = `
      <div class="alert alert-success">
        <h6><i class="bi bi-check-circle me-2"></i>Scan Successful</h6>
        <p class="mb-1"><strong>Student:</strong> Maria Santos</p>
        <p class="mb-1"><strong>ID:</strong> 2024-001</p>
        <p class="mb-1"><strong>Card Type:</strong> Gold</p>
        <p class="mb-0"><strong>Event:</strong> Rice Distribution</p>
        <hr>
        <small class="text-success">Recorded at ${new Date().toLocaleTimeString()}</small>
      </div>
    `;
  } else {
    resultsDiv.innerHTML = `
      <div class="alert alert-danger">
        <h6><i class="bi bi-x-circle me-2"></i>Invalid QR Code</h6>
        <p class="mb-0">The scanned QR code is not recognized or not valid for this event.</p>
      </div>
    `;
  }
}

function postAnnouncement() {
  const modalEl = document.getElementById('postAnnouncementModal');
  const title = document.getElementById('annTitle')?.value?.trim();
  if (!title) return;
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  alert('Announcement posted successfully');
  modal.hide();
}

function initPerfMonitor() {
  const el = document.createElement('div');
  el.id = 'perfMonitor';
  el.style.position = 'fixed';
  el.style.right = '10px';
  el.style.bottom = '10px';
  el.style.zIndex = '9999';
  el.style.background = 'rgba(0,0,0,0.6)';
  el.style.color = '#0f0';
  el.style.padding = '8px 10px';
  el.style.borderRadius = '6px';
  el.style.font = '12px/1 monospace';
  el.textContent = 'FPS: -- | Render: --ms';
  document.body.appendChild(el);
  let frames = 0, last = performance.now(), lastSec = performance.now();
  function loop(now) {
    frames++;
    if (now - lastSec >= 1000) {
      const fps = Math.round((frames * 1000) / (now - lastSec));
      el.textContent = `FPS: ${fps} | Render: ${last.toFixed(1)}ms`;
      el.style.color = fps < 50 ? '#ff3b3b' : '#0f0';
      frames = 0;
      lastSec = now;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  const origRenderUsers = renderUsersVirtual;
  const origRenderDiscounts = renderDiscountsVirtual;
  renderUsersVirtual = function(startIndex) {
    const t0 = performance.now();
    origRenderUsers(startIndex);
    last = performance.now() - t0;
    if (last > 100) console.warn('Users render >100ms');
  };
  renderDiscountsVirtual = function(startIndex) {
    const t0 = performance.now();
    origRenderDiscounts(startIndex);
    last = performance.now() - t0;
    if (last > 100) console.warn('Discounts render >100ms');
  };
}

function initTokens() {
  const genForm = document.getElementById('genTokenForm');
  const genResult = document.getElementById('genTokenResult');
  if (genForm) {
    genForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('tDiscountId').value.trim();
      const count = Number(document.getElementById('tCount').value || 1);
      const prefix = document.getElementById('tPrefix').value.trim();
      const expiresAt = document.getElementById('tExpires').value;
      const res = await authorizedFetch(`${API_BASE}/admin/discounts/${id}/tokens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, prefix: prefix || undefined, expiresAt: expiresAt || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        genResult.textContent = 'Created codes:\n' + data.tokens.map(t => t.code).join('\n');
      } else {
        genResult.textContent = data.message || 'Failed to generate tokens';
      }
    });
  }

  const btnList = document.getElementById('btnListTokens');
  if (btnList) {
    btnList.addEventListener('click', async () => {
      const id = document.getElementById('tListDiscountId').value.trim();
      if (!id) return;
      const res = await authorizedFetch(`${API_BASE}/admin/discounts/${id}/tokens`);
      const tokens = await res.json();
      const table = document.getElementById('tokensTable');
      table.innerHTML = tokens.map(t => `
        <tr>
          <td><code>${t.code}</code></td>
          <td>${t.isUsed ? 'Yes' : 'No'}</td>
          <td>${t.usedBy ? t.usedBy : ''}</td>
          <td>${t.expiresAt ? new Date(t.expiresAt).toLocaleString() : ''}</td>
        </tr>
      `).join('');
    });
  }
}



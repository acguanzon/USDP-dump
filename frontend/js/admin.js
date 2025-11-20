let usersCache = [];
let discountsCache = [];

function renderUsers(users) {
  usersCache = Array.isArray(users) ? users : [];
  const loadingRow = document.getElementById('usersLoading');
  const table = document.getElementById('usersTable');
  if (!table) return;
  const html = usersCache.map(u => `
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
    </tr>
  `).join('');
  table.innerHTML = html;
  if (loadingRow) loadingRow.style.visibility = 'hidden';
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
  const table = document.getElementById('discountsTable');
  if (!table) return;
  const html = discountsCache.map(d => `
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
    </tr>
  `).join('');
  table.innerHTML = html;
  if (loadingRow) loadingRow.style.visibility = 'hidden';
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
  const usersPromise = authorizedFetch(`${API_BASE}/admin/users`).then(r => r.json()).catch(() => []);
  const discountsPromise = authorizedFetch(`${API_BASE}/admin/discounts`).then(r => r.json()).catch(() => []);
  const [users, discounts] = await Promise.all([usersPromise, discountsPromise]);
  requestAnimationFrame(() => {
    renderUsers(users);
    renderDiscounts(discounts);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('admin-dashboard.html')) return;
  loadAdmin();
  initAddUser();
  initAddDiscount();
  initTokens();
  const usersTable = document.getElementById('usersTable');
  const discountsTable = document.getElementById('discountsTable');
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
  }
});

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



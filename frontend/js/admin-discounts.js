document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('admin-discounts.html')) return;
  initAdminDiscounts();
});

let discountsPage = 1;
const PAGE_LIMIT = 20;

async function initAdminDiscounts() {
  await loadDiscounts();
  bindDiscountForm();
  bindTokens();
}

async function loadDiscounts() {
  const table = document.getElementById('discountsTable');
  const res = await authorizedFetch(`${API_BASE}/admin/discounts?limit=${PAGE_LIMIT}&page=${discountsPage}`);
  const items = await res.json();
  const rows = items.map(d => `
    <tr data-id="${d._id}">
      <td>${d.title}</td>
      <td><code>${d._id}</code></td>
      <td>${d.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
      <td class="text-end">
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary" data-toggle>${d.isActive?'Deactivate':'Activate'}</button>
          <button class="btn btn-sm btn-outline-danger" data-del>Delete</button>
        </div>
      </td>
    </tr>`).join('');
  if (discountsPage === 1) table.innerHTML = rows; else table.insertAdjacentHTML('beforeend', rows);
  const btnMore = document.getElementById('btnLoadMore');
  if (btnMore) btnMore.onclick = async () => { discountsPage++; await loadDiscounts(); };
  table.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    if (e.target.matches('[data-toggle]')) {
      const active = tr.querySelector('.badge')?.classList.contains('bg-success');
      const resUp = await authorizedFetch(`${API_BASE}/admin/discounts/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !active })
      });
      if (resUp.ok) { tr.querySelector('td:nth-child(3)').innerHTML = !active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'; e.target.textContent = active ? 'Activate' : 'Deactivate'; }
    } else if (e.target.matches('[data-del]')) {
      const resDel = await authorizedFetch(`${API_BASE}/admin/discounts/${id}`, { method: 'DELETE' });
      if (resDel.ok) tr.remove();
    }
  });
}

function bindDiscountForm() {
  const form = document.getElementById('formCreateDiscount');
  const msg = document.getElementById('dMsg');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const title = document.getElementById('dTitle').value.trim();
    const description = document.getElementById('dDesc').value.trim();
    const eligibility = document.getElementById('dElig').value.trim();
    const isActive = document.getElementById('dActive').checked;
    const res = await authorizedFetch(`${API_BASE}/admin/discounts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, eligibility, isActive })
    });
    let data = {}; try { data = await res.json(); } catch {}
    if (res.ok) {
      msg.className = 'small text-success'; msg.textContent = 'Discount created';
      document.getElementById('dTitle').value = '';
      document.getElementById('dDesc').value = '';
      document.getElementById('dElig').value = '';
      document.getElementById('dActive').checked = true;
      discountsPage = 1; await loadDiscounts();
    } else { msg.className = 'small text-danger'; msg.textContent = data.message || 'Failed to create discount'; }
  });
}

function bindTokens() {
  const btnList = document.getElementById('btnListTokens');
  const table = document.getElementById('tokensTable');
  const inputId = document.getElementById('tListDiscountId');
  if (!btnList) return;
  btnList.addEventListener('click', async () => {
    const id = inputId.value.trim();
    if (!id) return;
    const res = await authorizedFetch(`${API_BASE}/admin/discounts/${id}/tokens`);
    const tokens = await res.json();
    table.innerHTML = tokens.map(t => `<tr><td><code>${t.code}</code></td><td>${t.expiresAt ? new Date(t.expiresAt).toLocaleString() : ''}</td></tr>`).join('');
  });
}
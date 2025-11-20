document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('admin-users.html')) return;
  initAdminUsers();
});

let usersPage = 1;
const PAGE_LIMIT = 20;

async function initAdminUsers() {
  await loadUsers();
  bindUserForm();
}

async function loadUsers() {
  const table = document.getElementById('usersTable');
  const res = await authorizedFetch(`${API_BASE}/admin/users?limit=${PAGE_LIMIT}&page=${usersPage}`);
  const users = await res.json();
  const rows = users.map(u => `
    <tr data-id="${u._id}" data-name="${u.name}" data-email="${u.email}" data-student-id="${u.studentId||''}" data-card-type="${u.cardType||'blue'}" data-qr="${u.qrCode||''}">
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.studentId || ''}</td>
      <td>
        <select class="form-select form-select-sm" data-cardtype>
          <option value="blue" ${u.cardType==='blue'?'selected':''}>Blue</option>
          <option value="gold" ${u.cardType==='gold'?'selected':''}>Gold</option>
        </select>
      </td>
      <td>
        <select class="form-select form-select-sm" data-role>
          <option value="user" ${u.role==='user'?'selected':''}>User</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
        </select>
      </td>
      <td class="text-end">
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary" data-card>Card</button>
          <button class="btn btn-sm btn-outline-primary" data-genqr>Generate QR</button>
          <button class="btn btn-sm btn-outline-danger" data-del>Delete</button>
        </div>
      </td>
    </tr>`).join('');
  if (usersPage === 1) table.innerHTML = rows; else table.insertAdjacentHTML('beforeend', rows);
  const btnMore = document.getElementById('btnLoadMore');
  if (btnMore) btnMore.onclick = async () => { usersPage++; await loadUsers(); };
  table.addEventListener('change', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    if (e.target.matches('[data-role]')) {
      const role = e.target.value;
      await authorizedFetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role })
      });
    } else if (e.target.matches('[data-cardtype]')) {
      const cardType = e.target.value;
      await authorizedFetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardType })
      });
      tr.setAttribute('data-card-type', cardType);
    }
  });
  table.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    if (e.target.matches('[data-card]')) {
      openCardModal({
        id,
        name: tr.getAttribute('data-name'),
        studentId: tr.getAttribute('data-student-id') || '',
        cardType: tr.getAttribute('data-card-type') || 'blue',
        qrCode: tr.getAttribute('data-qr') || ''
      });
    } else if (e.target.matches('[data-genqr]')) {
      const resQr = await authorizedFetch(`${API_BASE}/admin/users/${id}/qr`, { method: 'POST' });
      let data = {}; try { data = await resQr.json(); } catch {}
      if (resQr.ok && data.qrCode) {
        tr.setAttribute('data-qr', data.qrCode);
        const msg = document.getElementById('uMsg'); if (msg) { msg.className = 'small text-success'; msg.textContent = `QR created: ${data.qrCode}`; }
      }
    } else if (e.target.matches('[data-del]')) {
      const resDel = await authorizedFetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' });
      if (resDel.ok) tr.remove();
    }
  });
}

function bindUserForm() {
  const form = document.getElementById('formAddUser');
  const msg = document.getElementById('uMsg');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const name = document.getElementById('uName').value.trim();
    const email = document.getElementById('uEmail').value.trim();
    const password = document.getElementById('uPassword').value;
    const role = document.getElementById('uRole').value;
    const studentId = document.getElementById('uStudentId').value.trim();
    const cardType = document.getElementById('uCardType').value;
    const res = await authorizedFetch(`${API_BASE}/admin/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, studentId, cardType })
    });
    let data = {}; try { data = await res.json(); } catch {}
    if (res.ok) {
      msg.className = 'small text-success';
      msg.textContent = 'User created';
      document.getElementById('uName').value = '';
      document.getElementById('uEmail').value = '';
      document.getElementById('uPassword').value = '';
      document.getElementById('uRole').value = 'user';
      document.getElementById('uStudentId').value = '';
      document.getElementById('uCardType').value = 'blue';
      usersPage = 1; await loadUsers();
    } else {
      msg.className = 'small text-danger';
      msg.textContent = data.message || 'Failed to create user';
    }
  });
}

let cardModalInstance = null;
function openCardModal(user) {
  const modalEl = document.getElementById('modalUserCard');
  if (!modalEl) return;
  if (!cardModalInstance) cardModalInstance = new bootstrap.Modal(modalEl);
  document.getElementById('cardName').textContent = user.name || '';
  document.getElementById('cardStudentId').textContent = user.studentId || '';
  document.getElementById('editStudentId').value = user.studentId || '';
  document.getElementById('editCardType').value = user.cardType || 'blue';
  const badge = document.getElementById('cardTypeBadge');
  const header = document.getElementById('cardHeader');
  if (user.cardType === 'gold') {
    badge.textContent = 'GOLD';
    badge.className = 'badge bg-warning text-dark';
    header.style.background = 'linear-gradient(135deg,#F59E0B,#D97706)';
  } else {
    badge.textContent = 'BLUE';
    badge.className = 'badge bg-primary';
    header.style.background = 'linear-gradient(135deg,#1E40AF,#6D28D9)';
  }
  const canvas = document.getElementById('cardQr');
  const id = user.id;
  const payload = user.qrCode && user.qrCode !== '' ? user.qrCode : `USR:${id}|SID:${user.studentId||''}|NAME:${user.name||''}`;
  try { QRCode.toCanvas(canvas, payload, { width: 128 }); } catch {}
  const saveBtn = document.getElementById('saveCard');
  const msg = document.getElementById('cardMsg');
  saveBtn.onclick = async () => {
    msg.textContent = '';
    const newSid = document.getElementById('editStudentId').value.trim();
    const newType = document.getElementById('editCardType').value;
    const res = await authorizedFetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: newSid, cardType: newType })
    });
    if (res.ok) {
      msg.className = 'small text-success'; msg.textContent = 'Saved';
      document.querySelector(`tr[data-id="${id}"]`)?.setAttribute('data-student-id', newSid);
      document.querySelector(`tr[data-id="${id}"]`)?.setAttribute('data-card-type', newType);
      document.querySelector(`tr[data-id="${id}"] td:nth-child(3)`)?.replaceChildren(document.createTextNode(newSid));
      cardModalInstance.hide();
    } else {
      msg.className = 'small text-danger'; msg.textContent = 'Failed to save';
    }
  };
  cardModalInstance.show();
}
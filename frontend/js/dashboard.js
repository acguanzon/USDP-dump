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



document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('admin-events.html')) return;
  initAdminEvents();
});

async function initAdminEvents() {
  renderEvents();
  bindEventForm();
}

function renderEvents() {
  const wrap = document.getElementById('eventsAdminList');
  if (!wrap) return;
  let events = [];
  try { events = JSON.parse(localStorage.getItem('admin_events') || '[]'); } catch {}
  if (!events.length) { wrap.innerHTML = '<div class="text-secondary">No events yet</div>'; return; }
  wrap.innerHTML = events.map((e, idx) => `
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div><strong>${escapeHtml(e.title || '')}</strong></div>
            <div class="small text-muted">${new Date(e.date).toLocaleDateString()}</div>
          </div>
          <div class="text-secondary">${escapeHtml(e.description || '')}</div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <small class="text-muted">${escapeHtml(e.location || '')}</small>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary" data-edit="${idx}">Edit</button>
              <button class="btn btn-sm btn-outline-danger" data-del="${idx}">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  wrap.addEventListener('click', (e) => {
    if (e.target.matches('[data-del]')) {
      const idx = Number(e.target.getAttribute('data-del'));
      let events = []; try { events = JSON.parse(localStorage.getItem('admin_events') || '[]'); } catch {}
      events.splice(idx, 1);
      localStorage.setItem('admin_events', JSON.stringify(events));
      renderEvents();
    } else if (e.target.matches('[data-edit]')) {
      const idx = Number(e.target.getAttribute('data-edit'));
      let events = []; try { events = JSON.parse(localStorage.getItem('admin_events') || '[]'); } catch {}
      const eItem = events[idx];
      document.getElementById('eTitle').value = eItem.title || '';
      document.getElementById('eDesc').value = eItem.description || '';
      document.getElementById('eDate').value = eItem.date ? eItem.date.substring(0,10) : '';
      document.getElementById('eLocation').value = eItem.location || '';
      document.getElementById('eMsg').textContent = 'Editing existing event';
      document.getElementById('formAddEvent').setAttribute('data-editing', String(idx));
      new bootstrap.Modal(document.getElementById('modalAddEvent')).show();
    }
  }, { once: true });
}

function bindEventForm() {
  const form = document.getElementById('formAddEvent');
  const msg = document.getElementById('eMsg');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.textContent = '';
    const title = document.getElementById('eTitle').value.trim();
    const desc = document.getElementById('eDesc').value.trim();
    const date = document.getElementById('eDate').value;
    const location = document.getElementById('eLocation').value.trim();
    if (!title || !date) { msg.className = 'small text-danger'; msg.textContent = 'Please provide title and date'; return; }
    let events = []; try { events = JSON.parse(localStorage.getItem('admin_events') || '[]'); } catch {}
    const editing = form.getAttribute('data-editing');
    const entry = { title, description: desc, date: new Date(date).toISOString(), location };
    if (editing) { events[Number(editing)] = entry; form.removeAttribute('data-editing'); } else { events.unshift(entry); }
    localStorage.setItem('admin_events', JSON.stringify(events));
    msg.className = 'small text-success'; msg.textContent = 'Saved';
    form.reset();
    renderEvents();
    bootstrap.Modal.getInstance(document.getElementById('modalAddEvent')).hide();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
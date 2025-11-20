document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('admin-announcements.html')) return;
  initAdminAnnouncements();
});

function initAdminAnnouncements() {
  loadAnnouncements();
  const form = document.getElementById('formPostAnnouncement');
  const msg = document.getElementById('anMsg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.textContent = '';
    const title = document.getElementById('anTitle').value.trim();
    const body = document.getElementById('anBody').value.trim();
    try {
      const key = 'admin_announcements';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift({ title, body, createdAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(existing));
      msg.className = 'small text-success';
      msg.textContent = 'Announcement posted';
      document.getElementById('anTitle').value = '';
      document.getElementById('anBody').value = '';
      loadAnnouncements();
    } catch {
      msg.className = 'small text-danger';
      msg.textContent = 'Failed to store announcement';
    }
  });
}

function loadAnnouncements() {
  const key = 'admin_announcements';
  const list = document.getElementById('annList');
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  list.innerHTML = items.map(a => `
    <div class="list-group-item">
      <div class="d-flex justify-content-between">
        <strong>${a.title}</strong>
        <span class="text-muted small">${new Date(a.createdAt).toLocaleString()}</span>
      </div>
      <div>${a.body}</div>
    </div>`).join('');
}
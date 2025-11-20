// If already logged in, guide users to the right dashboard from the home page
(function() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (location.pathname.endsWith('index.html') || /\/?frontend\/?$/.test(location.pathname)) {
      location.href = payload && payload.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
    }
  } catch {}
})();



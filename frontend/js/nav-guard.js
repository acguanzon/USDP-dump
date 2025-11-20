// If already logged in, guide users to the right dashboard from the home page
(function() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (location.pathname.endsWith('index.html') || /\/?frontend\/?$/.test(location.pathname)) {
      if (payload.role === 'admin') location.href = 'admin-dashboard.html';
      else location.href = 'dashboard.html';
    }
  } catch {}
})();



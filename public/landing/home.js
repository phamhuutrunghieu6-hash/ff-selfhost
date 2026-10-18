(() => {
  const root = document.documentElement;
  try { if (localStorage.getItem('phtrunghieu_landing_theme') === 'light') root.dataset.theme = 'light'; } catch {}
  document.querySelector('#theme').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('phtrunghieu_landing_theme', root.dataset.theme); } catch {}
  });
  // SPA navigation after sign-out must also reach the public root, not a stale
  // dashboard from the browser's back/forward cache.
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();

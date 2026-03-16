import { renderHome } from './pages/home.js';
import { renderDetail } from './pages/detail.js';
import { renderRecommendations } from './pages/recommendations.js';

const routes = {
  '/': renderHome,
  '/recommendations': renderRecommendations,
};

function getRoute(path) {
  if (path.startsWith('/campsites/')) return () => renderDetail(path.split('/')[2]);
  return routes[path] || renderHome;
}

async function navigate(path) {
  window.history.pushState({}, '', path);
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    await getRoute(path)(app);
  } catch (err) {
    app.innerHTML = `<div class="error-banner">⚠️ ${err.message}</div>`;
  }
}

document.addEventListener('click', e => {
  const link = e.target.closest('[data-link]');
  if (link) {
    e.preventDefault();
    navigate(new URL(link.href).pathname);
  }
});

window.addEventListener('popstate', () => navigate(location.pathname));

navigate(location.pathname);

window.navigate = navigate;

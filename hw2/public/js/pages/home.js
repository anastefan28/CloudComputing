import { api } from '../api.js';

export async function renderHome(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>🏕️ Find Your Campsite</h1>
      <p>Browse campsites across Romania and check live weather before you go.</p>
    </div>

    <div class="filter-bar">
      <input id="f-location" type="text" placeholder="Search location or county…" />
      <select id="f-type">
        <option value="">All types</option>
        <option value="tent">Tent</option>
        <option value="rv">RV</option>
        <option value="cabin">Cabin</option>
        <option value="glamping">Glamping</option>
      </select>
      <input id="f-guests" type="number" placeholder="Guests" min="1" max="20" style="width:90px" />
      <select id="f-sort">
        <option value="newest">Newest</option>
        <option value="price-low">Price ↑</option>
        <option value="price-high">Price ↓</option>
      </select>
      <button class="btn btn-primary" id="btn-search">Search</button>
      <button class="btn btn-secondary" id="btn-reset">Reset</button>
    </div>

    <div id="error-zone"></div>
    <div id="grid-zone"><div class="loading-spinner"><div class="spinner"></div></div></div>
  `;

  async function load(filters = {}) {
    const grid = document.getElementById('grid-zone');
    const errZone = document.getElementById('error-zone');
    errZone.innerHTML = '';
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    try {
      const campsites = await api.getCampsites(filters);
      if (!campsites.length) {
        grid.innerHTML = '<p style="color:var(--text-muted)">No campsites found. Try adjusting your filters.</p>';
        return;
      }
      grid.innerHTML = `<div class="campsite-grid">${campsites.map(cardHTML).join('')}</div>`;
      grid.querySelectorAll('.campsite-card').forEach(card => {
        card.addEventListener('click', () => window.navigate(`/campsites/${card.dataset.id}`));
      });
    } catch (err) {
      grid.innerHTML = '';
      errZone.innerHTML = `<div class="error-banner">⚠️ ${err.message}</div>`;
    }
  }

  function getFilters() {
    return {
      location: document.getElementById('f-location').value.trim(),
      type: document.getElementById('f-type').value,
      guests: document.getElementById('f-guests').value,
      sort: document.getElementById('f-sort').value,
    };
  }

  document.getElementById('btn-search').addEventListener('click', () => load(getFilters()));
  document.getElementById('btn-reset').addEventListener('click', () => {
    ['f-location','f-guests'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-type').value = '';
    document.getElementById('f-sort').value = 'newest';
    load();
  });
  document.getElementById('f-location').addEventListener('keydown', e => {
    if (e.key === 'Enter') load(getFilters());
  });

  load();
}

function cardHTML(c) {
  return `
    <div class="campsite-card" data-id="${c.id}">
      <div class="card-header">
        <span class="card-title">${escHtml(c.name)}</span>
        <span class="badge">${c.type}</span>
      </div>
      <div class="card-county">📍 ${c.county}</div>
      <div class="card-desc">${escHtml(c.description || '')}</div>
      <div class="card-footer">
        <span class="card-price">${c.price != null ? `${c.price} RON` : 'Price TBD'} <span>/ night</span></span>
        <span class="card-capacity">👥 Up to ${c.capacity ?? '?'}</span>
      </div>
    </div>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

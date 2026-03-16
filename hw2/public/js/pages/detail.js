import { api } from '../api.js';

export async function renderDetail(id) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  let data;
  try {
    data = await api.getCampsite(id);
  } catch (err) {
    app.innerHTML = `
      <button class="back-btn" onclick="window.navigate('/')">← Back to campsites</button>
      <div class="error-banner">⚠️ ${err.message}</div>`;
    return;
  }

  const { campsite: c, reviews, weather, forecast, mapUrl } = data;
  const starsHTML = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  const weatherHTML = weather ? `
    <div class="weather-card">
      <h3>Current Weather</h3>
      <div class="weather-main">
        <img src="${weather.icon}" alt="${weather.description}" />
        <div>
          <div class="weather-temp">${weather.temp}°C</div>
          <div class="weather-desc">${weather.description}</div>
        </div>
      </div>
      <div class="weather-details">
        <div class="weather-detail">Feels like<strong>${weather.feels_like}°C</strong></div>
        <div class="weather-detail">Humidity<strong>${weather.humidity}%</strong></div>
        <div class="weather-detail">Wind<strong>${weather.wind_speed} m/s</strong></div>
        <div class="weather-detail">Location<strong>${weather.city || 'Near site'}</strong></div>
      </div>
    </div>` : `<div class="error-banner">Weather data unavailable.</div>`;

  const forecastHTML = forecast && forecast.length ? `
    <div class="forecast">
      <h3>📅 5-Day Forecast</h3>
      <div class="forecast-list">
        ${forecast.map(f => `
          <div class="forecast-item">
            <span style="font-weight:600;min-width:90px">
              ${new Date(f.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <img src="${f.icon}" alt="${f.description}" />
            <span style="text-transform:capitalize;color:var(--text-muted);font-size:.8rem;flex:1">${f.description}</span>
            <span style="font-weight:600">${f.temp_max}°C</span>
            <span style="color:var(--text-muted);font-size:.8rem">${f.temp_min}°C</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  const mapHTML = mapUrl ? `
    <div class="map-card">
      <h3>📍 Location</h3>
      <img src="${mapUrl}" alt="Map of ${escHtml(c.name)}" class="map-img"
        onerror="this.parentElement.innerHTML='<p style=color:var(--text-muted)>Map unavailable</p>'" />
    </div>` : '';

  const reviewsHTML = reviews && reviews.length
    ? reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <span class="review-author">${escHtml(r.user_name)}</span>
          <span class="stars">${starsHTML(r.rating)}</span>
        </div>
        <div class="review-body">${escHtml(r.body || '')}</div>
      </div>`).join('')
    : '<p class="no-reviews">No reviews yet for this campsite.</p>';

  app.innerHTML = `
    <button class="back-btn" id="back-btn">← Back to campsites</button>
    <div class="detail-grid">
      <div class="detail-main">
        <h1 class="detail-title">${escHtml(c.name)}</h1>
        <div class="detail-meta">📍 ${c.county} &nbsp;·&nbsp; 🏕️ ${c.type}</div>
        <p class="detail-desc">${escHtml(c.description || 'No description provided.')}</p>
        <div class="detail-attrs">
          ${c.capacity != null ? `<span class="attr-pill">👥 Up to ${c.capacity} guests</span>` : ''}
          ${c.price    != null ? `<span class="attr-pill">💰 ${c.price} RON / night</span>` : ''}
          <span class="attr-pill">📌 ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}</span>
        </div>
        ${mapHTML}
        <div class="section-title">Guest Reviews</div>
        <div class="reviews-list">${reviewsHTML}</div>
      </div>
      <div class="detail-sidebar">
        ${weatherHTML}
        ${forecastHTML}
      </div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => window.navigate('/'));
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
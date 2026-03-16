import { api } from '../api.js';

export async function renderRecommendations(container) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page-header">
      <h1>AI Campsite Advisor</h1>
      <p>Tell us your preferences and get personalised tips powered by Gemini AI.</p>
    </div>

    <div class="ai-form">
      <div class="form-grid">
        <div class="form-group">
          <label for="ai-guests">Number of guests</label>
          <input id="ai-guests" type="number" min="1" max="20" placeholder="e.g. 4" />
        </div>
        <div class="form-group">
          <label for="ai-type">Campsite type</label>
          <select id="ai-type">
            <option value="">No preference</option>
            <option value="tent">Tent</option>
            <option value="rv">RV</option>
            <option value="cabin">Cabin</option>
            <option value="glamping">Glamping</option>
          </select>
        </div>
        <div class="form-group">
          <label for="ai-location">Preferred county / region</label>
          <input id="ai-location" type="text" placeholder="e.g. Cluj, Transylvania…" />
        </div>
        <div class="form-group">
          <label for="ai-budget">Budget per night (RON)</label>
          <input id="ai-budget" type="number" min="0" placeholder="e.g. 80" />
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label for="ai-vibe">Trip vibe / purpose</label>
          <input id="ai-vibe" type="text" placeholder="e.g. romantic weekend, family with kids, hiking trip, remote & quiet…" />
        </div>
      </div>
      <button class="btn btn-primary" id="btn-ask" style="width:100%">✨ Get AI Recommendations</button>
    </div>

    <div id="ai-result-zone"></div>
  `;

  document.getElementById('btn-ask').addEventListener('click', async () => {
    const btn      = document.getElementById('btn-ask');
    const resultEl = document.getElementById('ai-result-zone');

    const body = {
      guests:   document.getElementById('ai-guests').value   || null,
      type:     document.getElementById('ai-type').value     || null,
      location: document.getElementById('ai-location').value || null,
      budget:   document.getElementById('ai-budget').value   || null,
      vibe:     document.getElementById('ai-vibe').value     || null,
    };

    btn.disabled = true;
    btn.textContent = 'Thinking…';
    resultEl.innerHTML = `<div class="ai-result"><p class="thinking"><div class="spinner"></div> Gemini is generating your personalised tips…</p></div>`;

    try {
      const [data, campsites] = await Promise.all([
        api.getRecommendations(body),
        api.getCampsites(),
      ]);

      let html = data.recommendations;
      campsites.forEach(c => {
        const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'g');
        html = html.replace(regex, `<a class="campsite-link" data-id="${c.id}" href="#">$1</a>`);
      });

      resultEl.innerHTML = `
        <div class="ai-result">
          <h3>Your Personalised Campsite Recommendations</h3>
          ${html}
        </div>`;

      resultEl.querySelectorAll('.campsite-link').forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          window.navigate(`/campsites/${link.dataset.id}`);
        });
      });

    } catch (err) {
      resultEl.innerHTML = `<div class="error-banner">${err.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Get AI Recommendations';
    }
  });
}
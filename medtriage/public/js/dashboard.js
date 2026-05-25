let allCases = [];
let currentFilter = 'all';

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const role = await getUserRole();
  document.getElementById('welcomeMsg').textContent = `Welcome, ${user.email}`;
  document.getElementById('roleDescription').textContent =
    role === 'clinician' ? 'Viewing all cases — clinician access' :
    role === 'admin' ? 'Viewing all cases — admin access' :
    'Viewing your cases';

  loadCases();
});

async function loadCases() {
  try {
    const res = await authFetch('/api/cases');
    if (!res || !res.ok) throw new Error('Failed to load cases');
    allCases = await res.json();
    updateStats();
    renderCases();
  } catch (err) {
    console.error('Load cases error:', err);
    document.getElementById('casesGrid').innerHTML =
      '<p class="error">Failed to load cases. Please try again.</p>';
  }
}

function updateStats() {
  document.getElementById('statTotal').textContent = allCases.length;
  document.getElementById('statPending').textContent =
    allCases.filter(c => ['pending', 'vision_processing', 'vision_done', 'analyzing'].includes(c.status)).length;
  document.getElementById('statComplete').textContent =
    allCases.filter(c => ['complete', 'signed_off', 'reviewed'].includes(c.status)).length;
  document.getElementById('statErrors').textContent =
    allCases.filter(c => c.status === 'error').length;
}

function filterCases(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCases();
}

function renderCases() {
  let filtered = allCases;
  if (currentFilter !== 'all') {
    if (currentFilter === 'pending') {
      filtered = allCases.filter(c => ['pending', 'vision_processing', 'vision_done', 'analyzing'].includes(c.status));
    } else if (currentFilter === 'complete') {
      filtered = allCases.filter(c => ['complete', 'signed_off', 'reviewed'].includes(c.status));
    } else {
      filtered = allCases.filter(c => c.status === currentFilter);
    }
  }

  const grid = document.getElementById('casesGrid');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = filtered.map(c => {
    const date = c.timestamp ? new Date(c.timestamp._seconds * 1000).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Unknown date';

    const statusLabel = {
      pending: 'Pending',
      vision_processing: 'Processing',
      vision_done: 'Vision Done',
      analyzing: 'Analyzing',
      complete: 'Complete',
      reviewed: 'Reviewed',
      signed_off: 'Signed Off',
      awaiting_radiologist: 'Awaiting Radiologist',
      error: 'Error'
    }[c.status] || c.status;

    return `
      <a href="/case/${c.caseId}" class="case-card">
        <div class="case-card-image">
          ${c.imageUrl ? `<img src="${c.imageUrl}" alt="X-ray thumbnail">` : '<div class="no-image">No image</div>'}
        </div>
        <div class="case-card-info">
          <div class="case-card-top">
            <span class="status-badge status-${c.status}">${statusLabel}</span>
            <span class="case-date">${date}</span>
          </div>
          ${c.classification ? `
            <div class="case-card-classification">
              <strong>${c.classification}</strong>
              ${c.severity ? `<span class="severity-tag severity-${c.severity}">${c.severity}</span>` : ''}
            </div>
          ` : ''}
          ${c.userEmail ? `<div class="case-card-user">${c.userEmail}</div>` : ''}
          <div class="case-card-id">${c.caseId.substring(0, 8)}...</div>
        </div>
      </a>
    `;
  }).join('');
}

setInterval(loadCases, 30000);

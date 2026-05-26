let allCases = [];
let currentFilter = 'all';
let currentUid = null;
let currentRole = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  currentUid = user.uid;
  currentRole = await getUserRole();
  document.getElementById('welcomeMsg').textContent = `Welcome, ${user.email}`;
  document.getElementById('roleDescription').textContent =
    currentRole === 'clinician' ? 'Viewing all cases — clinician access' :
    currentRole === 'admin' ? 'Viewing all cases — admin access' :
    'Viewing your cases';

  if (currentRole === 'clinician' || currentRole === 'admin') {
    document.getElementById('filterNeedsReview').hidden = false;
  }
  if (currentRole === 'patient' || currentRole === 'clinician') loadCredits();
  loadCases();
});

async function loadCredits() {
  try {
    const res = await authFetch('/api/user/me');
    if (!res || !res.ok) return;
    const { uploadCredits, role } = await res.json();
    const bar = document.getElementById('creditsBar');
    const val = document.getElementById('creditsValue');
    val.textContent = uploadCredits;
    val.className = `credits-value ${uploadCredits === 0 ? 'credits-empty' : uploadCredits <= 1 ? 'credits-low' : 'credits-ok'}`;
    if (role === 'clinician') {
      document.querySelector('.credits-hint').textContent = 'Review a case to earn more.';
    }
    bar.hidden = false;
  } catch { /* non-critical */ }
}

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

function needsReview(c) {
  return c.status === 'complete' && c.userId !== currentUid;
}

function updateStats() {
  document.getElementById('statTotal').textContent = allCases.length;
  document.getElementById('statPending').textContent =
    allCases.filter(c => ['pending', 'vision_processing', 'vision_done', 'analyzing'].includes(c.status)).length;
  document.getElementById('statComplete').textContent =
    allCases.filter(c => ['complete', 'signed_off', 'reviewed'].includes(c.status)).length;
  document.getElementById('statErrors').textContent =
    allCases.filter(c => c.status === 'error').length;

  const reviewCount = allCases.filter(needsReview).length;
  const btn = document.getElementById('filterNeedsReview');
  btn.textContent = reviewCount > 0 ? `Needs Review (${reviewCount})` : 'Needs Review';
  btn.classList.toggle('filter-urgent-active', reviewCount > 0);
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
    } else if (currentFilter === 'needs_review') {
      filtered = allCases.filter(needsReview);
    } else {
      filtered = allCases.filter(c => c.status === currentFilter);
    }
  }

  const grid = document.getElementById('casesGrid');
  const empty = document.getElementById('emptyState');
  const reviewSection = document.getElementById('reviewSection');
  const reviewGrid = document.getElementById('reviewGrid');
  const clinicianAllHeader = document.getElementById('clinicianAllHeader');

  // For clinicians/admins: split into two sections
  if (currentRole === 'clinician' || currentRole === 'admin') {
    const urgent = filtered.filter(needsReview);
    const rest = filtered.filter(c => !needsReview(c));

    reviewSection.hidden = urgent.length === 0;
    clinicianAllHeader.hidden = false;
    document.getElementById('reviewSectionTitle').textContent =
      `Awaiting Review (${urgent.length})`;

    reviewGrid.innerHTML = urgent.map(c => renderCard(c)).join('');
    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
    } else {
      empty.hidden = true;
      grid.innerHTML = rest.map(c => renderCard(c)).join('');
    }
    return;
  }

  // Patients/others: single grid
  reviewSection.hidden = true;
  clinicianAllHeader.hidden = true;
  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  grid.innerHTML = filtered.map(c => renderCard(c)).join('');
}

function renderCard(c) {
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

  const isUrgent = needsReview(c);
  const isMyUpload = c.userId === currentUid;

  return `
    <a href="/case/${c.caseId}" class="case-card${isUrgent ? ' needs-review' : ''}">
      ${isUrgent ? '<div class="needs-review-banner"><span class="needs-review-dot"></span>Needs Review</div>' : ''}
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
        <div class="case-card-meta">
          ${c.userEmail ? `<span class="case-card-user">${isMyUpload ? '(my upload)' : c.userEmail}</span>` : ''}
          <span class="case-card-id">${c.caseId.substring(0, 8)}...</span>
        </div>
      </div>
    </a>
  `;
}

setInterval(loadCases, 30000);

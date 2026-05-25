const caseId = window.location.pathname.split('/').pop();

const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const imageContainer = document.getElementById('imageContainer');
const visionSection = document.getElementById('visionSection');
const visionLabels = document.getElementById('visionLabels');
const chexnetSection = document.getElementById('chexnetSection');
const chexnetScoresEl = document.getElementById('chexnetScores');
const classificationSection = document.getElementById('classificationSection');
const classification = document.getElementById('classification');
const findingsSection = document.getElementById('findingsSection');
const findings = document.getElementById('findings');
const explanationSection = document.getElementById('explanationSection');
const explanationEl = document.getElementById('explanation');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const heatmapToggle = document.getElementById('heatmapToggle');
const gradcamLabel = document.getElementById('gradcamLabel');

let originalImageUrl = null;
let heatmapB64 = null;
let heatmapUrl = null;
let showingHeatmap = false;
let userRole = null;
let unsubscribe = null;

// === POLLING (medtriage-db is a named database, client SDK can't reach it directly) ===

function startRealtimeListener() {
  // Named database 'medtriage-db' is not accessible via firebase.firestore() (connects to default).
  // Use polling via the server API which correctly accesses medtriage-db.
  pollCaseFallback();
}

async function pollCaseFallback() {
  try {
    const res = await authFetch(`/api/cases/${caseId}`);
    if (!res) return;
    if (!res.ok) { statusText.textContent = 'Case not found'; return; }
    const data = await res.json();
    updateUI(data);
    if (!['complete', 'error', 'signed_off', 'reviewed', 'awaiting_radiologist'].includes(data.status)) {
      setTimeout(pollCaseFallback, 2000);
    }
  } catch (err) {
    console.error('Polling error:', err);
    setTimeout(pollCaseFallback, 3000);
  }
}

window.addEventListener('beforeunload', () => {
  if (unsubscribe) unsubscribe();
});

auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = '/login'; return; }
  userRole = await getUserRole();
  startRealtimeListener();
});

// === UI UPDATE ===

function updateUI(data) {
  statusBar.className = `status-bar status-${data.status}`;
  const statusMessages = {
    pending: 'Uploading image...',
    vision_processing: 'Running Vision API & CheXNet in parallel...',
    vision_done: 'CheXNet scores ready — running Gemini analysis...',
    analyzing: 'AI analyzing image...',
    complete: 'Analysis complete',
    reviewed: 'Reviewed by clinician',
    signed_off: 'Report signed off',
    awaiting_radiologist: 'Escalated — awaiting radiologist',
    error: 'Error occurred'
  };
  statusText.textContent = statusMessages[data.status] || data.status;

  if (data.imageUrl && !showingHeatmap) {
    originalImageUrl = data.imageUrl;
    imageContainer.innerHTML = `<img src="${data.imageUrl}" alt="Medical image" class="result-image">`;
  }

  if (data.visionLabels && data.visionLabels.length > 0) {
    visionSection.hidden = false;
    visionLabels.innerHTML = data.visionLabels
      .map(l => `<span class="label-tag">${l.description} <small>${(l.score * 100).toFixed(0)}%</small></span>`)
      .join('');
  }

  if (['complete', 'reviewed', 'signed_off', 'awaiting_radiologist'].includes(data.status)) {
    if (data.chexnetTopFindings && data.chexnetTopFindings.length > 0) {
      chexnetSection.hidden = false;
      chexnetScoresEl.innerHTML = data.chexnetTopFindings.map(f => {
        const pct = (f.score * 100).toFixed(1);
        const tier = f.score > 0.5 ? 'high' : f.score > 0.2 ? 'mid' : 'low';
        return `
          <div class="chexnet-bar-row">
            <div class="chexnet-bar-label">
              <span>${f.name}</span>
              <span>${pct}%</span>
            </div>
            <div class="chexnet-bar-track">
              <div class="chexnet-bar-fill ${tier}" style="width: ${pct}%"></div>
            </div>
          </div>`;
      }).join('');
    }

    if (data.heatmapUrl || data.heatmap) {
      heatmapB64 = data.heatmap || null;
      heatmapUrl = data.heatmapUrl || null;
      heatmapToggle.hidden = false;
      gradcamLabel.textContent = data.chexnetGradcamClass || 'top finding';
    }

    classificationSection.hidden = false;
    classification.textContent = data.classification;
    classification.className = `classification-badge badge-${(data.classification || 'other').toLowerCase().replace(/\s+/g, '-')}`;

    const severity = document.getElementById('severity');
    severity.textContent = `${data.severity} severity`;
    severity.className = `confidence-badge conf-${data.severity === 'normal' ? 'high' : data.severity === 'mild' ? 'medium' : 'low'}`;

    const conditionsList = document.getElementById('conditionsList');
    if (data.conditions && data.conditions.length > 0) {
      conditionsList.innerHTML = data.conditions
        .map(c => `<div class="condition-item">
          <span class="condition-name">${c.name}</span>
          <span class="confidence-badge conf-${c.confidence}">${c.confidence}</span>
          <span class="condition-location">${c.location}</span>
        </div>`).join('');
    }

    findingsSection.hidden = false;
    findings.textContent = data.findings;

    explanationSection.hidden = false;
    explanationEl.textContent = data.explanation;
  }

  if (data.status === 'error') {
    errorSection.hidden = false;
    errorMessage.textContent = data.error || 'An unknown error occurred.';
  }

  showReviewPanel(data);
  showDownloadButton(data);
}

function toggleHeatmap() {
  const btn = document.getElementById('toggleBtn');
  if (showingHeatmap) {
    imageContainer.innerHTML = `<img src="${originalImageUrl}" alt="Medical image" class="result-image">`;
    btn.textContent = 'Show Grad-CAM Heatmap';
    showingHeatmap = false;
  } else {
    const heatmapSrc = heatmapUrl || `data:image/png;base64,${heatmapB64}`;
    imageContainer.innerHTML = `<img src="${heatmapSrc}" alt="Grad-CAM heatmap" class="result-image">`;
    btn.textContent = 'Show Original Image';
    showingHeatmap = true;
  }
}

// === CLINICIAN REVIEW (Plan 3) ===

function showReviewPanel(data) {
  if (userRole !== 'clinician' && userRole !== 'admin') return;
  if (!data || data.status === 'pending' || data.status === 'vision_processing') return;

  const reviewSection = document.getElementById('reviewSection');

  if (data.status === 'signed_off') {
    reviewSection.hidden = true;
    const banner = document.getElementById('signedOffBanner');
    banner.hidden = false;
    document.getElementById('signedOffBy').textContent =
      `By ${data.reviewedBy || 'clinician'} on ${data.reviewedAt ? new Date(data.reviewedAt).toLocaleString() : ''}`;
    return;
  }

  reviewSection.hidden = false;

  const findingsEl = document.getElementById('reviewFindings');
  if (!findingsEl.value && data.findings) {
    findingsEl.value = data.findings;
  }

  const severityEl = document.getElementById('reviewSeverity');
  if (data.severity && !severityEl.dataset.userEdited) {
    severityEl.value = data.severity;
  }

  loadReviewHistory();
}

document.getElementById('reviewSeverity').addEventListener('change', function () {
  this.dataset.userEdited = 'true';
});

async function submitReview(signOff) {
  const findingsText = document.getElementById('reviewFindings').value.trim();
  const severity = document.getElementById('reviewSeverity').value;
  const statusEl = document.getElementById('reviewStatus');

  if (!findingsText) {
    statusEl.textContent = 'Please enter findings before submitting.';
    statusEl.className = 'review-status error';
    statusEl.hidden = false;
    return;
  }

  if (signOff && !confirm('Are you sure you want to sign off this report? This will finalize the case.')) {
    return;
  }

  try {
    const res = await authFetch(`/api/cases/${caseId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findings: findingsText, severity, signOff })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Review submission failed');
    }

    statusEl.textContent = signOff ? 'Report signed off successfully!' : 'Draft saved.';
    statusEl.className = `review-status ${signOff ? 'success' : 'info'}`;
    statusEl.hidden = false;

    if (signOff) {
      document.getElementById('reviewSection').hidden = true;
      document.getElementById('signedOffBanner').hidden = false;
    }

    loadReviewHistory();
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'review-status error';
    statusEl.hidden = false;
  }
}

async function escalateCase() {
  if (!confirm('Escalate this case to a radiologist?')) return;

  const statusEl = document.getElementById('reviewStatus');
  try {
    const res = await authFetch(`/api/cases/${caseId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Escalation failed');
    }

    statusEl.textContent = 'Case escalated to radiologist.';
    statusEl.className = 'review-status info';
    statusEl.hidden = false;
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'review-status error';
    statusEl.hidden = false;
  }
}

async function loadReviewHistory() {
  try {
    const res = await authFetch(`/api/cases/${caseId}/reviews`);
    if (!res || !res.ok) return;
    const reviews = await res.json();

    if (reviews.length === 0) return;

    const historySection = document.getElementById('reviewHistory');
    historySection.hidden = false;

    document.getElementById('reviewList').innerHTML = reviews.map(r => `
      <div class="review-item ${r.signOff ? 'review-signed' : ''}">
        <div class="review-item-header">
          <span class="review-clinician">${r.clinicianEmail}</span>
          <span class="review-time">${new Date(r.timestamp).toLocaleString()}</span>
          ${r.signOff ? '<span class="review-badge-signed">Signed Off</span>' : '<span class="review-badge-draft">Draft</span>'}
        </div>
        <div class="review-item-body">
          <p><strong>Severity:</strong> ${r.severity}</p>
          <p>${r.findings.substring(0, 200)}${r.findings.length > 200 ? '...' : ''}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load reviews error:', err);
  }
}

// === PDF DOWNLOAD (Plan 5) ===

function showDownloadButton(data) {
  const downloadSection = document.getElementById('downloadSection');
  if (!downloadSection) return;

  if (userRole === 'patient') {
    downloadSection.hidden = (data.status !== 'signed_off');
  } else if (userRole === 'clinician' || userRole === 'admin') {
    downloadSection.hidden = !['complete', 'reviewed', 'signed_off'].includes(data.status);
  } else {
    downloadSection.hidden = true;
  }
}

async function downloadPDF() {
  try {
    const token = await getAuthToken();
    if (!token) { window.location.href = '/login'; return; }

    const res = await fetch(`/api/cases/${caseId}/report.pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      let errMsg = 'Download failed';
      try { const err = await res.json(); errMsg = err.error || errMsg; } catch(e) {}
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MedTriageAI-Report-${caseId.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Failed to download report: ' + err.message);
  }
}

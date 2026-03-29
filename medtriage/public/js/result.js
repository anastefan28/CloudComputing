const caseId = window.location.pathname.split('/').pop();

// DOM refs
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const imageContainer = document.getElementById('imageContainer');
const visionSection = document.getElementById('visionSection');
const visionLabels = document.getElementById('visionLabels');
const classificationSection = document.getElementById('classificationSection');
const classification = document.getElementById('classification');
const confidence = document.getElementById('confidence');
const findingsSection = document.getElementById('findingsSection');
const findings = document.getElementById('findings');
const explanationSection = document.getElementById('explanationSection');
const explanationEl = document.getElementById('explanation');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// Poll the API every 2 seconds until complete or error
async function pollCase() {
  try {
    const res = await fetch(`/api/cases/${caseId}`);
    if (!res.ok) {
      statusText.textContent = 'Case not found';
      return;
    }
    const data = await res.json();
    updateUI(data);

    // Keep polling if not done yet
    if (data.status !== 'complete' && data.status !== 'error') {
      setTimeout(pollCase, 2000);
    }
  } catch (err) {
    console.error('Polling error:', err);
    setTimeout(pollCase, 3000);
  }
}

// Start polling immediately
pollCase();

function updateUI(data) {
  // Update status bar
  statusBar.className = `status-bar status-${data.status}`;
  const statusMessages = {
    pending: 'Uploading image...',
    vision_processing: 'Extracting visual features...',
    vision_done: 'Features extracted — running AI analysis...',
    analyzing: 'AI analyzing image...',
    complete: 'Analysis complete',
    error: 'Error occurred'
  };
  statusText.textContent = statusMessages[data.status] || data.status;

  // Show image as soon as URL is available
  if (data.imageUrl) {
    imageContainer.innerHTML = `<img src="${data.imageUrl}" alt="Medical image" class="result-image">`;
  }

  // Progressive reveal: Vision labels
  if (data.visionLabels && data.visionLabels.length > 0) {
    visionSection.hidden = false;
    visionLabels.innerHTML = data.visionLabels
      .map(l => `<span class="label-tag">${l.description} <small>${(l.score * 100).toFixed(0)}%</small></span>`)
      .join('');
  }

  // Progressive reveal: Classification + conditions + findings + explanation
  if (data.status === 'complete') {
    classificationSection.hidden = false;
    classification.textContent = data.classification;
    classification.className = `classification-badge badge-${(data.classification || 'other').toLowerCase().replace(' ', '-')}`;
    
    const severity = document.getElementById('severity');
    severity.textContent = `${data.severity} severity`;
    severity.className = `confidence-badge conf-${data.severity === 'normal' ? 'high' : data.severity === 'mild' ? 'medium' : 'low'}`;

    // Render individual conditions
    const conditionsList = document.getElementById('conditionsList');
    if (data.conditions && data.conditions.length > 0) {
      conditionsList.innerHTML = data.conditions
        .map(c => `<div class="condition-item">
          <span class="condition-name">${c.name}</span>
          <span class="confidence-badge conf-${c.confidence}">${c.confidence}</span>
          <span class="condition-location">${c.location}</span>
        </div>`)
        .join('');
    }

    findingsSection.hidden = false;
    findings.textContent = data.findings;

    explanationSection.hidden = false;
    explanationEl.textContent = data.explanation;
  }

  // Error state
  if (data.status === 'error') {
    errorSection.hidden = false;
    errorMessage.textContent = data.error || 'An unknown error occurred.';
  }
}
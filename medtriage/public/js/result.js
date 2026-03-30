const caseId = window.location.pathname.split('/').pop();

// DOM refs
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

// Track heatmap state
let originalImageUrl = null;
let heatmapB64 = null;
let showingHeatmap = false;

async function pollCase() {
  try {
    const res = await fetch(`/api/cases/${caseId}`);
    if (!res.ok) { statusText.textContent = 'Case not found'; return; }
    const data = await res.json();
    updateUI(data);
    if (data.status !== 'complete' && data.status !== 'error') {
      setTimeout(pollCase, 2000);
    }
  } catch (err) {
    console.error('Polling error:', err);
    setTimeout(pollCase, 3000);
  }
}

pollCase();

function updateUI(data) {
  // Status bar
  statusBar.className = `status-bar status-${data.status}`;
  const statusMessages = {
    pending: 'Uploading image...',
    vision_processing: 'Running Vision API & CheXNet in parallel...',
    vision_done: 'CheXNet scores ready — running Gemini analysis...',
    analyzing: 'AI analyzing image...',
    complete: 'Analysis complete',
    error: 'Error occurred'
  };
  statusText.textContent = statusMessages[data.status] || data.status;

  // Show original image
  if (data.imageUrl && !showingHeatmap) {
    originalImageUrl = data.imageUrl;
    imageContainer.innerHTML = `<img src="${data.imageUrl}" alt="Medical image" class="result-image">`;
  }

  // Vision labels
  if (data.visionLabels && data.visionLabels.length > 0) {
    visionSection.hidden = false;
    visionLabels.innerHTML = data.visionLabels
      .map(l => `<span class="label-tag">${l.description} <small>${(l.score * 100).toFixed(0)}%</small></span>`)
      .join('');
  }

  if (data.status === 'complete') {
    // CheXNet scores — render as a bar chart list
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

    // Heatmap toggle
    if (data.heatmap) {
      heatmapB64 = data.heatmap;
      heatmapToggle.hidden = false;
      gradcamLabel.textContent = data.chexnetGradcamClass || 'top finding';
    }

    // Classification
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
}

function toggleHeatmap() {
  const btn = document.getElementById('toggleBtn');
  if (showingHeatmap) {
    // Switch back to original
    imageContainer.innerHTML = `<img src="${originalImageUrl}" alt="Medical image" class="result-image">`;
    btn.textContent = 'Show Grad-CAM Heatmap';
    showingHeatmap = false;
  } else {
    // Show heatmap
    imageContainer.innerHTML = `<img src="data:image/png;base64,${heatmapB64}" alt="Grad-CAM heatmap" class="result-image">`;
    btn.textContent = 'Show Original Image';
    showingHeatmap = true;
  }
}
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const fileName = document.getElementById('fileName');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const uploadError = document.getElementById('uploadError');
const loading = document.getElementById('loading');

let selectedFile = null;

// Click to browse
dropZone.addEventListener('click', () => fileInput.click());

// Drag & drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  uploadError.hidden = true;

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    showError('Only JPEG and PNG files are accepted.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('File must be under 10MB.');
    return;
  }

  selectedFile = file;
  previewImg.src = URL.createObjectURL(file);
  fileName.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  preview.hidden = false;
  dropZone.hidden = true;
  analyzeBtn.disabled = false;
}

removeBtn.addEventListener('click', () => {
  selectedFile = null;
  preview.hidden = true;
  dropZone.hidden = false;
  analyzeBtn.disabled = true;
  fileInput.value = '';
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  analyzeBtn.disabled = true;
  loading.hidden = false;
  uploadError.hidden = true;

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }

    const { caseId } = await res.json();

    // Redirect to result page
    window.location.href = `/case/${caseId}`;

  } catch (err) {
    showError(err.message);
    analyzeBtn.disabled = false;
    loading.hidden = true;
  }
});

function showError(msg) {
  uploadError.textContent = msg;
  uploadError.hidden = false;
}
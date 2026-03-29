const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { uploadImage } = require('../services/storage');
const { analyzeImage } = require('../services/vision');
const { analyzeWithGemini } = require('../services/gemini');
const { createCase, updateCase } = require('../services/firestore');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed'));
    }
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const caseId = uuidv4();
    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `${caseId}.${ext}`;

    const { gcsUri, publicUrl } = await uploadImage(
      req.file.buffer, filename, req.file.mimetype
    );

    await createCase(caseId, gcsUri, publicUrl);

    res.json({ caseId });

    runPipeline(caseId, gcsUri, req.file.buffer, req.file.mimetype);

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function runPipeline(caseId, gcsUri, imageBuffer, mimetype) {
  try {
    await updateCase(caseId, { status: 'vision_processing' });
    const visionResult = await analyzeImage(gcsUri);
    await updateCase(caseId, {
      status: 'vision_done',
      visionLabels: visionResult.labels
    });

    await updateCase(caseId, { status: 'analyzing' });
    const geminiResult = await analyzeWithGemini(
      imageBuffer, mimetype, visionResult.labels
    );

    await updateCase(caseId, {
      status: 'complete',
      conditions: geminiResult.conditions,
      classification: geminiResult.primaryClassification,
      severity: geminiResult.overallSeverity,
      findings: geminiResult.findings,
      explanation: geminiResult.explanation
    });

  } catch (err) {
    console.error(`Pipeline error for ${caseId}:`, err);
    await updateCase(caseId, {
      status: 'error',
      error: err.message
    });
  }
}

module.exports = router;
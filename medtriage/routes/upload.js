const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { uploadImage, uploadHeatmap } = require('../services/storage');
const { analyzeImage } = require('../services/vision');
const { analyzeWithCheXNet } = require('../services/chexnet');
const { analyzeWithGemini } = require('../services/gemini');
const { createCase, updateCase, spendUploadCredit, earnUploadCredit } = require('../services/firestore');
const { verifyToken } = require('../services/auth');
const cache = require('../services/cache');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed'));
    }
  }
});

router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const existing = await cache.getHash(sha256);
    if (existing) {
      console.log(`[upload] Duplicate image detected, returning existing case ${existing}`);
      return res.json({ caseId: existing, cached: true });
    }

    if (req.user.role !== 'admin') {
      const granted = await spendUploadCredit(req.user.uid);
      if (!granted) {
        const msg = req.user.role === 'patient'
          ? 'No upload credits remaining.'
          : 'Upload quota reached. Review more cases to earn additional upload slots.';
        return res.status(402).json({ error: msg });
      }
    }

    const caseId = uuidv4();
    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `${caseId}.${ext}`;

    const { gcsUri, publicUrl } = await uploadImage(
      req.file.buffer, filename, req.file.mimetype
    );

    await createCase(caseId, gcsUri, publicUrl, req.user.uid, req.user.email);

    res.json({ caseId });

    runPipeline(caseId, sha256, req.user.uid, gcsUri, req.file.buffer, req.file.mimetype);

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

const MEDICAL_KEYWORDS = [
  'x-ray', 'xray', 'radiograph', 'radiology', 'radiological',
  'medical', 'medicine', 'clinical',
  'chest', 'thorax', 'thoracic',
  'lung', 'pulmonary',
  'bone', 'skeletal', 'skeleton',
  'scan', 'imaging', 'mri', 'ultrasound', 'tomography',
  'anatomy', 'anatomical',
  'patient', 'hospital', 'healthcare'
];

function isMedicalImage(labels) {
  return labels.some(l =>
    MEDICAL_KEYWORDS.some(kw => l.description.toLowerCase().includes(kw))
  );
}

async function runPipeline(caseId, sha256, userId, gcsUri, imageBuffer, mimetype) {
  try {
    await updateCase(caseId, { status: 'vision_processing' });

    const visionResult = await analyzeImage(gcsUri);

    if (!isMedicalImage(visionResult.labels)) {
      console.log(`[pipeline] Non-medical image rejected for case ${caseId}. Labels: ${visionResult.labels.map(l => l.description).join(', ')}`);
      await Promise.all([
        updateCase(caseId, {
          status: 'error',
          error: 'Image does not appear to be a medical X-ray. Please upload a valid chest X-ray image.',
          visionLabels: visionResult.labels
        }),
        earnUploadCredit(userId)
      ]);
      return;
    }

    const chexnetResult = await analyzeWithCheXNet(imageBuffer, mimetype);

    let heatmapUrl = null;
    if (chexnetResult.heatmap) {
      heatmapUrl = await uploadHeatmap(caseId, chexnetResult.heatmap);
    }

    await updateCase(caseId, {
      status: 'vision_done',
      visionLabels: visionResult.labels,
      chexnetScores: chexnetResult.classScores,
      chexnetTopFindings: chexnetResult.topFindings,
      chexnetGradcamClass: chexnetResult.gradcamClass,
      heatmapUrl
    });

    await updateCase(caseId, { status: 'analyzing' });

    const geminiResult = await analyzeWithGemini(
      imageBuffer,
      mimetype,
      visionResult.labels,
      chexnetResult
    );

    await updateCase(caseId, {
      status: 'complete',
      conditions: geminiResult.conditions,
      classification: geminiResult.primaryClassification,
      severity: geminiResult.overallSeverity,
      findings: geminiResult.findings,
      explanation: geminiResult.explanation
    });

    await cache.setHash(sha256, caseId);

  } catch (err) {
    console.error(`Pipeline error for ${caseId}:`, err);
    await updateCase(caseId, {
      status: 'error',
      error: err.message
    });
  }
}

module.exports = router;

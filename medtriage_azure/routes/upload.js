const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Modificat: Importurile actualizate pentru mediul Azure
const { uploadImage } = require('../services/azureStorage');
const { analyzeImage } = require('../services/azureVision');
const { analyzeWithCheXNet } = require('../services/chexnet');
const { analyzeWithLLM } = require('../services/openai'); // Înlocuiește gemini.js
const { createCase, updateCase } = require('../services/cosmos'); // Înlocuiește firestore.js

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') { //
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed')); //
    }
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const caseId = uuidv4();
    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg'; //
    const filename = `${caseId}.${ext}`;

    // Am păstrat gcsUri ca nume de variabilă pentru compatibilitate cu baza ta de date
    const { gcsUri, publicUrl } = await uploadImage(
      req.file.buffer, filename, req.file.mimetype
    );

    await createCase(caseId, gcsUri, publicUrl);

    res.json({ caseId }); //

    // Fire-and-forget pipeline
    runPipeline(caseId, gcsUri, req.file.buffer, req.file.mimetype);

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message }); //
  }
});

async function runPipeline(caseId, gcsUri, imageBuffer, mimetype) {
  try {
    // Step 1: Azure Vision (runs in parallel with CheXNet)
    await updateCase(caseId, { status: 'vision_processing' }); //

    const [visionResult, chexnetResult] = await Promise.all([
      analyzeImage(gcsUri),
      analyzeWithCheXNet(imageBuffer, mimetype) //
    ]);

    await updateCase(caseId, {
      status: 'vision_done',
      visionLabels: visionResult.labels, //
      // Store CheXNet scores and heatmap immediately
      chexnetScores: chexnetResult.classScores, //
      chexnetTopFindings: chexnetResult.topFindings, //
      chexnetGradcamClass: chexnetResult.gradcamClass, //
      heatmap: chexnetResult.heatmap  // base64 PNG from Grad-CAM
    });

    // Step 2: OpenAI gets both Vision labels + CheXNet scores
    await updateCase(caseId, { status: 'analyzing' }); //

    // Modificat: Apelul către funcția adaptată pentru Azure OpenAI
    const llmResult = await analyzeWithLLM(
      imageBuffer,
      mimetype,
      visionResult.labels, //
      chexnetResult          // { classScores, topFindings, gradcamClass }
    );

    await updateCase(caseId, {
      status: 'complete',
      conditions: llmResult.conditions,
      classification: llmResult.primaryClassification,
      severity: llmResult.overallSeverity,
      findings: llmResult.findings,
      explanation: llmResult.explanation
    });

  } catch (err) {
    console.error(`Pipeline error for ${caseId}:`, err);
    await updateCase(caseId, {
      status: 'error', //
      error: err.message
    });
  }
}

module.exports = router; //
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY || 'PASTE_YOUR_KEY_HERE';
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * @param {Buffer} imageBuffer
 * @param {string} mimetype
 * @param {Array}  visionLabels   - from Cloud Vision (kept for context)
 * @param {Object} chexnetScores  - { classScores: {Effusion: 0.82, ...}, topFindings: [...], gradcamClass: "Effusion" }
 */
async function analyzeWithGemini(imageBuffer, mimetype, visionLabels, chexnetScores) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimetype
    }
  };

  // Format CheXNet top findings for the prompt
  const topFindingsText = chexnetScores.topFindings
    .map(f => `  - ${f.name}: ${(f.score * 100).toFixed(1)}%`)
    .join('\n');

  const allScoresText = Object.entries(chexnetScores.classScores)
    .sort(([, a], [, b]) => b - a)
    .map(([name, score]) => `  ${name}: ${(score * 100).toFixed(1)}%`)
    .join('\n');

  const prompt = `You are a medical image analysis assistant for a decision-support tool (NOT a diagnostic device).

You receive a chest X-ray image along with pathology probability scores from CheXNet (a DenseNet-121 model trained on ChestX-ray14), and supplementary labels from Google Cloud Vision API.

## CheXNet Pathology Scores (most relevant):
${topFindingsText}

## All CheXNet Scores:
${allScoresText}

## Primary finding flagged by CheXNet Grad-CAM: ${chexnetScores.gradcamClass}

## Google Vision API labels (supplementary context):
${JSON.stringify(visionLabels)}

Using the CheXNet scores as your primary signal and the image as visual confirmation, provide a structured radiological analysis. A single image may show MULTIPLE conditions. Respond with ONLY valid JSON, no markdown, no backticks, no preamble:
{
  "conditions": [
    {
      "name": "condition name matching CheXNet classes where relevant",
      "confidence": "high | medium | low",
      "location": "e.g. bilateral, left lung, right lower lobe, cardiac silhouette",
      "chexnetScore": 0.0
    }
  ],
  "primaryClassification": "the most prominent finding based on CheXNet scores, or Normal if all scores are low",
  "overallSeverity": "normal | mild | moderate | severe",
  "findings": "4-6 sentence detailed radiological findings describing what is observed. Reference the CheXNet probability scores where clinically relevant. Include cardiac size, lung fields, costophrenic angles, mediastinum, and any abnormalities.",
  "explanation": "A plain-language paragraph explaining what was found in terms a non-radiologist clinician can understand. Mention which findings have high CheXNet confidence scores. Include a disclaimer that this is AI-assisted analysis and should not replace clinical judgement."
}`;

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();
  const clean = text.replace(/```json\n?|```\n?/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    return {
      conditions: [],
      primaryClassification: 'Other',
      overallSeverity: 'unknown',
      findings: 'Unable to parse structured response from AI model.',
      explanation: clean
    };
  }
}

module.exports = { analyzeWithGemini };
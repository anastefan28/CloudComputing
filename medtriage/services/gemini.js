const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY || 'PASTE_YOUR_KEY_HERE';
const genAI = new GoogleGenerativeAI(API_KEY);

async function analyzeWithGemini(imageBuffer, mimetype, visionLabels) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimetype
    }
  };

  const prompt = `You are a medical image analysis assistant for a decision-support tool (NOT a diagnostic device).

You receive a chest X-ray image and preliminary label annotations from Google Cloud Vision API.

Vision API labels: ${JSON.stringify(visionLabels)}

Analyze the chest X-ray thoroughly. A single image may show MULTIPLE conditions. Respond with ONLY valid JSON, no markdown, no backticks, no preamble:
{
  "conditions": [
    {
      "name": "e.g. Cardiomegaly, Pneumonia, Pleural Effusion, Atelectasis, Pneumothorax, Pulmonary Edema, Consolidation, Nodule, Mass, Fibrosis, Emphysema, or Normal",
      "confidence": "high | medium | low",
      "location": "e.g. bilateral, left lung, right lower lobe, cardiac silhouette"
    }
  ],
  "primaryClassification": "the most prominent finding, or Normal if none",
  "overallSeverity": "normal | mild | moderate | severe",
  "findings": "4-6 sentence detailed radiological findings describing what is observed in the image, including cardiac size, lung fields, costophrenic angles, mediastinum, and any abnormalities",
  "explanation": "A plain-language paragraph explaining what was found in terms a non-radiologist clinician can understand. Include a disclaimer that this is AI-assisted analysis and should not replace clinical judgement."
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
const { AzureOpenAI } = require('openai');

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://my-resource.openai.azure.com/";
const apiKey = process.env.AZURE_OPENAI_API_KEY || "PASTE_YOUR_KEY_HERE";
const apiVersion = "2024-02-15-preview"; // Versiunea API pentru Azure
const deployment = "gpt-4o"; // Numele deployment-ului tău din Azure

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

/**
 * @param {Buffer} imageBuffer
 * @param {string} mimetype
 * @param {Array}  visionLabels   - from Azure Vision (kept for context)
 * @param {Object} chexnetScores  - { classScores: {Effusion: 0.82, ...}, topFindings: [...], gradcamClass: "Effusion" }
 */
async function analyzeWithLLM(imageBuffer, mimetype, visionLabels, chexnetScores) {
  
  const base64Image = imageBuffer.toString('base64');
  const imageUrl = `data:${mimetype};base64,${base64Image}`; // Formatul cerut de GPT-4 Vision

  const topFindingsText = chexnetScores.topFindings
    .map(f => `  - ${f.name}: ${(f.score * 100).toFixed(1)}%`)
    .join('\n'); //

  const allScoresText = Object.entries(chexnetScores.classScores)
    .sort(([, a], [, b]) => b - a)
    .map(([name, score]) => `  ${name}: ${(score * 100).toFixed(1)}%`)
    .join('\n'); //

  // Prompt-ul rămâne neschimbat, am păstrat structura ta JSON
  const promptText = `You are a medical image analysis assistant for a decision-support tool (NOT a diagnostic device).

You receive a chest X-ray image along with pathology probability scores from CheXNet (a DenseNet-121 model trained on ChestX-ray14), and supplementary labels from Azure Computer Vision API.

## CheXNet Pathology Scores (most relevant):
${topFindingsText}

## All CheXNet Scores:
${allScoresText}

## Primary finding flagged by CheXNet Grad-CAM: ${chexnetScores.gradcamClass}

## Azure Vision API labels (supplementary context):
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

  const response = await client.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 1000
  });

  const text = response.choices[0].message.content;
  const clean = text.replace(/```json\n?|```\n?/g, '').trim(); // Curățăm markerele markdown exact cum ai făcut la Gemini

  try {
    return JSON.parse(clean);
  } catch (err) {
    return {
      conditions: [],
      primaryClassification: 'Other',
      overallSeverity: 'unknown',
      findings: 'Unable to parse structured response from AI model.',
      explanation: clean
    }; // Logica de fallback
  }
}

module.exports = { analyzeWithLLM };
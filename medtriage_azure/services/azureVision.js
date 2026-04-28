const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');

const key = process.env.AZURE_VISION_KEY || 'PASTE_KEY_HERE';
const endpoint = process.env.AZURE_VISION_ENDPOINT || 'PASTE_ENDPOINT_HERE';

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
  endpoint
);

async function analyzeImage(imageUrl) {
  // Azure Vision procesează direct URL-ul public al imaginii (din Azure Blob Storage)
  const result = await computerVisionClient.analyzeImage(imageUrl, {
    visualFeatures: ['Tags', 'Objects']
  });

  const labels = (result.tags || []).map(t => ({
    description: t.name, // Mapăm "name" din Azure la "description" așteptat de codul tău vechi
    score: Math.round(t.confidence * 100) / 100
  }));

  const objects = (result.objects || []).map(o => ({
    name: o.object,
    confidence: Math.round(o.confidence * 100) / 100
  }));

  return { labels, objects }; // Același format returnat
}

module.exports = { analyzeImage };
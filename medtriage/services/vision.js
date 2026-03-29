const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

async function analyzeImage(gcsUri) {
  const [result] = await client.annotateImage({
    image: { source: { imageUri: gcsUri } },
    features: [
      { type: 'LABEL_DETECTION', maxResults: 10 },
      { type: 'OBJECT_LOCALIZATION', maxResults: 5 }
    ]
  });

  const labels = (result.labelAnnotations || []).map(l => ({
    description: l.description,
    score: Math.round(l.score * 100) / 100
  }));

  const objects = (result.localizedObjectAnnotations || []).map(o => ({
    name: o.name,
    confidence: Math.round(o.score * 100) / 100
  }));

  return { labels, objects };
}

module.exports = { analyzeImage };
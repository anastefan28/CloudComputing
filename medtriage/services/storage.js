
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const BUCKET = 'medtriage-images';

async function uploadImage(fileBuffer, filename, mimetype) {
  const bucket = storage.bucket(BUCKET);
  const blob = bucket.file(`uploads/${filename}`);

  await blob.save(fileBuffer, {
    metadata: { contentType: mimetype }
  });

  await blob.makePublic();

  return {
    gcsUri: `gs://${BUCKET}/uploads/${filename}`,
    publicUrl: `https://storage.googleapis.com/${BUCKET}/uploads/${filename}`
  };
}

async function uploadHeatmap(caseId, base64Data) {
  const bucket = storage.bucket(BUCKET);
  const blob = bucket.file(`heatmaps/${caseId}.png`);
  const buffer = Buffer.from(base64Data, 'base64');

  await blob.save(buffer, {
    metadata: { contentType: 'image/png' }
  });

  await blob.makePublic();

  return `https://storage.googleapis.com/${BUCKET}/heatmaps/${caseId}.png`;
}

async function uploadPDF(caseId, pdfBuffer) {
  const bucket = storage.bucket(BUCKET);
  const blob = bucket.file(`reports/${caseId}.pdf`);
  await blob.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
}

async function downloadPDF(caseId) {
  try {
    const bucket = storage.bucket(BUCKET);
    const [buffer] = await bucket.file(`reports/${caseId}.pdf`).download();
    return buffer;
  } catch { return null; }
}

module.exports = { uploadImage, uploadHeatmap, uploadPDF, downloadPDF };
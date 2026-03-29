
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

module.exports = { uploadImage };
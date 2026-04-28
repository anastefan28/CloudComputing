const { BlobServiceClient } = require('@azure/storage-blob');

// Conexiunea se face pe baza unui Connection String din Azure Portal
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || 'PASTE_CONNECTION_STRING';
const CONTAINER_NAME = 'medtriage-images'; // Fostul BUCKET

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

async function uploadImage(fileBuffer, filename, mimetype) {
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  
  // Creăm containerul dacă nu există și setăm accesul public pentru imagini
  await containerClient.createIfNotExists({ access: 'blob' });

  const blockBlobClient = containerClient.getBlockBlobClient(`uploads/${filename}`);

  await blockBlobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: { blobContentType: mimetype }
  });

  return {
    gcsUri: blockBlobClient.url, // Păstrăm numele variabilei pentru compatibilitate cu restul codului tău
    publicUrl: blockBlobClient.url
  };
}

module.exports = { uploadImage };
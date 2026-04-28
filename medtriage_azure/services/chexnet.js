// Actualizăm doar URL-ul default pentru Azure Container Apps în loc de gcloud run
const CHEXNET_URL = process.env.CHEXNET_URL || 'https://chexnet-app.jollybeach-1234.westeurope.azurecontainerapps.io';

async function analyzeWithCheXNet(imageBuffer, mimetype, retries = 3) {
  const boundary = '----MedTriageBoundary' + Date.now();
  const filename = mimetype === 'image/png' ? 'image.png' : 'image.jpg'; //

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
    `Content-Type: ${mimetype}\r\n\r\n`
  ); // Construirea bufferului rămâne identică
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, imageBuffer, footer]);

  for (let i = 0; i < retries; i++) {
    const response = await fetch(`${CHEXNET_URL}/predict/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      body
    }); // Efectuarea request-ului cu numărul specificat de reîncercări

    // Păstrăm logica pentru "cold start" (care se aplică și la Azure Container Apps când scalează de la 0)
    if (response.status === 503 && i < retries - 1) {
      console.log(`CheXNet cold start, retrying in 10s (attempt ${i + 1})`);
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CheXNet error ${response.status}: ${text}`);
    }

    return response.json();
  }
}

module.exports = { analyzeWithCheXNet };
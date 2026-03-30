const CHEXNET_URL = process.env.CHEXNET_URL || 'https://your-cloud-run-url.run.app';

async function analyzeWithCheXNet(imageBuffer, mimetype, retries = 3) {
  const boundary = '----MedTriageBoundary' + Date.now();
  const filename = mimetype === 'image/png' ? 'image.png' : 'image.jpg';

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
    `Content-Type: ${mimetype}\r\n\r\n`
  );
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
    });

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
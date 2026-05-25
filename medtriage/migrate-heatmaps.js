const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: 'medtriage-db' });
const storage = new Storage();
const BUCKET = 'medtriage-images';

async function migrate() {
  // Get all cases — Firestore returns full docs including large fields
  const snapshot = await db.collection('cases').get();
  console.log(`Found ${snapshot.size} total cases\n`);

  let migrated = 0;
  let deleted = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const caseId = docSnap.id;

    if (data.heatmapUrl && !data.heatmap) {
      skipped++;
      continue;
    }

    if (data.heatmap) {
      try {
        // Upload heatmap to GCS
        const buffer = Buffer.from(data.heatmap, 'base64');
        const blob = storage.bucket(BUCKET).file(`heatmaps/${caseId}.png`);
        await blob.save(buffer, { metadata: { contentType: 'image/png' } });
        await blob.makePublic();
        const heatmapUrl = `https://storage.googleapis.com/${BUCKET}/heatmaps/${caseId}.png`;

        // Remove base64 field, add URL
        await docSnap.ref.update({
          heatmapUrl,
          heatmap: admin.firestore.FieldValue.delete()
        });
        console.log(`  MIGRATED ${caseId} -> ${heatmapUrl}`);
        migrated++;
      } catch (err) {
        // If update fails, just delete the heatmap field to unblock the doc
        try {
          await docSnap.ref.update({
            heatmap: admin.firestore.FieldValue.delete()
          });
          console.log(`  DELETED heatmap from ${caseId} (couldn't migrate: ${err.message})`);
          deleted++;
        } catch (err2) {
          console.error(`  FAILED ${caseId}: ${err2.message}`);
        }
      }
    }
  }

  console.log(`\nDone! Migrated: ${migrated}, Deleted field only: ${deleted}, Already OK: ${skipped}`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });

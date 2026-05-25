const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: 'medtriage-db' });

async function cleanup() {
  const snapshot = await db.collection('cases').where('userId', '==', 'demo-patient-001').get();
  console.log(`Found ${snapshot.size} demo cases to delete`);

  for (const doc of snapshot.docs) {
    const reviews = await doc.ref.collection('reviews').get();
    for (const rev of reviews.docs) {
      await rev.ref.delete();
    }
    await doc.ref.delete();
    console.log(`  Deleted ${doc.id}`);
  }

  console.log('Done!');
  process.exit(0);
}

cleanup().catch(err => { console.error(err); process.exit(1); });

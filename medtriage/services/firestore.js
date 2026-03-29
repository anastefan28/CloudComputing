const { Firestore, FieldValue } = require('@google-cloud/firestore');
const db = new Firestore({ databaseId: 'medtriage-db' });
const COLLECTION = 'cases';

async function createCase(caseId, imageGcsUri, imageUrl) {
  await db.collection(COLLECTION).doc(caseId).set({
    caseId,
    status: 'pending',
    imageGcsUri,
    imageUrl,
    timestamp: FieldValue.serverTimestamp()
  });
}

async function updateCase(caseId, data) {
  await db.collection(COLLECTION).doc(caseId).update(data);
}

async function getCase(caseId) {
  const doc = await db.collection(COLLECTION).doc(caseId).get();
  return doc.exists ? doc.data() : null;
}

module.exports = { createCase, updateCase, getCase };
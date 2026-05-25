const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { v4: uuidv4 } = require('uuid');
const db = new Firestore({ databaseId: 'medtriage-db' });
const COLLECTION = 'cases';

async function createCase(caseId, imageGcsUri, imageUrl, userId, userEmail) {
  await db.collection(COLLECTION).doc(caseId).set({
    caseId,
    status: 'pending',
    imageGcsUri,
    imageUrl,
    userId,
    userEmail,
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

async function listCases(userId, role) {
  let query;

  if (role === 'patient') {
    query = db.collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(50);
  } else {
    query = db.collection(COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(50);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data());
}

async function createReview(caseId, reviewData) {
  const reviewId = uuidv4();
  await db.collection(COLLECTION).doc(caseId)
    .collection('reviews').doc(reviewId)
    .set(reviewData);
  return reviewId;
}

async function getReviews(caseId) {
  const snapshot = await db.collection(COLLECTION).doc(caseId)
    .collection('reviews')
    .orderBy('timestamp', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = { createCase, updateCase, getCase, listCases, createReview, getReviews };

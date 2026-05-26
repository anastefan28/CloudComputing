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

const INITIAL_CREDITS = { patient: 3, clinician: 1 };

async function spendUploadCredit(uid) {
  const userRef = db.collection('users').doc(uid);
  return db.runTransaction(async tx => {
    const doc = await tx.get(userRef);
    const credits = doc.exists ? (doc.data().uploadCredits ?? 0) : 0;
    if (credits <= 0) return false;
    tx.update(userRef, { uploadCredits: FieldValue.increment(-1) });
    return true;
  });
}

async function earnUploadCredit(uid) {
  await db.collection('users').doc(uid).update({
    uploadCredits: FieldValue.increment(1)
  });
}

async function initUserCredits(uid, role) {
  const credits = INITIAL_CREDITS[role] ?? 0;
  await db.collection('users').doc(uid).update({ uploadCredits: credits });
}

module.exports = { createCase, updateCase, getCase, listCases, createReview, getReviews, spendUploadCredit, earnUploadCredit, initUserCredits };

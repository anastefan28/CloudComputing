const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
db.settings({ databaseId: 'medtriage-db' });

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role: decoded.role || 'patient'
    };
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
    }
    next();
  };
}

async function registerRole(req, res) {
  try {
    const { role } = req.body;
    if (!['patient', 'clinician'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be patient or clinician.' });
    }

    await admin.auth().setCustomUserClaims(req.user.uid, { role });

    const initialCredits = role === 'patient' ? 3 : 1;
    await db.collection('users').doc(req.user.uid).set({
      uid: req.user.uid,
      email: req.user.email,
      role,
      uploadCredits: initialCredits,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, role });
  } catch (err) {
    console.error('Register role error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { admin, verifyToken, requireRole, registerRole };

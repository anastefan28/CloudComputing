const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../services/auth');
const { getCase, updateCase, createReview, getReviews } = require('../services/firestore');

router.post('/:id/review', verifyToken, requireRole('clinician', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { findings, severity, signOff } = req.body;

    if (!findings || !severity) {
      return res.status(400).json({ error: 'findings and severity are required' });
    }
    if (!['normal', 'mild', 'moderate', 'severe'].includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity value' });
    }

    const caseData = await getCase(id);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const reviewData = {
      clinicianUid: req.user.uid,
      clinicianEmail: req.user.email,
      findings,
      severity,
      signOff: !!signOff,
      timestamp: new Date().toISOString()
    };

    const reviewId = await createReview(id, reviewData);

    if (signOff) {
      await updateCase(id, {
        status: 'signed_off',
        finalFindings: findings,
        finalSeverity: severity,
        reviewedBy: req.user.email,
        reviewedAt: new Date().toISOString()
      });
    } else {
      await updateCase(id, { status: 'reviewed' });
    }

    res.json({ success: true, reviewId, status: signOff ? 'signed_off' : 'reviewed' });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/escalate', verifyToken, requireRole('clinician', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const caseData = await getCase(id);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    await updateCase(id, {
      status: 'awaiting_radiologist',
      escalatedBy: req.user.email,
      escalatedAt: new Date().toISOString()
    });

    res.json({ success: true, status: 'awaiting_radiologist' });
  } catch (err) {
    console.error('Escalate error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/reviews', verifyToken, async (req, res) => {
  try {
    const reviews = await getReviews(req.params.id);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

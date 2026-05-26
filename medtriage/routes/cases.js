const express = require('express');
const router = express.Router();
const { getCase, listCases } = require('../services/firestore');
const { verifyToken } = require('../services/auth');
const cache = require('../services/cache');

router.get('/', verifyToken, async (req, res) => {
  try {
    console.log(`[cases] GET /api/cases — uid=${req.user.uid}, role=${req.user.role}, email=${req.user.email}`);
    res.set('Cache-Control', 'no-store');
    const cases = await listCases(req.user.uid, req.user.role);
    console.log(`[cases] Returning ${cases.length} cases`);
    res.json(cases);
  } catch (err) {
    console.error('[cases] List error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { id } = req.params;

    let caseData = await cache.getCase(id);

    if (!caseData) {
      caseData = await getCase(id);
      if (!caseData) return res.status(404).json({ error: 'Case not found' });
      await cache.setCase(id, caseData);
    }

    if (req.user.role === 'patient' && caseData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(caseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

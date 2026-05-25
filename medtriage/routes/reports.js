const express = require('express');
const router = express.Router();
const { verifyToken } = require('../services/auth');
const { getCase, getReviews } = require('../services/firestore');
const { generateReport } = require('../services/pdf');

router.get('/:id/report.pdf', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[PDF] Generating report for case ${id}`);
    const caseData = await getCase(id);

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (req.user.role === 'patient') {
      if (caseData.userId !== req.user.uid) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (caseData.status !== 'signed_off') {
        return res.status(403).json({ error: 'Report not yet available. Awaiting clinician sign-off.' });
      }
    } else {
      const allowedStatuses = ['complete', 'reviewed', 'signed_off'];
      if (!allowedStatuses.includes(caseData.status)) {
        return res.status(400).json({ error: 'Case analysis is not yet complete.' });
      }
    }

    let reviews = [];
    try {
      reviews = await getReviews(id);
    } catch (e) {
      // proceed without reviews
    }

    const pdfBuffer = await generateReport(caseData, reviews);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="MedTriageAI-Report-${id.substring(0, 8)}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;

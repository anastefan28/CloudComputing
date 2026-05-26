const express = require('express');
const router = express.Router();
const { verifyToken } = require('../services/auth');
const { getCase, getReviews } = require('../services/firestore');
const { generateReport } = require('../services/pdf');
const { uploadPDF, downloadPDF } = require('../services/storage');
const cache = require('../services/cache');

router.get('/:id/report.pdf', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[PDF] Request for case ${id}`);

    let caseData = await cache.getCase(id);
    if (!caseData) {
      caseData = await getCase(id);
      if (!caseData) return res.status(404).json({ error: 'Case not found' });
      await cache.setCase(id, caseData);
    }

    if (req.user.role === 'patient') {
      if (caseData.userId !== req.user.uid) return res.status(403).json({ error: 'Access denied' });
      if (caseData.status !== 'signed_off') return res.status(403).json({ error: 'Report not yet available. Awaiting clinician sign-off.' });
    } else {
      if (!['complete', 'reviewed', 'signed_off'].includes(caseData.status)) {
        return res.status(400).json({ error: 'Case analysis is not yet complete.' });
      }
    }

    const pdfHeaders = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="MedTriageAI-Report-${id.substring(0, 8)}.pdf"`
    };

    // Only cache PDFs for signed_off cases — content is final
    if (caseData.status === 'signed_off' && await cache.hasPdf(id)) {
      console.log(`[PDF] Cache hit for case ${id}`);
      const cached = await downloadPDF(id);
      if (cached) {
        res.set({ ...pdfHeaders, 'Content-Length': cached.length });
        return res.send(cached);
      }
    }

    let reviews = [];
    try { reviews = await getReviews(id); } catch { /* proceed without */ }

    const pdfBuffer = await generateReport(caseData, reviews);

    if (caseData.status === 'signed_off') {
      uploadPDF(id, pdfBuffer).then(() => cache.markPdf(id)).catch(err =>
        console.warn('[PDF] Background cache store failed:', err.message)
      );
    }

    res.set({ ...pdfHeaders, 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;

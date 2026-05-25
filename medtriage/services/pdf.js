const PDFDocument = require('pdfkit');

async function generateReport(caseData, reviews = []) {
  // Fetch heatmap from URL if needed (before starting PDF stream)
  let heatmapBuffer = null;
  if (caseData.heatmapUrl) {
    try {
      const resp = await fetch(caseData.heatmapUrl);
      const arrayBuf = await resp.arrayBuffer();
      heatmapBuffer = Buffer.from(arrayBuf);
    } catch (e) { /* skip heatmap */ }
  } else if (caseData.heatmap) {
    heatmapBuffer = Buffer.from(caseData.heatmap, 'base64');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `MedTriageAI Report - ${caseData.caseId}`,
        Author: 'MedTriageAI Platform',
        Subject: 'Chest X-Ray Triage Report'
      }
    });

    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold')
      .text('MedTriageAI', { align: 'center' });
    doc.fontSize(12).font('Helvetica')
      .text('Chest X-Ray Triage Report', { align: 'center' });
    doc.moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.5);

    // Case info
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
    const reportDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Report Generated: ${reportDate}`);
    doc.text(`Case ID: ${caseData.caseId}`);
    if (caseData.userEmail) {
      doc.text(`Patient: ${caseData.userEmail}`);
    }
    doc.moveDown(1);

    // Classification
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text('Classification');
    doc.moveDown(0.3);

    const classificationText = caseData.classification || 'N/A';
    const severityText = caseData.finalSeverity || caseData.severity || 'unknown';

    doc.fontSize(11).font('Helvetica').fillColor('#374151');
    doc.text(`Primary Classification: `, { continued: true })
      .font('Helvetica-Bold').text(classificationText);
    doc.font('Helvetica')
      .text(`Severity: `, { continued: true })
      .font('Helvetica-Bold').text(severityText.charAt(0).toUpperCase() + severityText.slice(1));
    doc.moveDown(1);

    // CheXNet scores
    if (caseData.chexnetTopFindings && caseData.chexnetTopFindings.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
        .text('CheXNet Pathology Scores');
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica').fillColor('#374151');
      caseData.chexnetTopFindings.forEach(f => {
        const pct = (f.score * 100).toFixed(1);
        const barWidth = Math.min(f.score * 200, 200);
        const y = doc.y;

        doc.text(`${f.name}: ${pct}%`, 50, y, { width: 200 });

        doc.rect(260, y + 2, 200, 10).fill('#e5e7eb');
        const barColor = f.score > 0.5 ? '#e74c3c' : f.score > 0.2 ? '#f59e0b' : '#2563eb';
        doc.rect(260, y + 2, barWidth, 10).fill(barColor);

        doc.fillColor('#374151');
        doc.moveDown(0.8);
      });
      doc.moveDown(0.5);
    }

    // Findings
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text('Findings');
    doc.moveDown(0.3);

    const findingsText = caseData.finalFindings || caseData.findings || 'No findings recorded.';
    doc.fontSize(10).font('Helvetica').fillColor('#374151')
      .text(findingsText, { align: 'justify' });
    doc.moveDown(1);

    // Explanation
    if (caseData.explanation) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
        .text('AI-Generated Explanation');
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica').fillColor('#374151')
        .text(caseData.explanation, { align: 'justify' });
      doc.moveDown(1);
    }

    // Conditions
    if (caseData.conditions && caseData.conditions.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
        .text('Detected Conditions');
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica').fillColor('#374151');
      caseData.conditions.forEach(c => {
        doc.text(`- ${c.name} — Confidence: ${c.confidence}, Location: ${c.location}${c.chexnetScore ? `, CheXNet: ${(c.chexnetScore * 100).toFixed(1)}%` : ''}`);
      });
      doc.moveDown(1);
    }

    // Grad-CAM heatmap
    if (heatmapBuffer) {
      if (doc.y > 600) doc.addPage();

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
        .text('Grad-CAM Heatmap');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
        .text(`Region of interest for: ${caseData.chexnetGradcamClass || 'top finding'}`);
      doc.moveDown(0.3);

      try {
        if (heatmapBuffer) {
          doc.image(heatmapBuffer, { width: 250 });
        }
      } catch (err) {
        doc.fontSize(9).fillColor('#991b1b').text('[Heatmap image could not be embedded]');
      }
      doc.moveDown(1);
    }

    // Clinician sign-off
    if (caseData.status === 'signed_off' && caseData.reviewedBy) {
      if (doc.y > 650) doc.addPage();

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
      doc.moveDown(0.5);

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
        .text('Clinician Sign-Off');
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica').fillColor('#374151');
      doc.text(`Reviewed and signed off by: ${caseData.reviewedBy}`);
      if (caseData.reviewedAt) {
        doc.text(`Date: ${new Date(caseData.reviewedAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })}`);
      }
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#6b7280')
        .text('This report has been reviewed and approved by the clinician above.');
      doc.moveDown(1);
    }

    // Disclaimer
    if (doc.y > 680) doc.addPage();

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.5);

    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#991b1b')
      .text(
        'DISCLAIMER: This report is generated by MedTriageAI, an AI-assisted decision support tool. ' +
        'It is NOT a medical diagnosis. The AI analysis (CheXNet + Gemini) provides probability-based ' +
        'assessments that must be interpreted by a qualified healthcare professional. This tool does not ' +
        'replace clinical judgement, physical examination, or formal radiological interpretation.',
        { align: 'justify' }
      );
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
      .text('MedTriageAI — Cloud Computing Final Project 2026', { align: 'center' });

    doc.end();
  });
}

module.exports = { generateReport };

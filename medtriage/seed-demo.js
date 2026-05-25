const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: 'medtriage-db' });

const DEMO_PATIENT_EMAIL = 'patient@demo.medtriage.ai';
const DEMO_CLINICIAN_EMAIL = 'clinician@demo.medtriage.ai';

// We'll set userId later if real users exist, or use placeholder IDs
const PATIENT_UID = 'demo-patient-001';
const CLINICIAN_UID = 'demo-clinician-001';

const SAMPLE_IMAGE_URL = 'https://storage.googleapis.com/medtriage-images/uploads/';

const cases = [
  {
    status: 'complete',
    classification: 'Cardiomegaly',
    severity: 'moderate',
    visionLabels: [
      { description: 'X-ray', score: 0.97 },
      { description: 'Medical imaging', score: 0.95 },
      { description: 'Thorax', score: 0.91 },
      { description: 'Chest', score: 0.89 },
      { description: 'Radiography', score: 0.86 }
    ],
    chexnetScores: {
      'Cardiomegaly': 0.847, 'Effusion': 0.312, 'Atelectasis': 0.198,
      'Infiltration': 0.156, 'Nodule': 0.089, 'Mass': 0.067,
      'Pneumothorax': 0.034, 'Consolidation': 0.112, 'Edema': 0.245,
      'Emphysema': 0.023, 'Fibrosis': 0.045, 'Pleural_Thickening': 0.078,
      'Hernia': 0.012, 'Pneumonia': 0.067
    },
    chexnetTopFindings: [
      { name: 'Cardiomegaly', score: 0.847 },
      { name: 'Effusion', score: 0.312 },
      { name: 'Edema', score: 0.245 },
      { name: 'Atelectasis', score: 0.198 },
      { name: 'Infiltration', score: 0.156 }
    ],
    chexnetGradcamClass: 'Cardiomegaly',
    conditions: [
      { name: 'Cardiomegaly', confidence: 'high', location: 'cardiac silhouette', chexnetScore: 0.847 },
      { name: 'Pleural Effusion', confidence: 'medium', location: 'bilateral costophrenic angles', chexnetScore: 0.312 },
      { name: 'Pulmonary Edema', confidence: 'low', location: 'bilateral perihilar', chexnetScore: 0.245 }
    ],
    findings: 'The cardiac silhouette is significantly enlarged with a cardiothoracic ratio exceeding 0.6, consistent with cardiomegaly (CheXNet score: 84.7%). There is blunting of bilateral costophrenic angles suggesting small bilateral pleural effusions (31.2%). Mild perihilar haziness may indicate early pulmonary edema (24.5%). The mediastinal contour is within normal limits. No pneumothorax is identified. Osseous structures are unremarkable.',
    explanation: 'The AI analysis has identified an enlarged heart as the primary finding, with high confidence (84.7% CheXNet score). This is commonly seen in conditions such as heart failure, valvular disease, or cardiomyopathy. There are also signs of mild fluid accumulation around the lungs (pleural effusions) which can be associated with heart failure. The Grad-CAM heatmap highlights the cardiac region, confirming the model focused on the correct anatomical area. This is an AI-assisted analysis for decision support only and should not replace clinical judgement.',
    hoursAgo: 2
  },
  {
    status: 'signed_off',
    classification: 'Pneumonia',
    severity: 'severe',
    visionLabels: [
      { description: 'X-ray', score: 0.96 },
      { description: 'Medical imaging', score: 0.94 },
      { description: 'Lung', score: 0.88 },
      { description: 'Chest', score: 0.85 },
      { description: 'Radiograph', score: 0.82 }
    ],
    chexnetScores: {
      'Pneumonia': 0.912, 'Consolidation': 0.756, 'Infiltration': 0.634,
      'Effusion': 0.289, 'Atelectasis': 0.178, 'Cardiomegaly': 0.098,
      'Nodule': 0.045, 'Mass': 0.034, 'Pneumothorax': 0.012,
      'Edema': 0.167, 'Emphysema': 0.015, 'Fibrosis': 0.056,
      'Pleural_Thickening': 0.089, 'Hernia': 0.008
    },
    chexnetTopFindings: [
      { name: 'Pneumonia', score: 0.912 },
      { name: 'Consolidation', score: 0.756 },
      { name: 'Infiltration', score: 0.634 },
      { name: 'Effusion', score: 0.289 },
      { name: 'Atelectasis', score: 0.178 }
    ],
    chexnetGradcamClass: 'Pneumonia',
    conditions: [
      { name: 'Pneumonia', confidence: 'high', location: 'right lower lobe', chexnetScore: 0.912 },
      { name: 'Consolidation', confidence: 'high', location: 'right lower lobe', chexnetScore: 0.756 },
      { name: 'Infiltration', confidence: 'medium', location: 'right middle and lower lobes', chexnetScore: 0.634 }
    ],
    findings: 'Dense consolidation is identified in the right lower lobe with air bronchograms, highly suggestive of lobar pneumonia (CheXNet Pneumonia score: 91.2%, Consolidation: 75.6%). There is associated infiltrative opacity extending to the right middle lobe (63.4%). Small right-sided pleural effusion noted (28.9%). The left lung is clear. Heart size is normal. No pneumothorax.',
    explanation: 'The AI has detected a high probability of pneumonia in the right lung, particularly the lower lobe, with a very high confidence score of 91.2%. The consolidation pattern (dense white area) is typical of bacterial pneumonia. There is also fluid around the right lung which can accompany severe pneumonia. This patient may require urgent clinical assessment and antibiotic therapy. This is an AI-assisted analysis for decision support only.',
    finalFindings: 'Confirmed right lower lobe pneumonia with parapneumonic effusion. Recommend IV antibiotics and follow-up imaging in 48-72 hours. Patient admitted to ward.',
    finalSeverity: 'severe',
    reviewedBy: DEMO_CLINICIAN_EMAIL,
    reviewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    hoursAgo: 5
  },
  {
    status: 'complete',
    classification: 'Normal',
    severity: 'normal',
    visionLabels: [
      { description: 'X-ray', score: 0.98 },
      { description: 'Medical imaging', score: 0.95 },
      { description: 'Thorax', score: 0.92 },
      { description: 'Chest', score: 0.90 },
      { description: 'Radiography', score: 0.87 }
    ],
    chexnetScores: {
      'Atelectasis': 0.078, 'Cardiomegaly': 0.045, 'Effusion': 0.034,
      'Infiltration': 0.089, 'Mass': 0.023, 'Nodule': 0.056,
      'Pneumonia': 0.032, 'Pneumothorax': 0.011, 'Consolidation': 0.028,
      'Edema': 0.019, 'Emphysema': 0.014, 'Fibrosis': 0.037,
      'Pleural_Thickening': 0.041, 'Hernia': 0.006
    },
    chexnetTopFindings: [
      { name: 'Infiltration', score: 0.089 },
      { name: 'Atelectasis', score: 0.078 },
      { name: 'Nodule', score: 0.056 },
      { name: 'Cardiomegaly', score: 0.045 },
      { name: 'Pleural_Thickening', score: 0.041 }
    ],
    chexnetGradcamClass: 'Infiltration',
    conditions: [
      { name: 'Normal', confidence: 'high', location: 'bilateral lung fields', chexnetScore: 0.0 }
    ],
    findings: 'The lungs are clear bilaterally with no focal consolidation, effusion, or pneumothorax. Heart size and mediastinal contour are within normal limits. The costophrenic angles are sharp. All CheXNet pathology scores are below the 10% threshold, indicating no significant abnormality detected. The trachea is midline. Osseous structures appear intact.',
    explanation: 'The AI analysis shows no significant abnormalities in this chest X-ray. All pathology probability scores from CheXNet are very low (below 10%), which strongly suggests a normal study. The lungs appear clear, the heart is normal size, and no fluid or air leak is detected. This is an AI-assisted analysis for decision support only and should not replace clinical judgement.',
    hoursAgo: 24
  },
  {
    status: 'complete',
    classification: 'Pleural Effusion',
    severity: 'moderate',
    visionLabels: [
      { description: 'X-ray', score: 0.96 },
      { description: 'Medical imaging', score: 0.93 },
      { description: 'Thorax', score: 0.89 },
      { description: 'Lung', score: 0.84 },
      { description: 'Chest', score: 0.81 }
    ],
    chexnetScores: {
      'Effusion': 0.823, 'Atelectasis': 0.345, 'Infiltration': 0.234,
      'Cardiomegaly': 0.178, 'Consolidation': 0.156, 'Pneumonia': 0.089,
      'Nodule': 0.045, 'Mass': 0.034, 'Pneumothorax': 0.023,
      'Edema': 0.198, 'Emphysema': 0.012, 'Fibrosis': 0.067,
      'Pleural_Thickening': 0.234, 'Hernia': 0.009
    },
    chexnetTopFindings: [
      { name: 'Effusion', score: 0.823 },
      { name: 'Atelectasis', score: 0.345 },
      { name: 'Pleural_Thickening', score: 0.234 },
      { name: 'Infiltration', score: 0.234 },
      { name: 'Edema', score: 0.198 }
    ],
    chexnetGradcamClass: 'Effusion',
    conditions: [
      { name: 'Pleural Effusion', confidence: 'high', location: 'left costophrenic angle', chexnetScore: 0.823 },
      { name: 'Atelectasis', confidence: 'medium', location: 'left lower lobe', chexnetScore: 0.345 },
      { name: 'Pleural Thickening', confidence: 'low', location: 'left lateral', chexnetScore: 0.234 }
    ],
    findings: 'There is a moderate left-sided pleural effusion with meniscus sign at the costophrenic angle (CheXNet Effusion score: 82.3%). Associated passive atelectasis of the left lower lobe is noted (34.5%). Mild left-sided pleural thickening (23.4%). The right lung is clear. Cardiac silhouette is at the upper limit of normal. No pneumothorax.',
    explanation: 'The AI has detected a significant amount of fluid around the left lung (pleural effusion) with 82.3% confidence. This fluid is causing part of the left lower lung to collapse (atelectasis). Pleural effusions can be caused by heart failure, infection, or other conditions. Clinical correlation and possibly a diagnostic thoracentesis may be warranted. This is an AI-assisted analysis for decision support only.',
    hoursAgo: 8
  },
  {
    status: 'awaiting_radiologist',
    classification: 'Mass',
    severity: 'severe',
    visionLabels: [
      { description: 'X-ray', score: 0.95 },
      { description: 'Medical imaging', score: 0.92 },
      { description: 'Lung', score: 0.87 },
      { description: 'Thorax', score: 0.84 }
    ],
    chexnetScores: {
      'Mass': 0.678, 'Nodule': 0.534, 'Infiltration': 0.289,
      'Atelectasis': 0.234, 'Effusion': 0.189, 'Consolidation': 0.145,
      'Cardiomegaly': 0.078, 'Pneumonia': 0.056, 'Pneumothorax': 0.023,
      'Edema': 0.034, 'Emphysema': 0.045, 'Fibrosis': 0.089,
      'Pleural_Thickening': 0.112, 'Hernia': 0.007
    },
    chexnetTopFindings: [
      { name: 'Mass', score: 0.678 },
      { name: 'Nodule', score: 0.534 },
      { name: 'Infiltration', score: 0.289 },
      { name: 'Atelectasis', score: 0.234 },
      { name: 'Effusion', score: 0.189 }
    ],
    chexnetGradcamClass: 'Mass',
    conditions: [
      { name: 'Pulmonary Mass', confidence: 'high', location: 'right upper lobe', chexnetScore: 0.678 },
      { name: 'Pulmonary Nodule', confidence: 'high', location: 'right upper lobe', chexnetScore: 0.534 },
      { name: 'Atelectasis', confidence: 'low', location: 'right upper lobe', chexnetScore: 0.234 }
    ],
    findings: 'A large opacity is identified in the right upper lobe measuring approximately 4cm, concerning for a pulmonary mass (CheXNet Mass score: 67.8%, Nodule: 53.4%). Associated right upper lobe atelectasis (23.4%). Small right pleural effusion (18.9%). The left lung appears clear. This finding requires urgent further evaluation with CT imaging.',
    explanation: 'The AI has detected a concerning large opacity in the right upper lung that may represent a mass or tumor. Both the mass and nodule scores are elevated. This finding requires urgent attention and follow-up with CT scan for further characterization. This case has been escalated to a radiologist for expert review. This is an AI-assisted analysis for decision support only.',
    escalatedBy: DEMO_CLINICIAN_EMAIL,
    escalatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    hoursAgo: 6
  },
  {
    status: 'error',
    hoursAgo: 1,
    errorMsg: 'CheXNet error 503: Service temporarily unavailable (cold start timeout after 3 retries)'
  }
];

async function seed() {
  console.log('Seeding demo data...\n');

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const caseId = uuidv4();
    const timestamp = new Date(Date.now() - c.hoursAgo * 60 * 60 * 1000);

    const doc = {
      caseId,
      status: c.status,
      userId: PATIENT_UID,
      userEmail: DEMO_PATIENT_EMAIL,
      imageGcsUri: `gs://medtriage-images/uploads/${caseId}.jpg`,
      imageUrl: `${SAMPLE_IMAGE_URL}${caseId}.jpg`,
      timestamp: admin.firestore.Timestamp.fromDate(timestamp)
    };

    if (c.visionLabels) doc.visionLabels = c.visionLabels;
    if (c.chexnetScores) doc.chexnetScores = c.chexnetScores;
    if (c.chexnetTopFindings) doc.chexnetTopFindings = c.chexnetTopFindings;
    if (c.chexnetGradcamClass) doc.chexnetGradcamClass = c.chexnetGradcamClass;
    if (c.conditions) doc.conditions = c.conditions;
    if (c.classification) doc.classification = c.classification;
    if (c.severity) doc.severity = c.severity;
    if (c.findings) doc.findings = c.findings;
    if (c.explanation) doc.explanation = c.explanation;
    if (c.finalFindings) doc.finalFindings = c.finalFindings;
    if (c.finalSeverity) doc.finalSeverity = c.finalSeverity;
    if (c.reviewedBy) doc.reviewedBy = c.reviewedBy;
    if (c.reviewedAt) doc.reviewedAt = c.reviewedAt;
    if (c.escalatedBy) doc.escalatedBy = c.escalatedBy;
    if (c.escalatedAt) doc.escalatedAt = c.escalatedAt;
    if (c.errorMsg) doc.error = c.errorMsg;

    await db.collection('cases').doc(caseId).set(doc);

    // Add a review for the signed_off case
    if (c.status === 'signed_off') {
      await db.collection('cases').doc(caseId).collection('reviews').doc(uuidv4()).set({
        clinicianUid: CLINICIAN_UID,
        clinicianEmail: DEMO_CLINICIAN_EMAIL,
        findings: c.finalFindings,
        severity: c.finalSeverity,
        signOff: true,
        timestamp: c.reviewedAt
      });
    }

    const label = c.classification || c.status;
    console.log(`  [${i + 1}/${cases.length}] ${label.padEnd(20)} status=${c.status.padEnd(15)} id=${caseId.substring(0, 8)}...`);
  }

  console.log('\nDone! Created 6 demo cases:');
  console.log('  - 1x Cardiomegaly (complete, moderate)');
  console.log('  - 1x Pneumonia (signed_off, severe)');
  console.log('  - 1x Normal (complete, normal)');
  console.log('  - 1x Pleural Effusion (complete, moderate)');
  console.log('  - 1x Mass (awaiting_radiologist, severe)');
  console.log('  - 1x Error (CheXNet cold start timeout)');
  console.log('\nNote: These use placeholder user IDs. To see them in the dashboard,');
  console.log('register real accounts and update userId fields, or login as clinician to see all.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

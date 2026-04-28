const express = require('express');
const router = express.Router();
// Modificat: Importăm din noul fișier cosmos.js în loc de firestore.js
const { getCase } = require('../services/cosmos');

router.get('/:id', async (req, res) => {
  try {
    const caseData = await getCase(req.params.id); //
    if (!caseData) return res.status(404).json({ error: 'Case not found' }); //
    res.json(caseData); //
  } catch (err) {
    res.status(500).json({ error: err.message }); //
  }
});

module.exports = router; //
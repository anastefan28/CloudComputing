const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/upload', require('./routes/upload'));
app.use('/api/cases', require('./routes/cases'));

app.get('/case/:id', (req, res) => {
  res.sendFile(__dirname + '/public/result.html');
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MedTriageAI running on port ${PORT}`));
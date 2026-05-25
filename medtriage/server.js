const express = require('express');
const cors = require('cors');
const { verifyToken, registerRole } = require('./services/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Auth API
app.post('/api/auth/register-role', verifyToken, registerRole);

// Case-related APIs (more specific paths first)
app.use('/api/cases', require('./routes/reports'));   // /:id/report.pdf
app.use('/api/cases', require('./routes/reviews'));   // /:id/review, /:id/escalate, /:id/reviews
app.use('/api/cases', require('./routes/cases'));     // / and /:id
app.use('/api/upload', require('./routes/upload'));

// Page routes
app.get('/login', (req, res) => res.sendFile(__dirname + '/public/login.html'));
app.get('/dashboard', (req, res) => res.sendFile(__dirname + '/public/dashboard.html'));
app.get('/case/:id', (req, res) => res.sendFile(__dirname + '/public/result.html'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

process.on('uncaughtException', (err) => console.error('UNCAUGHT:', err));
process.on('unhandledRejection', (err) => console.error('UNHANDLED:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MedTriageAI running on port ${PORT}`));

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db/init');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend applications (specifically accommodating WebView requests originating from file:// origins)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express parser middleware for json requests
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
const financeRoutes = require('./routes/financeRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const backupRoutes = require('./routes/backupRoutes');
const auditRoutes = require('./routes/auditRoutes');

const generalRoutes = require('./routes/generalRoutes');

// Health check endpoint (public, declared before authentication-protected routes)
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Laos EPC Backend Server is running.', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/procurements', procurementRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api', generalRoutes);

// Setup static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database schema and seeds, then start server
async function startServer() {
    try {
        await initializeDatabase();
        const HOST = '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log(`==================================================`);
            console.log(`Laos EPC API Server started on http://${HOST}:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
            console.log(`==================================================`);
        });
    } catch (err) {
        console.error('Failed to initialize application database. Terminating.', err);
        process.exit(1);
    }
}

startServer();

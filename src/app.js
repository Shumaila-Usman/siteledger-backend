require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const errorMiddleware = require('./middleware/errorMiddleware');
const connectDB = require('./config/db');
const { shouldUseLocalUploads } = require('./middleware/uploadMiddleware');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const teamRoutes = require('./routes/teamRoutes');
const categoryEntityRoutes = require('./routes/categoryEntityRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// ── 1. Health & favicon — registered FIRST, no DB / uploads / auth required ──
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'SiteLedger API is running' });
});
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SiteLedger API is running' });
});
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// ── 2. Global middleware ──
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 3. Serverless-friendly DB connect for all API routes ──
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ── 4. API routes ──
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', teamRoutes);
app.use('/api/entities', categoryEntityRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);

// ── 5. Static uploads — local development only (never on Vercel / production) ──
if (shouldUseLocalUploads) {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}

// ── 6. Error handler ──
app.use(errorMiddleware);

module.exports = app;


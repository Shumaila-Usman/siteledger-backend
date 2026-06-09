require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// ── CORS & body parsing ────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health & favicon (also in api/index.js for Vercel crash safety) ────────
app.get('/health', (req, res) => res.json({ success: true, message: 'SiteLedger API is running' }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'SiteLedger API is running' }));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// ── DB connect — per-request, serverless-friendly ──────────────────────────
const connectDB = require('./config/db');
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/projects', require('./routes/teamRoutes'));
app.use('/api/entities', require('./routes/categoryEntityRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// ── Static uploads — local dev only ───────────────────────────────────────
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isProduction = process.env.NODE_ENV === 'production';
if (process.env.USE_CLOUDINARY !== 'true' && !isVercel && !isProduction) {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}

// ── Error handler ─────────────────────────────────────────────────────────
app.use(require('./middleware/errorMiddleware'));

module.exports = app;


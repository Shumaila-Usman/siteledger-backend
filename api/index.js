// Vercel serverless entry point
// Health routes are defined HERE — before requiring the app — so they survive
// any crash during app module initialization.

require('dotenv').config();
const express = require('express');

// Prevent unhandled promise rejections from crashing the serverless function
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const handler = express();

// ── Guaranteed-up health routes ────────────────────────────────────────────
handler.get('/health', (req, res) =>
  res.json({ success: true, message: 'SiteLedger API is running' })
);
handler.get('/api/health', (req, res) =>
  res.json({ success: true, message: 'SiteLedger API is running' })
);
handler.get('/favicon.ico', (req, res) => res.status(204).end());
handler.get('/favicon.png', (req, res) => res.status(204).end());

// ── Load the main app — crash here does NOT affect health routes above ─────
try {
  const app = require('../src/app');
  handler.use(app);
} catch (err) {
  console.error('App initialization error:', err);
  handler.use((req, res) => {
    res.status(500).json({
      success: false,
      message: 'Server initialization failed',
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  });
}

module.exports = handler;

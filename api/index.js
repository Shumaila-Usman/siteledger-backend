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

// ── Temporary: debug Cloudinary env vars on Vercel ────────────────────────
handler.get('/api/debug-cloudinary', (req, res) => {
  res.json({
    USE_CLOUDINARY: process.env.USE_CLOUDINARY,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '✓ SET' : '✗ MISSING',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '✓ SET' : '✗ MISSING',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '✓ SET' : '✗ MISSING',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  });
});

handler.get('/api/test-cloudinary', async (req, res) => {
  try {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const result = await cloudinary.api.ping();
    res.json({ success: true, message: 'Cloudinary connected', result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, http_code: err.http_code });
  }
});

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

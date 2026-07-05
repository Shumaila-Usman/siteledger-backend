// Vercel serverless entry point
require('dotenv').config();
const express = require('express');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const handler = express();

// ── Health ─────────────────────────────────────────────────────────────────
handler.get('/health', (req, res) =>
  res.json({ success: true, message: 'SiteLedger API is running' })
);
handler.get('/api/health', (req, res) =>
  res.json({ success: true, message: 'SiteLedger API is running' })
);
handler.get('/favicon.ico', (req, res) => res.status(204).end());
handler.get('/favicon.png', (req, res) => res.status(204).end());

// ── Debug: check env vars ──────────────────────────────────────────────────
handler.get('/api/debug-env', (req, res) => {
  res.json({
    GMAIL_USER: process.env.GMAIL_USER ? '✓ SET' : '✗ MISSING',
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? '✓ SET' : '✗ MISSING',
    USE_CLOUDINARY: process.env.USE_CLOUDINARY,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '✓ SET' : '✗ MISSING',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '✓ SET' : '✗ MISSING',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '✓ SET' : '✗ MISSING',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  });
});

// ── Test Cloudinary connection ─────────────────────────────────────────────
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

// ── Test Gmail SMTP ────────────────────────────────────────────────────────
handler.get('/api/test-email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      return res.status(500).json({ success: false, message: `Missing: GMAIL_USER=${!!user} GMAIL_APP_PASSWORD=${!!pass}` });
    }
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await transporter.verify();
    res.json({ success: true, message: 'Gmail SMTP connected', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

// ── Load the main app ──────────────────────────────────────────────────────
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

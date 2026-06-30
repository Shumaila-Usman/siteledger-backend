const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail SMTP not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

const sendOtpEmail = async (toEmail, otp) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"SiteLedger" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your SiteLedger Password Reset OTP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#F5B528;margin:0 0 8px">SiteLedger</h2>
        <p style="color:#6B7280;font-size:13px;margin:0 0 24px">Construction Finance</p>
        <h3 style="color:#111827;margin:0 0 16px">Password Reset OTP</h3>
        <p style="color:#374151;margin:0 0 24px">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#FEF9EE;border:2px solid #F5B528;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px">
          <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#F5B528">${otp}</span>
        </div>
        <p style="color:#6B7280;font-size:12px;margin:0">If you did not request a password reset, ignore this email. Your account is safe.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };

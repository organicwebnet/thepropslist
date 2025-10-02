// Simple CommonJS version of password reset function
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Admin SDK
if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

// Simple password reset function
exports.sendCustomPasswordResetEmailV2 = onCall({ 
  region: "us-central1",
  secrets: ["GMAIL_USER", "GMAIL_PASS"]
}, async (req) => {
  try {
    const { email, locale = 'en' } = req.data || {};
    
    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }

    logger.info("Password reset request for email:", email);

    // Get secrets
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_PASS;

    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new functions.https.HttpsError('internal', 'Email service not configured');
    }

    // Generate a simple reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Create the reset URL
    const resetUrl = `https://app.thepropslist.uk/reset-password?token=${resetToken}`;
    
    // Simple email content
    const subject = "Reset Your Password - The Props List";
    const html = `
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    const text = `Reset your password by visiting: ${resetUrl}`;

    // Send email using Gmail SMTP
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"The Props List" <${GMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html,
      text: text
    };

    await transporter.sendMail(mailOptions);
    logger.info("Password reset email sent successfully to:", email);
    
    return { success: true, message: "Password reset email sent successfully" };
    
  } catch (error) {
    logger.error("Password reset error:", error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to send password reset email: ${error.message}`);
  }
});

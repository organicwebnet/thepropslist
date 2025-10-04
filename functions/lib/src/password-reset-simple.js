"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCustomPasswordResetEmailV3 = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
// Initialize Admin SDK
if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp();
}
// Simple password reset function
exports.sendCustomPasswordResetEmailV3 = (0, https_1.onCall)({
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
        firebase_functions_1.logger.info("Password reset request for email:", email);
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
        const transporter = nodemailer.createTransport({
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
        firebase_functions_1.logger.info("Password reset email sent successfully to:", email);
        return { success: true, message: "Password reset email sent successfully" };
    }
    catch (error) {
        firebase_functions_1.logger.error("Password reset error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

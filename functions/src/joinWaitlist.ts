import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Initialize Admin SDK
if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

interface WaitlistData {
  name?: string;
  email: string;
}

export const joinWaitlist = onRequest(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    secrets: ['GMAIL_USER', 'GMAIL_PASS'],
  },
  async (request, response) => {
    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const data: WaitlistData = request.body;
      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';

      // Basic validation
      if (!data.email) {
        response.status(400).json({ ok: false, error: 'Email is required' });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        response.status(400).json({ ok: false, error: 'Invalid email address' });
        return;
      }

      // Name validation (optional but if provided, validate)
      if (data.name && (data.name.length < 2 || data.name.length > 100)) {
        response.status(400).json({ ok: false, error: 'Invalid name' });
        return;
      }

      // Rate limiting check (basic IP-based)
      const rateLimitKey = `waitlist_rate_limit_${ipAddress}`;
      const rateLimitRef = admin.firestore().collection('rateLimits').doc(rateLimitKey);
      
      const rateLimitDoc = await rateLimitRef.get();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (rateLimitDoc.exists) {
        const rateLimitData = rateLimitDoc.data();
        const lastSubmission = rateLimitData?.lastSubmission || 0;
        const submissionCount = rateLimitData?.count || 0;

        // Reset count if more than 1 hour has passed
        if (now - lastSubmission > oneHour) {
          await rateLimitRef.set({
            count: 1,
            lastSubmission: now,
          });
        } else if (submissionCount >= 5) {
          // Allow max 5 submissions per hour
          response.status(429).json({ ok: false, error: 'Too many submissions. Please try again later.' });
          return;
        } else {
          await rateLimitRef.update({
            count: admin.firestore.FieldValue.increment(1),
            lastSubmission: now,
          });
        }
      } else {
        await rateLimitRef.set({
          count: 1,
          lastSubmission: now,
        });
      }

      // Get Gmail secrets
      const GMAIL_USER = process.env.GMAIL_USER;
      const GMAIL_PASS = process.env.GMAIL_PASS;

      if (!GMAIL_USER || !GMAIL_PASS) {
        logger.error('Gmail credentials not configured');
        response.status(500).json({ ok: false, error: 'Email service not configured' });
        return;
      }

      // Prepare email data
      const name = data.name?.trim() || 'Not provided';
      const email = data.email.trim().toLowerCase();
      const timestamp = new Date().toISOString();

      // Create email content
      const subject = 'New Closed Beta Access Request - The Props List';
      const html = `
        <h2>New Closed Beta Access Request</h2>
        <p>A new request has been submitted through the marketing website.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Timestamp:</strong> ${timestamp}</p>
        <p><strong>IP Address:</strong> ${ipAddress}</p>
        <p><strong>User Agent:</strong> ${userAgent}</p>
        <p><strong>Source:</strong> Marketing Site - Closed Beta Form</p>
      `;
      const text = `
New Closed Beta Access Request

A new request has been submitted through the marketing website.

Name: ${name}
Email: ${email}
Timestamp: ${timestamp}
IP Address: ${ipAddress}
User Agent: ${userAgent}
Source: Marketing Site - Closed Beta Form
      `;

      // Send email using Gmail SMTP
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"The Props List" <${GMAIL_USER}>`,
        to: 'organicwebnet@gmail.com',
        subject: subject,
        html: html,
        text: text,
      };

      await transporter.sendMail(mailOptions);
      logger.info('Closed beta access request email sent successfully', {
        email,
        name,
        ipAddress,
      });

      // Store the submission in Firestore for record keeping
      try {
        await admin.firestore().collection('waitlistSubmissions').add({
          name: name,
          email: email,
          timestamp: admin.firestore.Timestamp.now(),
          ipAddress,
          userAgent,
          source: 'marketing_site',
          status: 'new',
        });
      } catch (dbError) {
        // Log but don't fail if database write fails
        logger.error('Failed to store waitlist submission', dbError);
      }

      response.status(200).json({
        ok: true,
        message: 'Thank you! We will be in touch.',
      });

    } catch (error) {
      logger.error('Join waitlist error:', error);
      response.status(500).json({
        ok: false,
        error: 'Internal server error. Please try again later.',
      });
    }
  }
);

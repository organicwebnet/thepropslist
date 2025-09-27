import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  captcha: string;
  newsletter?: boolean;
  website?: string; // honeypot field
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  newsletter: boolean;
  timestamp: admin.firestore.Timestamp;
  ipAddress: string;
  userAgent: string;
  status: 'new' | 'read' | 'replied' | 'archived';
}

export const submitContactForm = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request, response) => {
    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const data: ContactFormData = request.body;
      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';

      // Basic validation
      if (!data.name || !data.email || !data.subject || !data.message) {
        response.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Honeypot check - if website field is filled, it's likely spam
      if (data.website && data.website.trim() !== '') {
        logger.warn('Spam detected - honeypot field filled', { ipAddress, userAgent });
        response.status(200).json({ success: true, message: 'Message received' });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        response.status(400).json({ error: 'Invalid email address' });
        return;
      }

      // Name validation (basic)
      if (data.name.length < 2 || data.name.length > 100) {
        response.status(400).json({ error: 'Invalid name' });
        return;
      }

      // Message validation
      if (data.message.length < 10 || data.message.length > 2000) {
        response.status(400).json({ error: 'Message must be between 10 and 2000 characters' });
        return;
      }

      // Subject validation
      const validSubjects = ['general', 'support', 'feedback', 'partnership', 'press', 'other'];
      if (!validSubjects.includes(data.subject)) {
        response.status(400).json({ error: 'Invalid subject' });
        return;
      }

      // Rate limiting check (basic IP-based)
      const rateLimitKey = `contact_rate_limit_${ipAddress}`;
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
          response.status(429).json({ error: 'Too many submissions. Please try again later.' });
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

      // Store the contact submission
      const submission: Omit<ContactSubmission, 'id'> = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        subject: data.subject,
        message: data.message.trim(),
        newsletter: Boolean(data.newsletter),
        timestamp: admin.firestore.Timestamp.now(),
        ipAddress,
        userAgent,
        status: 'new',
      };

      const docRef = await admin.firestore().collection('contactSubmissions').add(submission);

      // If user opted in for newsletter, add them to the newsletter list
      if (data.newsletter) {
        try {
          await admin.firestore().collection('newsletterSubscribers').doc(data.email.trim().toLowerCase()).set({
            email: data.email.trim().toLowerCase(),
            name: data.name.trim(),
            subscribedAt: admin.firestore.Timestamp.now(),
            source: 'contact_form',
            status: 'active',
          });
        } catch (error) {
          logger.error('Failed to add to newsletter', error);
          // Don't fail the contact form submission if newsletter signup fails
        }
      }

      // Send notification email (optional - you can implement this with SendGrid, etc.)
      // For now, we'll just log it
      logger.info('New contact form submission', {
        id: docRef.id,
        name: data.name,
        email: data.email,
        subject: data.subject,
        ipAddress,
      });

      response.status(200).json({
        success: true,
        message: 'Thank you! Your message has been sent successfully.',
        id: docRef.id,
      });

    } catch (error) {
      logger.error('Contact form submission error', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  }
);

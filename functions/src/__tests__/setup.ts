import { vi } from 'vitest';

// Mock environment variables
process.env.GCLOUD_PROJECT = 'test-project';
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'test-project',
  storageBucket: 'test-project.appspot.com'
});

// Mock Firebase Admin initialization
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: vi.fn(),
  auth: vi.fn(() => ({
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    verifyIdToken: vi.fn()
  }))
}));

// Mock Firebase Functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((config, handler) => handler),
  onRequest: vi.fn((config, handler) => handler)
}));

vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: vi.fn((config, handler) => handler)
}));

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((config, handler) => handler)
}));

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
}));

// Mock nodemailer
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn()
  }))
}));

// Mock Stripe
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    customers: {
      retrieve: vi.fn(),
      create: vi.fn()
    },
    subscriptions: {
      create: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn()
    }
  }))
}));

// Mock cross-fetch
vi.mock('cross-fetch', () => ({
  default: vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  }))
}));

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(() => Promise.resolve(Buffer.from('mock-image-data')))
  }))
}));

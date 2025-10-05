"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock environment variables
process.env.GCLOUD_PROJECT = 'test-project';
process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: 'test-project',
    storageBucket: 'test-project.appspot.com'
});
// Mock Firebase Admin initialization
vitest_1.vi.mock('firebase-admin', () => ({
    initializeApp: vitest_1.vi.fn(),
    firestore: vitest_1.vi.fn(),
    auth: vitest_1.vi.fn(() => ({
        getUserByEmail: vitest_1.vi.fn(),
        createUser: vitest_1.vi.fn(),
        verifyIdToken: vitest_1.vi.fn()
    }))
}));
// Mock Firebase Functions
vitest_1.vi.mock('firebase-functions/v2/https', () => ({
    onCall: vitest_1.vi.fn((config, handler) => handler),
    onRequest: vitest_1.vi.fn((config, handler) => handler)
}));
vitest_1.vi.mock('firebase-functions/v2/firestore', () => ({
    onDocumentCreated: vitest_1.vi.fn((config, handler) => handler)
}));
vitest_1.vi.mock('firebase-functions/v2/scheduler', () => ({
    onSchedule: vitest_1.vi.fn((config, handler) => handler)
}));
vitest_1.vi.mock('firebase-functions/logger', () => ({
    info: vitest_1.vi.fn(),
    error: vitest_1.vi.fn(),
    warn: vitest_1.vi.fn(),
    debug: vitest_1.vi.fn()
}));
// Mock nodemailer
vitest_1.vi.mock('nodemailer', () => ({
    createTransport: vitest_1.vi.fn(() => ({
        sendMail: vitest_1.vi.fn()
    }))
}));
// Mock Stripe
vitest_1.vi.mock('stripe', () => ({
    default: vitest_1.vi.fn(() => ({
        customers: {
            retrieve: vitest_1.vi.fn(),
            create: vitest_1.vi.fn()
        },
        subscriptions: {
            create: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
            cancel: vitest_1.vi.fn()
        }
    }))
}));
// Mock cross-fetch
vitest_1.vi.mock('cross-fetch', () => ({
    default: vitest_1.vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
    }))
}));
// Mock sharp
vitest_1.vi.mock('sharp', () => ({
    default: vitest_1.vi.fn(() => ({
        resize: vitest_1.vi.fn().mockReturnThis(),
        jpeg: vitest_1.vi.fn().mockReturnThis(),
        png: vitest_1.vi.fn().mockReturnThis(),
        webp: vitest_1.vi.fn().mockReturnThis(),
        toBuffer: vitest_1.vi.fn(() => Promise.resolve(Buffer.from('mock-image-data')))
    }))
}));

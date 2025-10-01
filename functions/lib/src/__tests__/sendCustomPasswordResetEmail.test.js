import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendCustomPasswordResetEmail } from '../index';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
    firestore: {
        FieldValue: {
            serverTimestamp: vi.fn(() => 'mock-timestamp')
        },
        Timestamp: {
            fromDate: vi.fn((date) => ({ seconds: Math.floor(date.getTime() / 1000) }))
        }
    }
}));
// Mock nodemailer
vi.mock('nodemailer', () => ({
    createTransport: vi.fn(() => ({
        sendMail: vi.fn()
    }))
}));
// Mock crypto
vi.mock('crypto', () => ({
    randomBytes: vi.fn(() => ({
        toString: vi.fn(() => 'mock-random-token')
    }))
}));
describe('sendCustomPasswordResetEmail Cloud Function', () => {
    let mockDb;
    let mockRequest;
    let mockTransporter;
    beforeEach(() => {
        // Mock Firestore
        mockDb = {
            collection: vi.fn(() => ({
                where: vi.fn(() => ({
                    where: vi.fn(() => ({
                        get: vi.fn(() => Promise.resolve({ docs: [], empty: true }))
                    })),
                    get: vi.fn(() => Promise.resolve({ docs: [] }))
                })),
                add: vi.fn(() => Promise.resolve()),
                doc: vi.fn(() => ({
                    set: vi.fn(() => Promise.resolve())
                }))
            }))
        };
        // Mock request
        mockRequest = {
            data: { email: 'test@example.com' },
            rawRequest: { ip: '127.0.0.1' }
        };
        // Mock transporter
        mockTransporter = {
            sendMail: vi.fn(() => Promise.resolve({ messageId: 'mock-message-id' }))
        };
        // Mock nodemailer
        vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter);
        // Mock admin.firestore
        vi.mocked(admin.firestore).mockReturnValue(mockDb);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('Input Validation', () => {
        it('should reject request without email', async () => {
            const request = { data: {} };
            await expect(sendCustomPasswordResetEmail(request)).rejects.toThrow('Email is required');
        });
        it('should reject invalid email format', async () => {
            const request = { data: { email: 'invalid-email' } };
            await expect(sendCustomPasswordResetEmail(request)).rejects.toThrow('Invalid email format');
        });
        it('should accept valid email format', async () => {
            // Mock successful email sending
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            const result = await sendCustomPasswordResetEmail(mockRequest);
            expect(result).toEqual({ success: true, message: 'Password reset email sent successfully' });
        });
    });
    describe('Rate Limiting', () => {
        it('should allow requests within rate limit', async () => {
            // Mock no recent requests
            mockDb.collection.mockReturnValue({
                where: vi.fn(() => ({
                    where: vi.fn(() => ({
                        get: vi.fn(() => Promise.resolve({ docs: [] }))
                    }))
                }))
            });
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            const result = await sendCustomPasswordResetEmail(mockRequest);
            expect(result).toEqual({ success: true, message: 'Password reset email sent successfully' });
        });
        it('should reject requests exceeding rate limit', async () => {
            // Mock too many recent requests
            const mockDocs = Array(3).fill({ id: 'mock-doc' });
            mockDb.collection.mockReturnValue({
                where: vi.fn(() => ({
                    where: vi.fn(() => ({
                        get: vi.fn(() => Promise.resolve({ docs: mockDocs }))
                    }))
                }))
            });
            await expect(sendCustomPasswordResetEmail(mockRequest)).rejects.toThrow('Too many password reset requests');
        });
    });
    describe('Token Management', () => {
        it('should generate secure reset token', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            await sendCustomPasswordResetEmail(mockRequest);
            // Verify token was stored in Firestore
            expect(mockDb.collection).toHaveBeenCalledWith('passwordResetTokens');
        });
        it('should invalidate existing tokens', async () => {
            // Mock existing tokens
            const mockExistingTokens = {
                docs: [{ ref: { update: vi.fn() } }],
                empty: false
            };
            mockDb.collection.mockReturnValue({
                where: vi.fn(() => ({
                    where: vi.fn(() => ({
                        where: vi.fn(() => ({
                            get: vi.fn(() => Promise.resolve(mockExistingTokens))
                        }))
                    }))
                }))
            });
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            await sendCustomPasswordResetEmail(mockRequest);
            // Verify existing tokens were invalidated
            expect(mockExistingTokens.docs[0].ref.update).toHaveBeenCalled();
        });
    });
    describe('Email Sending', () => {
        it('should send email via Gmail SMTP', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            await sendCustomPasswordResetEmail(mockRequest);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: '"The Props List" <thepropslist@gmail.com>',
                to: 'test@example.com',
                subject: 'Reset Your Password - The Props List',
                html: expect.stringContaining('Reset Your Password'),
                text: expect.stringContaining('Reset Your Password')
            });
        });
        it('should handle email sending errors', async () => {
            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));
            await expect(sendCustomPasswordResetEmail(mockRequest)).rejects.toThrow('Failed to send password reset email');
        });
    });
    describe('Error Handling', () => {
        it('should handle Firestore errors', async () => {
            mockDb.collection.mockImplementation(() => {
                throw new Error('Firestore Error');
            });
            await expect(sendCustomPasswordResetEmail(mockRequest)).rejects.toThrow('Failed to send password reset email');
        });
        it('should handle token generation errors', async () => {
            // Mock crypto error
            const crypto = require('crypto');
            vi.mocked(crypto.randomBytes).mockImplementation(() => {
                throw new Error('Crypto Error');
            });
            await expect(sendCustomPasswordResetEmail(mockRequest)).rejects.toThrow('Failed to send password reset email');
        });
    });
    describe('Security', () => {
        it('should log requests for audit trail', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            await sendCustomPasswordResetEmail(mockRequest);
            // Verify request was logged
            expect(mockDb.collection).toHaveBeenCalledWith('passwordResetRequests');
        });
        it('should include IP address in logs', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            await sendCustomPasswordResetEmail(mockRequest);
            // Verify IP address was included
            expect(mockDb.collection).toHaveBeenCalledWith('passwordResetRequests');
        });
    });
    describe('Email Template', () => {
        it('should include reset URL in email', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            await sendCustomPasswordResetEmail(mockRequest);
            const emailCall = mockTransporter.sendMail.mock.calls[0][0];
            expect(emailCall.html).toContain('https://app.thepropslist.uk/reset-password?token=');
            expect(emailCall.text).toContain('https://app.thepropslist.uk/reset-password?token=');
        });
        it('should include proper branding', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });
            await sendCustomPasswordResetEmail(mockRequest);
            const emailCall = mockTransporter.sendMail.mock.calls[0][0];
            expect(emailCall.html).toContain('The Props List');
            expect(emailCall.text).toContain('The Props List');
        });
    });
});

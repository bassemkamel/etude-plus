/**
 * @deprecated All email sending now goes through src/services/emailService.ts (Resend only).
 * This shim keeps existing imports working while auth.ts is updated below.
 */

export { sendOtpEmail as sendVerificationEmail, isEmailConfigured as isSmtpConfigured } from "../services/emailService";

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRegistrationRejectedEmail = exports.sendRegistrationApprovedEmail = exports.sendRegistrationPendingEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const qrcode_1 = __importDefault(require("qrcode"));
// Create a transporter with Gmail credentials
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: 'koitobanda@gmail.com',
        pass: 'pzqv cgpc izkh xccz' // App password
    }
});
// Generate QR code as data URL
const generateQRCode = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield qrcode_1.default.toDataURL(data);
    }
    catch (error) {
        console.error('Error generating QR code:', error);
        return '';
    }
});
// Email templates
const emailTemplates = {
    registrationPending: (userName, eventName) => ({
        subject: `Registration Pending for ${eventName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4F46E5;">Registration Received</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for registering for <strong>${eventName}</strong>. Your registration has been received and is currently pending approval.</p>
        <p>We will notify you once your registration has been approved.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `
    }),
    registrationApproved: (userName, eventName, eventDate, eventLocation, qrCodeDataUrl, isOfflineEvent, registrationId) => ({
        subject: `Registration Approved for ${eventName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4F46E5;">Registration Approved!</h2>
        <p>Hello ${userName},</p>
        <p>Great news! Your registration for <strong>${eventName}</strong> has been approved.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4F46E5;">Event Details</h3>
          <p><strong>Event:</strong> ${eventName}</p>
          <p><strong>Date:</strong> ${eventDate}</p>
          <p><strong>Location:</strong> ${eventLocation}</p>
          ${registrationId ? `<p><strong>Registration ID:</strong> ${registrationId}</p>` : ''}
        </div>
        
        ${isOfflineEvent && qrCodeDataUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <h3 style="color: #4F46E5;">Your Entry Pass</h3>
          <p>Please present this QR code at the venue for entry:</p>
          <img src="${qrCodeDataUrl}" alt="Entry QR Code" style="max-width: 200px; height: auto;" />
          <p style="font-size: 14px; color: #666; margin-top: 10px;">
            This QR code is your ticket to the event. Please keep it handy.
          </p>
        </div>
        ` : ''}
        
        <p>We look forward to seeing you at the event!</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `
    }),
    registrationRejected: (userName, eventName, reason) => ({
        subject: `Registration Update for ${eventName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4F46E5;">Registration Status Update</h2>
        <p>Hello ${userName},</p>
        <p>We regret to inform you that your registration for <strong>${eventName}</strong> could not be approved at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you have any questions or would like more information, please contact our support team.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `
    })
};
// Send email function
const sendEmail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield transporter.sendMail({
            from: '"Zuper Events" <koitobanda@gmail.com>',
            to,
            subject,
            html
        });
        console.log(`Email sent successfully to ${to}`);
        return true;
    }
    catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
});
exports.sendEmail = sendEmail;
// Specific email sending functions
const sendRegistrationPendingEmail = (to, userName, eventName) => __awaiter(void 0, void 0, void 0, function* () {
    const template = emailTemplates.registrationPending(userName, eventName);
    return (0, exports.sendEmail)(to, template.subject, template.html);
});
exports.sendRegistrationPendingEmail = sendRegistrationPendingEmail;
const sendRegistrationApprovedEmail = (to_1, userName_1, eventName_1, eventDate_1, eventLocation_1, ...args_1) => __awaiter(void 0, [to_1, userName_1, eventName_1, eventDate_1, eventLocation_1, ...args_1], void 0, function* (to, userName, eventName, eventDate, eventLocation, isOfflineEvent = false, registrationId) {
    let qrCodeDataUrl = '';
    // Generate QR code for offline events
    if (isOfflineEvent && registrationId) {
        // Create QR code data with event and registration details
        const qrData = JSON.stringify({
            eventName,
            registrationId,
            userName,
            timestamp: new Date().toISOString()
        });
        qrCodeDataUrl = yield generateQRCode(qrData);
    }
    const template = emailTemplates.registrationApproved(userName, eventName, eventDate, eventLocation, qrCodeDataUrl, isOfflineEvent, registrationId);
    return (0, exports.sendEmail)(to, template.subject, template.html);
});
exports.sendRegistrationApprovedEmail = sendRegistrationApprovedEmail;
const sendRegistrationRejectedEmail = (to, userName, eventName, reason) => __awaiter(void 0, void 0, void 0, function* () {
    const template = emailTemplates.registrationRejected(userName, eventName, reason);
    return (0, exports.sendEmail)(to, template.subject, template.html);
});
exports.sendRegistrationRejectedEmail = sendRegistrationRejectedEmail;

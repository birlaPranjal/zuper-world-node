import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Create a transporter with Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'koitobanda@gmail.com',
    pass: 'pzqv cgpc izkh xccz' // App password
  }
});

// Generate QR code as data URL
const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data);
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

// Email templates
const emailTemplates = {
  registrationPending: (userName: string, eventName: string) => ({
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
  
  registrationApproved: (
    userName: string, 
    eventName: string, 
    eventDate: string, 
    eventLocation: string,
    qrCodeDataUrl?: string,
    isOfflineEvent?: boolean,
    registrationId?: string
  ) => ({
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
  
  registrationRejected: (userName: string, eventName: string, reason?: string) => ({
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
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: '"Zuper Events" <koitobanda@gmail.com>',
      to,
      subject,
      html
    });
    
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Specific email sending functions
export const sendRegistrationPendingEmail = async (to: string, userName: string, eventName: string): Promise<boolean> => {
  const template = emailTemplates.registrationPending(userName, eventName);
  return sendEmail(to, template.subject, template.html);
};

export const sendRegistrationApprovedEmail = async (
  to: string, 
  userName: string, 
  eventName: string, 
  eventDate: string, 
  eventLocation: string,
  isOfflineEvent: boolean = false,
  registrationId?: string
): Promise<boolean> => {
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
    
    qrCodeDataUrl = await generateQRCode(qrData);
  }
  
  const template = emailTemplates.registrationApproved(
    userName, 
    eventName, 
    eventDate, 
    eventLocation, 
    qrCodeDataUrl,
    isOfflineEvent,
    registrationId
  );
  
  return sendEmail(to, template.subject, template.html);
};

export const sendRegistrationRejectedEmail = async (
  to: string, 
  userName: string, 
  eventName: string, 
  reason?: string
): Promise<boolean> => {
  const template = emailTemplates.registrationRejected(userName, eventName, reason);
  return sendEmail(to, template.subject, template.html);
}; 
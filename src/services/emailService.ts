import nodemailer from 'nodemailer';
import { Lead } from '../types/index.js';
import { AIAgent } from '../agents/aiAgent.js';
import { GoogleSheetsService } from './googleSheets.js';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private ai: AIAgent;
  private sheets: GoogleSheetsService;

  constructor(sheets: GoogleSheetsService) {
    this.transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    this.ai = new AIAgent();
    this.sheets = sheets;
  }

  async sendInitialEmail(lead: Lead): Promise<boolean> {
    try {
      const { subject, body } = await this.ai.generateEmailContent(lead);
      await this.transporter.sendMail({ from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`, to: lead.email, subject, text: body, html: this.wrapInHTML(lead.name, body) });
      await this.sheets.updateLead({ rowIndex: lead.rowIndex, status: 'email_sent', emailSentAt: new Date().toISOString(), lastContactedAt: new Date().toISOString(), notes: `Email sent: ${subject}` });
      console.log(`✅ Email sent to ${lead.name} (${lead.email})`);
      return true;
    } catch (err) { console.error(`❌ Email failed for ${lead.email}:`, err); return false; }
  }

  async sendFollowUpEmail(lead: Lead, followUpNumber: number): Promise<boolean> {
    try {
      const { subject, body } = await this.ai.generateFollowUpEmail(lead, followUpNumber);
      await this.transporter.sendMail({ from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`, to: lead.email, subject, text: body, html: this.wrapInHTML(lead.name, body) });
      const statusMap: Record<number, 'follow_up_1' | 'follow_up_2' | 'follow_up_3'> = { 1: 'follow_up_1', 2: 'follow_up_2', 3: 'follow_up_3' };
      const followUpDateMap: Record<number, object> = {
        1: { followUp1At: new Date().toISOString() },
        2: { followUp2At: new Date().toISOString() },
        3: { followUp3At: new Date().toISOString() },
      };
      await this.sheets.updateLead({ rowIndex: lead.rowIndex, status: statusMap[followUpNumber] || 'follow_up_1', ...followUpDateMap[followUpNumber], lastContactedAt: new Date().toISOString() });
      console.log(`✅ Follow-up #${followUpNumber} sent to ${lead.name}`);
      return true;
    } catch (err) { console.error(`❌ Follow-up email failed:`, err); return false; }
  }

  async sendMeetingEmail(lead: Lead, meetLink: string, meetTime: string): Promise<boolean> {
    try {
      const subject = `🗓️ Meeting Confirmed - ${process.env.COMPANY_NAME}`;
      const body = `Hi ${lead.name},\n\nThank you for your interest in ${process.env.COMPANY_NAME}!\n\n📅 Date & Time: ${meetTime}\n🔗 Google Meet: ${meetLink}\n\nLooking forward to speaking with you!\n\nBest regards,\n${process.env.EMAIL_FROM_NAME}`;
      await this.transporter.sendMail({ from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`, to: lead.email, subject, text: body, html: this.wrapInHTML(lead.name, body, '#10b981') });
      await this.sheets.updateLead({ rowIndex: lead.rowIndex, status: 'meeting_scheduled', meetLink, meetLinkSent: true, meetScheduledAt: meetTime, lastContactedAt: new Date().toISOString() });
      console.log(`✅ Meeting email sent to ${lead.name}`);
      return true;
    } catch (err) { console.error(`❌ Meeting email failed:`, err); return false; }
  }

  private wrapInHTML(name: string, body: string, accentColor = '#6366f1'): string {
    return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,sans-serif;background:#f8fafc;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden}.header{background:${accentColor};padding:24px 32px}.header h1{color:white;margin:0;font-size:20px}.body{padding:32px;color:#374151;line-height:1.7}.footer{padding:16px 32px;background:#f8fafc;font-size:12px;color:#9ca3af}</style></head><body><div class="container"><div class="header"><h1>${process.env.COMPANY_NAME||'AI CRM'}</h1></div><div class="body">${body.replace(/\n/g,'<br>')}</div><div class="footer">&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME}</div></div></body></html>`;
  }
}
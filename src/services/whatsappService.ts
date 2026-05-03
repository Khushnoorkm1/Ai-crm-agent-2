import axios from 'axios';
import { Lead } from '../types/index.js';
import { GoogleSheetsService } from './googleSheets.js';

export class WhatsAppService {
  private sheets: GoogleSheetsService;
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(sheets: GoogleSheetsService) {
    this.sheets = sheets;
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  }

  async sendMessage(lead: Lead, message: string): Promise<boolean> {
    try {
      if (!lead.phone) return false;
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        new URLSearchParams({ From: this.fromNumber, To: `whatsapp:${lead.phone}`, Body: message }),
        { auth: { username: this.accountSid, password: this.authToken }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      if (response.data.sid) {
        await this.sheets.updateLead({ rowIndex: lead.rowIndex, lastContactedAt: new Date().toISOString(), notes: `WhatsApp sent` });
        return true;
      }
      return false;
    } catch (err: any) { console.error(`❌ WhatsApp failed for ${lead.name}:`, err.response?.data || err.message); return false; }
  }

  async sendMeetingWhatsApp(lead: Lead, meetLink: string, meetTime: string): Promise<boolean> {
    const msg = `Hi ${lead.name}! 👋\n\nYour meeting with *${process.env.COMPANY_NAME}* is confirmed 🎉\n\n📅 *When:* ${meetTime}\n🔗 *Google Meet:* ${meetLink}\n\nSee you there!`;
    return this.sendMessage(lead, msg);
  }

  async sendFollowUp(lead: Lead, followUpNumber: number): Promise<boolean> {
    const messages = [
      `Hi ${lead.name}! 👋 Following up on my email about ${process.env.COMPANY_NAME}. Got 15 minutes this week?`,
      `Hey ${lead.name}! Checking in from ${process.env.COMPANY_NAME}. Open to a quick chat? 😊`,
      `Hi ${lead.name}, last follow-up from ${process.env.COMPANY_NAME}. Reach out whenever ready! 🙏`,
    ];
    return this.sendMessage(lead, messages[Math.min(followUpNumber - 1, 2)]);
  }
}
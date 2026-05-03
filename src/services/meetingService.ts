import { google } from 'googleapis';
import { Lead } from '../types/index.js';
import { GoogleSheetsService } from './googleSheets.js';

export class MeetingService {
  private calendar: ReturnType<typeof google.calendar>;
  private sheets: GoogleSheetsService;

  constructor(sheets: GoogleSheetsService) {
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    this.calendar = google.calendar({ version: 'v3', auth });
    this.sheets = sheets;
  }

  async createMeeting(lead: Lead): Promise<{ meetLink: string; eventId: string; startTime: string } | null> {
    try {
      const meetTime = this.getNextBusinessSlot();
      const event = await this.calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: `${process.env.COMPANY_NAME} x ${lead.name} - Discovery Call`,
          description: `Meeting with ${lead.name} (${lead.email}) from ${lead.company || lead.website || ''}`,
          start: { dateTime: meetTime.start, timeZone: 'Asia/Kolkata' },
          end: { dateTime: meetTime.end, timeZone: 'Asia/Kolkata' },
          attendees: [{ email: lead.email }, { email: process.env.EMAIL_USER! }],
          conferenceData: { createRequest: { requestId: `crm-${lead.id}-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
          reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 15 }] },
        },
      });
      const meetLink = event.data.conferenceData?.entryPoints?.[0]?.uri || '';
      const eventId = event.data.id || '';
      if (meetLink) {
        console.log(`✅ Meet created for ${lead.name}: ${meetLink}`);
        return { meetLink, eventId, startTime: meetTime.start };
      }
      return null;
    } catch (err) { console.error(`❌ Meet creation failed for ${lead.name}:`, err); return null; }
  }

  private getNextBusinessSlot(): { start: string; end: string } {
    const now = new Date();
    const meetDate = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    while (meetDate.getDay() === 0 || meetDate.getDay() === 6) meetDate.setDate(meetDate.getDate() + 1);
    meetDate.setHours(10, 0, 0, 0);
    const endDate = new Date(meetDate.getTime() + 30 * 60 * 1000);
    return { start: meetDate.toISOString(), end: endDate.toISOString() };
  }
}
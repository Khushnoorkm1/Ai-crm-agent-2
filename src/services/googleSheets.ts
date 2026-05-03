import { google } from 'googleapis';
import { Lead, LeadStatus } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const SHEET_COLUMNS = [
  'ID', 'Name', 'Email', 'Phone', 'Website', 'Place', 'Company',
  'Status', 'Score', 'Notes', 'Email Sent At', 'Email Reply',
  'Call Sent At', 'Call Response', 'Call Recording URL', 'Call Duration',
  'Meet Link', 'Meet Scheduled At', 'Follow Up 1', 'Follow Up 2', 'Follow Up 3',
  'Last Contacted', 'Created At', 'Updated At'
];

export class GoogleSheetsService {
  private sheets: ReturnType<typeof google.sheets>;
  private spreadsheetId: string;
  private sheetName: string;

  constructor() {
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    this.sheetName = process.env.GOOGLE_SHEET_NAME || 'Leads';
  }

  async initSheet(): Promise<void> {
    try {
      const res = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${this.sheetName}!A1:X1` });
      if (!res.data.values || res.data.values.length === 0) {
        await this.sheets.spreadsheets.values.update({ spreadsheetId: this.spreadsheetId, range: `${this.sheetName}!A1`, valueInputOption: 'RAW', requestBody: { values: [SHEET_COLUMNS] } });
        console.log('✅ Sheet headers created');
      }
    } catch (err) { console.error('Sheet init error:', err); }
  }

  async getAllLeads(): Promise<Lead[]> {
    const res = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${this.sheetName}!A2:X1000` });
    const rows = res.data.values || [];
    return rows.filter(row => row[1] || row[2]).map((row, idx) => this.rowToLead(row, idx + 2));
  }

  async getLeadByRow(rowIndex: number): Promise<Lead | null> {
    const res = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${this.sheetName}!A${rowIndex}:X${rowIndex}` });
    const rows = res.data.values || [];
    if (rows.length === 0) return null;
    return this.rowToLead(rows[0], rowIndex);
  }

  async updateLead(lead: Partial<Lead> & { rowIndex: number }): Promise<void> {
    const now = new Date().toISOString();
    const updates: { range: string; values: string[][] }[] = [];
    const col = (c: string) => `${this.sheetName}!${c}${lead.rowIndex}`;
    if (lead.id) updates.push({ range: col('A'), values: [[lead.id]] });
    if (lead.status) updates.push({ range: col('H'), values: [[lead.status]] });
    if (lead.score !== undefined) updates.push({ range: col('I'), values: [[String(lead.score)]] });
    if (lead.notes) updates.push({ range: col('J'), values: [[lead.notes]] });
    if (lead.emailSentAt) updates.push({ range: col('K'), values: [[lead.emailSentAt]] });
    if (lead.emailReply) updates.push({ range: col('L'), values: [[lead.emailReply]] });
    if (lead.callSentAt) updates.push({ range: col('M'), values: [[lead.callSentAt]] });
    if (lead.callResponse) updates.push({ range: col('N'), values: [[lead.callResponse]] });
    if (lead.callRecordingUrl) updates.push({ range: col('O'), values: [[lead.callRecordingUrl]] });
    if (lead.callDuration) updates.push({ range: col('P'), values: [[String(lead.callDuration)]] });
    if (lead.meetLink) updates.push({ range: col('Q'), values: [[lead.meetLink]] });
    if (lead.meetScheduledAt) updates.push({ range: col('R'), values: [[lead.meetScheduledAt]] });
    if (lead.followUp1At) updates.push({ range: col('S'), values: [[lead.followUp1At]] });
    if (lead.followUp2At) updates.push({ range: col('T'), values: [[lead.followUp2At]] });
    if (lead.followUp3At) updates.push({ range: col('U'), values: [[lead.followUp3At]] });
    if (lead.lastContactedAt) updates.push({ range: col('V'), values: [[lead.lastContactedAt]] });
    updates.push({ range: col('X'), values: [[now]] });
    await this.sheets.spreadsheets.values.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { valueInputOption: 'RAW', data: updates } });
  }

  async addLeadId(rowIndex: number): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    await this.sheets.spreadsheets.values.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { valueInputOption: 'RAW', data: [
      { range: `${this.sheetName}!A${rowIndex}`, values: [[id]] },
      { range: `${this.sheetName}!H${rowIndex}`, values: [['new']] },
      { range: `${this.sheetName}!I${rowIndex}`, values: [['0']] },
      { range: `${this.sheetName}!W${rowIndex}`, values: [[now]] },
      { range: `${this.sheetName}!X${rowIndex}`, values: [[now]] },
    ] } });
    return id;
  }

  private rowToLead(row: string[], rowIndex: number): Lead {
    return {
      id: row[0] || '', rowIndex, name: row[1] || '', email: row[2] || '', phone: row[3] || '',
      website: row[4] || '', place: row[5] || '', company: row[6] || '',
      status: (row[7] as LeadStatus) || 'new', score: parseInt(row[8] || '0', 10), notes: row[9] || '',
      emailSentAt: row[10] || undefined, emailReply: row[11] || undefined,
      callSentAt: row[12] || undefined, callResponse: row[13] || undefined,
      callRecordingUrl: row[14] || undefined, callDuration: row[15] ? parseInt(row[15]) : undefined,
      meetLink: row[16] || undefined, meetScheduledAt: row[17] || undefined,
      followUp1At: row[18] || undefined, followUp2At: row[19] || undefined, followUp3At: row[20] || undefined,
      lastContactedAt: row[21] || undefined,
      createdAt: row[22] || new Date().toISOString(), updatedAt: row[23] || new Date().toISOString(),
    };
  }
}
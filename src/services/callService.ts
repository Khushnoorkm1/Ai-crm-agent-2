import axios from 'axios';
import { Lead } from '../types/index.js';
import { AIAgent } from '../agents/aiAgent.js';
import { GoogleSheetsService } from './googleSheets.js';

export class CallService {
  private ai: AIAgent;
  private sheets: GoogleSheetsService;
  private blandApiKey: string;

  constructor(sheets: GoogleSheetsService) {
    this.ai = new AIAgent();
    this.sheets = sheets;
    this.blandApiKey = process.env.BLAND_API_KEY || '';
  }

  async makeCall(lead: Lead): Promise<boolean> {
    try {
      const hour = new Date().getHours();
      const start = parseInt(process.env.CALL_HOURS_START || '9');
      const end = parseInt(process.env.CALL_HOURS_END || '18');
      if (hour < start || hour >= end) { console.log(`⏰ Outside calling hours. Skipping ${lead.name}`); return false; }
      if (!lead.phone || lead.phone.length < 7) { console.log(`❌ No valid phone for ${lead.name}`); return false; }

      const script = await this.ai.generateCallScript(lead);
      const response = await axios.post('https://api.bland.ai/v1/calls', {
        phone_number: lead.phone, task: script,
        voice: process.env.BLAND_VOICE_ID || 'maya',
        wait_for_greeting: true, record: true, max_duration: 5, answered_by_enabled: true,
        metadata: { leadId: lead.id, leadName: lead.name },
        webhook: `${process.env.COMPANY_WEBSITE}/api/webhooks/call`,
      }, { headers: { authorization: this.blandApiKey, 'Content-Type': 'application/json' } });

      const callId = response.data.call_id;
      await this.sheets.updateLead({ rowIndex: lead.rowIndex, status: 'call_scheduled', callSentAt: new Date().toISOString(), lastContactedAt: new Date().toISOString(), notes: `Call initiated. ID: ${callId}` });
      console.log(`📞 Call initiated for ${lead.name} | ID: ${callId}`);
      return true;
    } catch (err: any) {
      console.error(`❌ Call failed for ${lead.name}:`, err.response?.data || err.message);
      return false;
    }
  }

  async handleCallWebhook(data: any): Promise<void> {
    try {
      const { status, transcript, recording_url, duration, metadata } = data;
      if (!metadata?.leadId) return;
      const leads = await this.sheets.getAllLeads();
      const lead = leads.find(l => l.id === metadata.leadId);
      if (!lead) return;

      if (status === 'completed' && transcript) {
        const analysis = await this.ai.analyzeCallTranscript(transcript, lead);
        const updates: any = { rowIndex: lead.rowIndex, callResponse: analysis.summary, callRecordingUrl: recording_url || '', callDuration: duration || 0, lastContactedAt: new Date().toISOString() };
        if (analysis.interested) { updates.status = 'interested'; updates.score = Math.min((lead.score || 0) + 30, 100); }
        else if (analysis.nextAction === 'mark_not_interested') { updates.status = 'not_interested'; }
        else { updates.status = 'call_completed'; }
        await this.sheets.updateLead(updates);
        console.log(`✅ Call done for ${lead.name}: ${analysis.summary}`);
      } else if (status === 'no-answer' || status === 'busy') {
        await this.sheets.updateLead({ rowIndex: lead.rowIndex, status: 'call_no_answer', callSentAt: new Date().toISOString(), notes: `Call ${status}` });
      }
    } catch (err) { console.error('Webhook error:', err); }
  }
}
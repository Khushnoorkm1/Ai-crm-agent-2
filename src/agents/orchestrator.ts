import { GoogleSheetsService } from '../services/googleSheets.js';
import { EmailService } from '../services/emailService.js';
import { CallService } from '../services/callService.js';
import { MeetingService } from '../services/meetingService.js';
import { AIAgent } from './aiAgent.js';
import { Lead } from '../types/index.js';
import { Server as SocketServer } from 'socket.io';

export class CRMOrchestrator {
  private sheets: GoogleSheetsService;
  private email: EmailService;
  private call: CallService;
  private meeting: MeetingService;
  private ai: AIAgent;
  private io?: SocketServer;
  private isRunning = false;

  constructor(io?: SocketServer) {
    this.sheets = new GoogleSheetsService();
    this.email = new EmailService(this.sheets);
    this.call = new CallService(this.sheets);
    this.meeting = new MeetingService(this.sheets);
    this.ai = new AIAgent();
    this.io = io;
  }

  async runPipeline(): Promise<void> {
    if (this.isRunning) { console.log('Pipeline already running'); return; }
    this.isRunning = true;
    this.emit('pipeline_start', { message: 'CRM Pipeline started' });
    try {
      await this.sheets.initSheet();
      const leads = await this.sheets.getAllLeads();
      console.log(`\n🚀 Pipeline Started — ${leads.length} leads`);
      this.emit('leads_loaded', { count: leads.length });
      let processed = 0;
      for (const lead of leads) {
        await this.processLead(lead);
        processed++;
        this.emit('lead_processed', { processed, total: leads.length, lead: lead.name });
        await this.sleep(3000);
      }
      console.log(`\n✅ Pipeline complete — ${processed} leads processed`);
      this.emit('pipeline_complete', { processed, total: leads.length });
    } catch (err) {
      console.error('Pipeline error:', err);
      this.emit('pipeline_error', { error: String(err) });
    } finally {
      this.isRunning = false;
    }
  }

  async processLead(lead: Lead): Promise<void> {
    console.log(`\n📋 Processing: ${lead.name} (${lead.status})`);
    this.emit('processing_lead', { name: lead.name, status: lead.status });
    if (!lead.id) lead.id = await this.sheets.addLeadId(lead.rowIndex);
    if (lead.score === 0) {
      const analysis = await this.ai.analyzeLead(lead);
      await this.sheets.updateLead({ rowIndex: lead.rowIndex, score: analysis.score });
      lead.score = analysis.score;
      console.log(`  📊 AI Score: ${analysis.score}/100`);
    }
    switch (lead.status) {
      case 'new': await this.handleNewLead(lead); break;
      case 'email_sent':
        if (this.hoursAgo(lead.emailSentAt) >= 48) await this.handleCallLead(lead);
        break;
      case 'email_replied': await this.handleCallLead(lead); break;
      case 'call_no_answer':
        if (this.hoursAgo(lead.callSentAt) >= 24) await this.handleCallLead(lead);
        break;
      case 'interested': await this.handleInterestedLead(lead); break;
      case 'call_completed':
        if (this.daysAgo(lead.lastContactedAt) >= 3 && !lead.followUp1At)
          await this.email.sendFollowUpEmail(lead, 1);
        break;
      case 'follow_up_1':
        if (this.daysAgo(lead.lastContactedAt) >= 7 && !lead.followUp2At)
          await this.email.sendFollowUpEmail(lead, 2);
        break;
      case 'follow_up_2':
        if (this.daysAgo(lead.lastContactedAt) >= 14 && !lead.followUp3At)
          await this.email.sendFollowUpEmail(lead, 3);
        break;
    }
  }

  private async handleNewLead(lead: Lead): Promise<void> {
    const success = await this.email.sendInitialEmail(lead);
    if (success) this.emit('email_sent', { name: lead.name, email: lead.email });
  }

  private async handleCallLead(lead: Lead): Promise<void> {
    const success = await this.call.makeCall(lead);
    if (success) this.emit('call_initiated', { name: lead.name, phone: lead.phone });
  }

  private async handleInterestedLead(lead: Lead): Promise<void> {
    if (lead.meetLinkSent) return;
    const meetResult = await this.meeting.createMeeting(lead);
    if (meetResult) {
      await this.email.sendMeetingEmail(lead, meetResult.meetLink, meetResult.startTime);
      this.emit('meet_created', { name: lead.name, meetLink: meetResult.meetLink, startTime: meetResult.startTime });
    }
  }

  async runSingleLead(rowIndex: number): Promise<void> {
    const lead = await this.sheets.getLeadByRow(rowIndex);
    if (!lead) throw new Error(`Lead at row ${rowIndex} not found`);
    await this.processLead(lead);
  }

  async handleCallWebhook(data: any): Promise<void> {
    await this.call.handleCallWebhook(data);
    const leads = await this.sheets.getAllLeads();
    const lead = leads.find(l => l.id === data.metadata?.leadId);
    if (lead?.status === 'interested') await this.handleInterestedLead(lead);
  }

  getCallService(): CallService { return this.call; }
  getSheetsService(): GoogleSheetsService { return this.sheets; }

  private hoursAgo(dateStr?: string): number {
    if (!dateStr) return 999;
    return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
  }
  private daysAgo(dateStr?: string): number { return this.hoursAgo(dateStr) / 24; }
  private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
  private emit(event: string, data: any): void {
    if (this.io) this.io.emit(event, { ...data, timestamp: new Date().toISOString() });
  }
}
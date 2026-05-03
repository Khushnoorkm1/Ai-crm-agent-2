export type LeadStatus =
  | 'new' | 'email_sent' | 'email_replied' | 'call_scheduled'
  | 'call_completed' | 'call_no_answer' | 'interested' | 'not_interested'
  | 'meeting_scheduled' | 'converted' | 'follow_up_1' | 'follow_up_2'
  | 'follow_up_3' | 'dnc';

export interface Lead {
  id: string;
  rowIndex: number;
  name: string;
  email: string;
  phone: string;
  website?: string;
  place?: string;
  company?: string;
  status: LeadStatus;
  score: number;
  notes: string;
  emailSentAt?: string;
  emailReply?: string;
  callSentAt?: string;
  callResponse?: string;
  callRecordingUrl?: string;
  callDuration?: number;
  meetLinkSent?: boolean;
  meetLink?: string;
  meetScheduledAt?: string;
  followUp1At?: string;
  followUp2At?: string;
  followUp3At?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMAction {
  type: 'email' | 'call' | 'whatsapp' | 'meet' | 'follow_up' | 'score';
  leadId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  result?: string;
  error?: string;
  timestamp: string;
}

export interface AIAnalysis {
  score: number;
  intent: 'high' | 'medium' | 'low';
  summary: string;
  nextAction: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface DashboardStats {
  totalLeads: number;
  emailsSent: number;
  callsMade: number;
  interested: number;
  meetingsScheduled: number;
  converted: number;
  avgScore: number;
  todayActions: number;
}
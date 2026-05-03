import Anthropic from '@anthropic-ai/sdk';
import { Lead, AIAnalysis } from '../types/index.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class AIAgent {
  private companyName = process.env.COMPANY_NAME || 'Our Company';
  private serviceDescription = process.env.SERVICE_DESCRIPTION || 'AI-powered business solutions';

  async analyzeLead(lead: Lead): Promise<AIAnalysis> {
    const prompt = `You are a CRM AI analyst. Analyze this lead and give a score 0-100.

Lead Info:
- Name: ${lead.name}
- Company: ${lead.company || 'Unknown'}
- Website: ${lead.website || 'None'}
- Place: ${lead.place || 'Unknown'}
- Email Reply: ${lead.emailReply || 'No reply yet'}
- Call Response: ${lead.callResponse || 'Not called yet'}
- Current Status: ${lead.status}

Our Service: ${this.serviceDescription}

Respond ONLY in this JSON format:
{
  "score": 75,
  "intent": "high",
  "summary": "2-3 sentence summary",
  "nextAction": "specific next step",
  "sentiment": "positive"
}`;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim()) as AIAnalysis;
  }

  async generateEmailContent(lead: Lead): Promise<{ subject: string; body: string }> {
    const prompt = `Write a professional sales email for this lead.
Lead: ${lead.name} from ${lead.company || lead.website || lead.place || 'their company'}
Our Company: ${this.companyName}
Our Service: ${this.serviceDescription}
Requirements: Personalized, warm, 3-4 short paragraphs, clear value prop, soft CTA.
Respond ONLY in JSON: {"subject": "...", "body": "..."}`;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }

  async generateCallScript(lead: Lead): Promise<string> {
    const prompt = `Create a phone call script for an AI voice agent.
Lead: ${lead.name}, ${lead.company || lead.website || ''}, ${lead.place || ''}
Email Reply: ${lead.emailReply || 'Did not reply to email'}
Our Company: ${this.companyName}, Service: ${this.serviceDescription}
Script should: introduce naturally, reference email, explain service, ask qualifying questions, suggest Google Meet if interested.
Keep under 200 words. Return just the script text.`;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async analyzeCallTranscript(transcript: string, lead: Lead): Promise<{
    interested: boolean; sentiment: string; summary: string; nextAction: string;
  }> {
    const prompt = `Analyze this call transcript.
Lead: ${lead.name}
Transcript: ${transcript}
Respond ONLY in JSON:
{"interested": true, "sentiment": "positive", "summary": "brief summary", "nextAction": "send_meet_link OR follow_up_in_3_days OR mark_not_interested"}`;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }

  async generateFollowUpEmail(lead: Lead, followUpNumber: number): Promise<{ subject: string; body: string }> {
    const prompt = `Write follow-up email #${followUpNumber} for lead: ${lead.name}, ${lead.company || ''}.
Previous: ${lead.emailSentAt ? 'Email sent' : ''} ${lead.callSentAt ? '| Call made' : ''}
Our Company: ${this.companyName}
Short, friendly, add new value. Respond ONLY in JSON: {"subject": "...", "body": "..."}`;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }
}
import { Router, Request, Response } from 'express';
import { CRMOrchestrator } from '../agents/orchestrator.js';

export function createRoutes(orchestrator: CRMOrchestrator): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  router.post('/pipeline/run', async (_req: Request, res: Response) => {
    res.json({ message: 'Pipeline started', status: 'running' });
    orchestrator.runPipeline().catch(console.error);
  });

  router.post('/leads/:row/process', async (req: Request, res: Response) => {
    try {
      const row = parseInt(req.params.row);
      await orchestrator.runSingleLead(row);
      res.json({ message: `Lead row ${row} processed` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/leads', async (_req: Request, res: Response) => {
    try {
      const leads = await orchestrator.getSheetsService().getAllLeads();
      res.json({ leads, count: leads.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/leads/:row/status', async (req: Request, res: Response) => {
    try {
      const row = parseInt(req.params.row);
      const { status, notes } = req.body;
      await orchestrator.getSheetsService().updateLead({ rowIndex: row, status, notes });
      res.json({ message: 'Lead updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/webhooks/call', async (req: Request, res: Response) => {
    res.sendStatus(200);
    await orchestrator.handleCallWebhook(req.body).catch(console.error);
  });

  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const leads = await orchestrator.getSheetsService().getAllLeads();
      const today = new Date().toDateString();
      const stats = {
        totalLeads: leads.length,
        emailsSent: leads.filter(l => l.emailSentAt).length,
        callsMade: leads.filter(l => l.callSentAt).length,
        interested: leads.filter(l => l.status === 'interested').length,
        meetingsScheduled: leads.filter(l => l.status === 'meeting_scheduled').length,
        converted: leads.filter(l => l.status === 'converted').length,
        notInterested: leads.filter(l => l.status === 'not_interested').length,
        avgScore: leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0,
        todayActions: leads.filter(l => l.lastContactedAt && new Date(l.lastContactedAt).toDateString() === today).length,
        byStatus: leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>),
      };
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
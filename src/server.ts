import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketServer } from 'socket.io';
import cron from 'node-cron';
import { CRMOrchestrator } from './agents/orchestrator.js';
import { createRoutes } from './routes/api.js';

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '..', 'public');

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));

const orchestrator = new CRMOrchestrator(io);
app.use('/api', createRoutes(orchestrator));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('📡 Dashboard connected:', socket.id);
  socket.on('disconnect', () => console.log('📡 Disconnected:', socket.id));
});

cron.schedule('0 9 * * 1-5', () => {
  orchestrator.runPipeline().catch(console.error);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 AI CRM Pro running on http://localhost:${PORT}`);
});

export { app, io };
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { MarketManager } from './server/providers/marketManager.ts';
import { createApiRouter } from './server/routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Initialize Market Manager
  const marketManager = new MarketManager();

  // Setup WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Connected client subscriptions
  const clientSubscriptions = new Map<WebSocket, Set<string>>();

  wss.on('connection', (ws: WebSocket) => {
    clientSubscriptions.set(ws, new Set());

    // Send initial status immediately upon connection
    ws.send(JSON.stringify({
      type: 'market_status',
      status: marketManager.getSystemStatus(),
    }));

    // Client message handling
    ws.on('message', (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe') {
          const subs = clientSubscriptions.get(ws) || new Set();
          if (Array.isArray(data.symbols)) {
            data.symbols.forEach((s: string) => subs.add(s.toUpperCase()));
          }
          clientSubscriptions.set(ws, subs);
        } else if (data.type === 'unsubscribe') {
          const subs = clientSubscriptions.get(ws);
          if (subs && Array.isArray(data.symbols)) {
            data.symbols.forEach((s: string) => subs.delete(s.toUpperCase()));
          }
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (err) {
        // ignore malformed client message
      }
    });

    ws.on('close', () => {
      clientSubscriptions.delete(ws);
    });

    ws.on('error', () => {
      clientSubscriptions.delete(ws);
    });
  });

  // Connect MarketManager broadcast to connected WebSocket clients
  marketManager.setBroadcastCallback((event) => {
    const raw = JSON.stringify(event);
    for (const [client, subs] of clientSubscriptions.entries()) {
      if (client.readyState === WebSocket.OPEN) {
        // High priority events (reversal alerts, actionable signals, system status) are ALWAYS broadcast to all clients
        if (
          event.type === 'reversal_alert' ||
          event.type === 'signal_new' ||
          event.type === 'alert_new' ||
          event.type === 'market_status'
        ) {
          client.send(raw);
          continue;
        }

        // Real-time market tick feeds: send if subscribed to all ('*'), no filter, or specifically subscribed
        if (!event.symbol || subs.size === 0 || subs.has('*') || subs.has(event.symbol)) {
          client.send(raw);
        }
      }
    }
  });

  // Initialize Market data feeds (Binance WS, historical candles, polling)
  await marketManager.init();

  // Mount API Router
  app.use('/api', createApiRouter(marketManager));

  // Mount Vite or serve static
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[INFO] MarketAI Radar server running on http://0.0.0.0:${PORT}`);
    console.log(`[INFO] WebSocket server mounted on ws://0.0.0.0:${PORT}/ws`);
  });
}

startServer().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});

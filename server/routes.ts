import { Router } from 'express';
import { generateAIAnalysis } from './engine/aiAnalyst.ts';
import { runBacktest } from './engine/backtest.ts';
import { computeAllIndicators } from './engine/indicators.ts';
import { MarketManager } from './providers/marketManager.ts';
import type { BacktestParams, Timeframe } from './types.ts';

export function createApiRouter(marketManager: MarketManager): Router {
  const router = Router();

  // 1. Health check
  router.get('/health', (req, res) => {
    const status = marketManager.getSystemStatus();
    res.json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: Date.now(),
      market: status,
    });
  });

  // 2. Market Status
  router.get('/market/status', (req, res) => {
    res.json(marketManager.getSystemStatus());
  });

  // 3. Assets list & by symbol
  router.get('/assets', (req, res) => {
    res.json(marketManager.getAssets());
  });

  router.get('/assets/:symbol', (req, res) => {
    const asset = marketManager.getAsset(req.params.symbol);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  });

  // 4. Candles (Real B3 and global market data)
  router.get('/candles/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    const timeframe = (req.query.timeframe as Timeframe) || '15m';
    const candles = await marketManager.getOrFetchCandles(symbol, timeframe);
    res.json(candles);
  });

  // 5. Signals & History
  router.get('/signals', (req, res) => {
    res.json(marketManager.getActiveSignals());
  });

  router.get('/reversals', (req, res) => {
    res.json(marketManager.getActiveReversals());
  });

  router.get('/signals/history', (req, res) => {
    res.json(marketManager.getSignalHistory());
  });

  router.get('/signals/:id', (req, res) => {
    const signal = marketManager.getSignal(req.params.id);
    if (!signal) return res.status(404).json({ error: 'Signal not found' });
    res.json(signal);
  });

  // 6. News & Economic Calendar
  router.get('/news', (req, res) => {
    res.json(marketManager.getNews());
  });

  router.get('/economic-calendar', (req, res) => {
    res.json(marketManager.getEconomicCalendar());
  });

  // 7. Analysis & AI Analyst
  router.get('/analysis/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    const timeframe = (req.query.timeframe as Timeframe) || '15m';
    const candles = await marketManager.getOrFetchCandles(symbol, timeframe);
    const signal = marketManager.evaluateAssetSignal(symbol, timeframe, true);
    if (!signal) return res.status(404).json({ error: 'Unable to analyze symbol' });

    const indicators = computeAllIndicators(candles, timeframe);

    res.json({
      signal,
      indicators,
    });
  });

  router.post('/analysis/ai', async (req, res) => {
    const { symbol, timeframe = '15m' } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

    const signal = marketManager.evaluateAssetSignal(symbol, timeframe as Timeframe, true);
    if (!signal) return res.status(404).json({ error: 'Signal calculation failed' });

    const candles = marketManager.getCandles(symbol, timeframe as Timeframe);
    const indicators = computeAllIndicators(candles, timeframe as Timeframe);

    try {
      const aiResponse = await generateAIAnalysis(signal, indicators);
      res.json(aiResponse);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'AI analysis error' });
    }
  });

  // 8. Market Scanner
  router.get('/scanner', (req, res) => {
    const filter = (req.query.filter as string) || 'all';
    const signals = marketManager.getActiveSignals();
    const assets = marketManager.getAssets();

    let results = signals.map(sig => {
      const asset = assets.find(a => a.symbol === sig.symbol);
      return {
        ...sig,
        assetChangePercent: asset?.changePercent || 0,
        volume24h: asset?.volume24h || 0,
      };
    });

    if (filter === 'reversal_bullish') {
      results = results.filter(s => s.reversal.isReversal && s.reversal.type === 'BULLISH');
    } else if (filter === 'reversal_bearish') {
      results = results.filter(s => s.reversal.isReversal && s.reversal.type === 'BEARISH');
    } else if (filter === 'strong_buy') {
      results = results.filter(s => s.score >= 80);
    } else if (filter === 'strong_sell') {
      results = results.filter(s => s.score <= 20);
    } else if (filter === 'abnormal_volume') {
      results = results.filter(s => s.factors.some(f => f.category === 'Volume' && f.points >= 8));
    } else if (filter === 'rsi_oversold') {
      results = results.filter(s => s.factors.some(f => f.category === 'RSI' && f.description.includes('sobrevendid')));
    } else if (filter === 'rsi_overbought') {
      results = results.filter(s => s.factors.some(f => f.category === 'RSI' && f.description.includes('sobrecompr')));
    }

    res.json(results);
  });

  // 9. Backtest
  router.post('/backtest', (req, res) => {
    const { symbol, timeframe = '15m', strategy = 'REVERSAL', periodDays = 90, initialCapital = 10000 } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

    const candles = marketManager.getCandles(symbol, timeframe as Timeframe);
    const params: BacktestParams = {
      symbol,
      timeframe: timeframe as Timeframe,
      strategy,
      periodDays: Number(periodDays),
      initialCapital: Number(initialCapital),
    };

    const result = runBacktest(candles, params);
    res.json(result);
  });

  // 10. Admin Configuration
  router.get('/admin/config', (req, res) => {
    res.json(marketManager.getWeights());
  });

  router.post('/admin/config', (req, res) => {
    const updates = req.body;
    marketManager.updateWeights(updates);
    res.json({ success: true, config: marketManager.getWeights() });
  });

  // 11. User Management (Cadastro de Usuário e Senha)
  router.get('/users', (req, res) => {
    res.json(marketManager.getUsers());
  });

  router.post('/users', (req, res) => {
    const { username, password, name, role, status } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Os campos Usuário e Senha são obrigatórios' });
    }
    const user = marketManager.addUser({ username, password, name, role, status });
    res.status(201).json(user);
  });

  router.put('/users/:id', (req, res) => {
    const user = marketManager.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  });

  router.delete('/users/:id', (req, res) => {
    const ok = marketManager.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ success: true, message: 'Usuário removido com sucesso' });
  });

  router.post('/users/login', (req, res) => {
    const { username, password } = req.body;
    const users = marketManager.getUsers();
    const found = users.find(
      (u) => u.username.toLowerCase() === (username || '').toLowerCase().trim() && u.password === password
    );
    if (!found) {
      return res.status(401).json({ success: false, error: 'Usuário ou Senha incorretos' });
    }
    if (found.status === 'INATIVO') {
      return res.status(403).json({ success: false, error: 'Usuário inativo. Contate o Administrador.' });
    }
    marketManager.updateUser(found.id, { lastLogin: Date.now() });
    res.json({ success: true, user: found });
  });

  return router;
}

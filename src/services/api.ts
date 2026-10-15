import {
  AdminWeightsConfig,
  AIAnalysisResponse,
  AssetInfo,
  Candle,
  EconomicEvent,
  IndicatorValues,
  MarketNews,
  MarketSignal,
  ReversalAlertEvent,
  Timeframe,
  UserAccount,
} from '../types/market.js';

export async function fetchHealth() {
  const res = await fetch('/api/health');
  return res.json();
}

export async function fetchMarketStatus() {
  const res = await fetch('/api/market/status');
  return res.json();
}

export async function fetchAssets(): Promise<AssetInfo[]> {
  const res = await fetch('/api/assets');
  if (!res.ok) throw new Error('Failed to load assets');
  return res.json();
}

export async function fetchAsset(symbol: string): Promise<AssetInfo> {
  const res = await fetch(`/api/assets/${symbol}`);
  if (!res.ok) throw new Error(`Asset ${symbol} not found`);
  return res.json();
}

export async function fetchCandles(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  const res = await fetch(`/api/candles/${symbol}?timeframe=${timeframe}`);
  if (!res.ok) throw new Error('Failed to load candles');
  return res.json();
}

export async function fetchSignals(): Promise<MarketSignal[]> {
  const res = await fetch('/api/signals');
  if (!res.ok) throw new Error('Failed to load signals');
  return res.json();
}

export async function fetchActiveReversals(): Promise<ReversalAlertEvent[]> {
  const res = await fetch('/api/reversals');
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSignalHistory(): Promise<MarketSignal[]> {
  const res = await fetch('/api/signals/history');
  if (!res.ok) throw new Error('Failed to load signal history');
  return res.json();
}

export async function fetchNews(): Promise<MarketNews[]> {
  const res = await fetch('/api/news');
  if (!res.ok) throw new Error('Failed to load news');
  return res.json();
}

export async function fetchEconomicCalendar(): Promise<EconomicEvent[]> {
  const res = await fetch('/api/economic-calendar');
  if (!res.ok) throw new Error('Failed to load economic calendar');
  return res.json();
}

export async function fetchAnalysis(
  symbol: string,
  timeframe: Timeframe = '15m'
): Promise<{ signal: MarketSignal; indicators: IndicatorValues }> {
  const res = await fetch(`/api/analysis/${symbol}?timeframe=${timeframe}`);
  if (!res.ok) throw new Error('Failed to load analysis');
  return res.json();
}

export async function requestAIAnalysis(
  symbol: string,
  timeframe: Timeframe = '15m'
): Promise<AIAnalysisResponse> {
  const res = await fetch('/api/analysis/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, timeframe }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate AI analysis');
  }
  return res.json();
}

export async function fetchScanner(filter: string): Promise<MarketSignal[]> {
  const res = await fetch(`/api/scanner?filter=${filter}`);
  if (!res.ok) throw new Error('Failed to load scanner');
  return res.json();
}

export async function runBacktestSimulation(payload: {
  symbol: string;
  timeframe: Timeframe;
  strategy: string;
  periodDays: number;
  initialCapital: number;
}) {
  const res = await fetch('/api/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to run backtest');
  return res.json();
}

export async function fetchAdminConfig(): Promise<AdminWeightsConfig> {
  const res = await fetch('/api/admin/config');
  if (!res.ok) throw new Error('Failed to load admin config');
  return res.json();
}

export async function saveAdminConfig(config: Partial<AdminWeightsConfig>) {
  const res = await fetch('/api/admin/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to save config');
  return res.json();
}

export async function fetchUsers(): Promise<UserAccount[]> {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function createUser(user: Partial<UserAccount>): Promise<UserAccount> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao cadastrar usuário');
  }
  return res.json();
}

export async function updateUser(id: string, user: Partial<UserAccount>): Promise<UserAccount> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar usuário');
  }
  return res.json();
}

export async function deleteUser(id: string): Promise<boolean> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) return false;
  return true;
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const res = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

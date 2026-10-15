export type MarketType = 'B3' | 'CRYPTO' | 'US' | 'FUTURES' | 'FII' | 'INDEX';

export type Timeframe = '5m' | '15m' | '1h' | '2h' | '4h' | '1d' | '1w';

export type SignalDirection = 'BUY' | 'SELL' | 'WAIT';

export type SignalGrade = 'A' | 'B' | 'C' | 'D';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetInfo {
  symbol: string;
  name: string;
  market: MarketType;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: number;
  isRealTime: boolean;
  source: string;
}

export interface IndicatorValues {
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  sma20: number;
  sma50: number;
  sma200: number;
  rsi14: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
  };
  atr14: number;
  vwap?: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  adx14: number;
  supertrend: {
    value: number;
    direction: 'up' | 'down';
  };
  volumeAvg20: number;
  volumeRatio: number;
  support: number;
  resistance: number;
}

export interface ReversalAnalysis {
  isReversal: boolean;
  type: 'BULLISH' | 'BEARISH' | 'NONE';
  confidence: number;
  patterns: string[];
  reasons: string[];
  lastCandleClosed: boolean;
}

export interface SignalFactor {
  name: string;
  category: 'Trend' | 'MovingAverages' | 'MACD' | 'RSI' | 'Volume' | 'PriceAction' | 'SupportResistance' | 'MultiTimeframe' | 'News';
  points: number;
  maxPoints: number;
  status: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface MarketSignal {
  id: string;
  symbol: string;
  assetName: string;
  market: MarketType;
  timeframe: Timeframe;
  direction: SignalDirection;
  grade: SignalGrade;
  score: number;
  confidencePercent: number;
  currentPrice: number;
  signalPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
  timestamp: number;
  timeString: string;
  reversal: ReversalAnalysis;
  factors: SignalFactor[];
  reasons: string[];
  multiTimeframeStatus: {
    [key in Timeframe]?: 'bullish' | 'bearish' | 'neutral';
  };
  confluenceRatio: string;
  isConfirmed: boolean;
  isLateral: boolean;
  isHighVolatility: boolean;
  status: 'ACTIVE' | 'TARGET1_HIT' | 'TARGET2_HIT' | 'STOP_HIT' | 'INVALIDATED';
  currentProfitPercent?: number;
}

export interface MarketNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  timestamp: number;
  category: string;
  sentiment: 'POSITIVA' | 'NEGATIVA' | 'NEUTRA';
  score: number;
  impact: 'ALTO' | 'MÉDIO' | 'BAIXO';
  impactedAssets: { symbol: string; impactScore: number }[];
  url?: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  date: string;
  time: string;
  impact: 'ALTO' | 'MÉDIO' | 'BAIXO';
  forecast: string;
  previous: string;
  actual?: string;
  period: string;
}

export interface AdminWeightsConfig {
  trend: number;
  movingAverages: number;
  macd: number;
  rsi: number;
  volume: number;
  priceAction: number;
  supportResistance: number;
  multiTimeframe: number;
  news: number;
  buyThreshold: number;
  sellThreshold: number;
  riskMode: 'CONSERVADOR' | 'MODERADO' | 'AGRESSIVO';
  demoMode: boolean;
  confirmOnlyOnClose: boolean;
  minRiskReward: number;
}

export interface AIAnalysisResponse {
  symbol: string;
  timeframe: string;
  direction: SignalDirection;
  confidence: number;
  marketReading: string;
  risks: string[];
  invalidations: string[];
  generatedAt: string;
  model: string;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnlCash: number;
  pnlPercent: number;
  openTime: string;
  status: 'OPEN' | 'CLOSED';
}

export interface ReversalAlertEvent {
  id: string;
  symbol: string;
  assetName: string;
  market: MarketType;
  reversalType: 'BULLISH' | 'BEARISH';
  label: 'Fim de Baixa' | 'Fim de Alta';
  direction: 'BUY' | 'SELL';
  price: number;
  confidence: number;
  patterns?: string[];
  reasons?: string[];
  timeframe: Timeframe;
  timestamp: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  name?: string;
  role: 'ADMIN' | 'TRADER' | 'ANALISTA';
  status: 'ATIVO' | 'INATIVO';
  createdAt: number;
  lastLogin?: number;
}

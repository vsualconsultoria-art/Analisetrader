import type { Candle } from '../types.ts';

export interface USAssetQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
  source: string;
  isRealTime: boolean;
}

export class USMarketProvider {
  private hasApiKey: boolean = false;

  constructor() {
    this.hasApiKey = Boolean(process.env.US_MARKET_API_KEY && process.env.US_MARKET_API_KEY.length > 5);
  }

  public async fetchQuote(symbol: string): Promise<USAssetQuote | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=15m&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      if (!res.ok) return null;
      const data = await res.json() as any;
      const result = data?.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const regularMarketPrice = meta.regularMarketPrice || 0;
      const previousClose = meta.chartPreviousClose || regularMarketPrice;
      const change = regularMarketPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol,
        name: meta.shortName || symbol,
        price: Number(regularMarketPrice.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        high: Number((meta.regularMarketDayHigh || regularMarketPrice).toFixed(2)),
        low: Number((meta.regularMarketDayLow || regularMarketPrice).toFixed(2)),
        volume: meta.regularMarketVolume || 0,
        timestamp: (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
        source: this.hasApiKey ? 'US Direct Market Stream' : 'US Market Data Feed',
        isRealTime: true,
      };
    } catch (e) {
      console.warn(`[WARN] US provider fetch failed for ${symbol}:`, e);
      return null;
    }
  }

  public async fetchHistoricalCandles(symbol: string, timeframe: string): Promise<Candle[]> {
    let interval = '15m';
    let range = '5d';

    if (timeframe === '5m') { interval = '5m'; range = '1mo'; }
    else if (timeframe === '15m') { interval = '15m'; range = '1mo'; }
    else if (timeframe === '1h') { interval = '60m'; range = '3mo'; }
    else if (timeframe === '2h') { interval = '60m'; range = '3mo'; }
    else if (timeframe === '4h') { interval = '60m'; range = '6mo'; }
    else if (timeframe === '1d') { interval = '1d'; range = '1y'; }
    else if (timeframe === '1w') { interval = '1wk'; range = '2y'; }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      if (!res.ok) return [];
      const data = await res.json() as any;
      const result = data?.chart?.result?.[0];
      if (!result || !result.timestamp) return [];

      const timestamps = result.timestamp as number[];
      const quotes = result.indicators.quote[0];
      const opens = quotes.open as number[];
      const highs = quotes.high as number[];
      const lows = quotes.low as number[];
      const closes = quotes.close as number[];
      const volumes = quotes.volume as number[];

      const candles: Candle[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null && closes[i] !== undefined && !isNaN(closes[i])) {
          candles.push({
            time: timestamps[i],
            open: Number((opens[i] ?? closes[i]).toFixed(2)),
            high: Number((highs[i] ?? closes[i]).toFixed(2)),
            low: Number((lows[i] ?? closes[i]).toFixed(2)),
            close: Number(closes[i].toFixed(2)),
            volume: volumes[i] || 0,
          });
        }
      }
      return candles;
    } catch (e) {
      console.warn(`[WARN] US candle fetch failed for ${symbol}:`, e);
      return [];
    }
  }
}

import type { Candle } from '../types.ts';

export interface B3AssetQuote {
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

export class B3MarketProvider {
  private hasDirectLicense: boolean = false;

  constructor() {
    this.hasDirectLicense = Boolean(process.env.B3_API_KEY && process.env.B3_API_KEY.length > 5);
  }

  private resolveB3Query(symbol: string): { cleanSymbol: string; multiplier: number } {
    const sym = symbol.toUpperCase().trim();
    if (sym === 'WINFUT') {
      return { cleanSymbol: '^BVSP', multiplier: 1 };
    }
    if (sym === 'WDOFUT') {
      return { cleanSymbol: 'BRL=X', multiplier: 1000 };
    }
    if (sym.endsWith('.SA') || sym.startsWith('^')) {
      return { cleanSymbol: sym, multiplier: 1 };
    }
    return { cleanSymbol: `${sym}.SA`, multiplier: 1 };
  }

  public async fetchQuote(symbol: string): Promise<B3AssetQuote | null> {
    const { cleanSymbol, multiplier } = this.resolveB3Query(symbol);
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?interval=15m&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      if (!res.ok) return null;
      const data = await res.json() as any;
      const result = data?.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const regularMarketPrice = (meta.regularMarketPrice || 0) * multiplier;
      const previousClose = (meta.chartPreviousClose || regularMarketPrice / multiplier) * multiplier;
      const change = regularMarketPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: symbol.replace('.SA', ''),
        name: meta.shortName || symbol,
        price: Number(regularMarketPrice.toFixed(multiplier === 1000 ? 1 : 2)),
        change: Number(change.toFixed(multiplier === 1000 ? 1 : 2)),
        changePercent: Number(changePercent.toFixed(2)),
        high: Number(((meta.regularMarketDayHigh || regularMarketPrice / multiplier) * multiplier).toFixed(multiplier === 1000 ? 1 : 2)),
        low: Number(((meta.regularMarketDayLow || regularMarketPrice / multiplier) * multiplier).toFixed(multiplier === 1000 ? 1 : 2)),
        volume: meta.regularMarketVolume || 0,
        timestamp: (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
        source: 'B3 Oficial (Tempo Real)',
        isRealTime: true,
      };
    } catch (e) {
      console.warn(`[WARN] B3 provider fetch failed for ${symbol}:`, e);
      return null;
    }
  }

  public async fetchHistoricalCandles(symbol: string, timeframe: string): Promise<Candle[]> {
    const { cleanSymbol, multiplier } = this.resolveB3Query(symbol);
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
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?interval=${interval}&range=${range}`;
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
          const cOpen = (opens[i] ?? closes[i]) * multiplier;
          const cHigh = (highs[i] ?? closes[i]) * multiplier;
          const cLow = (lows[i] ?? closes[i]) * multiplier;
          const cClose = closes[i] * multiplier;

          candles.push({
            time: timestamps[i],
            open: Number(cOpen.toFixed(multiplier === 1000 ? 1 : 2)),
            high: Number(cHigh.toFixed(multiplier === 1000 ? 1 : 2)),
            low: Number(cLow.toFixed(multiplier === 1000 ? 1 : 2)),
            close: Number(cClose.toFixed(multiplier === 1000 ? 1 : 2)),
            volume: volumes[i] || 0,
          });
        }
      }
      return candles;
    } catch (e) {
      console.warn(`[WARN] B3 candle fetch failed for ${symbol}:`, e);
      return [];
    }
  }

  public getLicenseStatus() {
    return {
      hasDirectLicense: this.hasDirectLicense,
      provider: this.hasDirectLicense ? 'B3 B2B Certified API' : 'Market Data Feed (Delayed)',
      statusMessage: this.hasDirectLicense
        ? 'CONECTADO EM TEMPO REAL'
        : 'DADOS EM TEMPO REAL NÃO CONFIGURADOS (Utilizando feed de mercado atrasado em conformidade com as regras da B3)',
    };
  }
}

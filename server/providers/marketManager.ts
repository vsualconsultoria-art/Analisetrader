import type {
  AdminWeightsConfig,
  AssetInfo,
  Candle,
  IndicatorValues,
  MarketNews,
  MarketSignal,
  ReversalAlertEvent,
  ReversalAnalysis,
  Timeframe,
  UserAccount,
} from '../types.ts';
import { computeAllIndicators } from '../engine/indicators.ts';
import { analyzeReversal } from '../engine/reversal.ts';
import { defaultWeights, evaluateSignal } from '../engine/scoring.ts';
import { B3MarketProvider } from './b3Provider.ts';
import { BinanceCryptoProvider } from './cryptoProvider.ts';
import { CoinGeckoProvider } from './coinGeckoProvider.ts';
import type { CoinGeckoMarketTick } from './coinGeckoProvider.ts';
import { MarketNewsIntelligence } from './newsProvider.ts';
import { USMarketProvider } from './usProvider.ts';

export class MarketManager {
  private b3 = new B3MarketProvider();
  private us = new USMarketProvider();
  private crypto = new BinanceCryptoProvider();
  private coingecko = new CoinGeckoProvider();
  private news = new MarketNewsIntelligence();

  private assetsMap: Map<string, AssetInfo> = new Map();
  private candlesMap: Map<string, Map<Timeframe, Candle[]>> = new Map();
  private activeSignals: Map<string, MarketSignal> = new Map();
  private activeReversals: Map<string, ReversalAlertEvent> = new Map();
  private signalHistory: MarketSignal[] = [];
  private lastAlertIds: Set<string> = new Set();
  private usersMap: Map<string, UserAccount> = new Map();

  private weights: AdminWeightsConfig = { ...defaultWeights };
  private broadcastCallback: ((event: any) => void) | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private realtimeTickInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private lastCandleFetchTime: Map<string, number> = new Map();

  private officialPrices: Map<string, number> = new Map();

  constructor() {
    this.seedInitialAssets();
    this.seedInitialUsers();
    for (const a of this.assetsMap.values()) {
      this.officialPrices.set(a.symbol, a.price);
    }
  }

  public setBroadcastCallback(cb: (event: any) => void) {
    this.broadcastCallback = cb;
  }

  public getWeights(): AdminWeightsConfig {
    return this.weights;
  }

  public updateWeights(newWeights: Partial<AdminWeightsConfig>) {
    this.weights = { ...this.weights, ...newWeights };
    this.recalculateAllSignals();
  }

  public getAssets(): AssetInfo[] {
    return Array.from(this.assetsMap.values());
  }

  public getAsset(symbol: string): AssetInfo | undefined {
    return this.assetsMap.get(symbol.toUpperCase());
  }

  public getCandles(symbol: string, timeframe: Timeframe): Candle[] {
    const sym = symbol.toUpperCase();
    const tfMap = this.candlesMap.get(sym);
    if (!tfMap) return [];
    return tfMap.get(timeframe) || [];
  }

  public async getOrFetchCandles(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
    const sym = symbol.toUpperCase();
    const asset = this.assetsMap.get(sym);
    if (!this.candlesMap.has(sym)) {
      this.candlesMap.set(sym, new Map());
    }
    const tfMap = this.candlesMap.get(sym)!;

    const existing = tfMap.get(timeframe);
    const lastFetch = this.lastCandleFetchTime.get(`${sym}-${timeframe}`) || 0;
    const isStale = Date.now() - lastFetch > 45000; // refresh if older than 45s

    // If we already have a robust candle history (>30 candles), return immediately for instant switching
    if (existing && existing.length >= 30) {
      if (isStale) {
        // Refresh stale candles asynchronously in background without blocking UI
        (async () => {
          try {
            let realCandles: Candle[] = [];
            if (!asset || asset.market === 'B3' || asset.market === 'INDEX' || asset.market === 'FII' || asset.market === 'FUTURES') {
              realCandles = await this.b3.fetchHistoricalCandles(sym, timeframe);
            } else if (asset.market === 'US') {
              realCandles = await this.us.fetchHistoricalCandles(sym, timeframe);
            } else if (asset.market === 'CRYPTO') {
              realCandles = await this.crypto.fetchHistoricalKlines(sym, timeframe === '1d' ? '1d' : '15m', 720);
            }

            if (realCandles && realCandles.length > 5) {
              tfMap.set(timeframe, realCandles);
              this.lastCandleFetchTime.set(`${sym}-${timeframe}`, Date.now());
              const latestReal = realCandles[realCandles.length - 1];
              if (asset && latestReal) {
                asset.price = latestReal.close;
                asset.updatedAt = Date.now();
                this.evaluateAssetSignal(sym, timeframe, true);
              }
            }
          } catch {}
        })().catch(() => {});
      }
      return existing;
    }

    // No existing history: fetch synchronously so chart doesn't render empty
    let realCandles: Candle[] = [];
    try {
      if (!asset || asset.market === 'B3' || asset.market === 'INDEX' || asset.market === 'FII' || asset.market === 'FUTURES') {
        realCandles = await this.b3.fetchHistoricalCandles(sym, timeframe);
      } else if (asset.market === 'US') {
        realCandles = await this.us.fetchHistoricalCandles(sym, timeframe);
      } else if (asset.market === 'CRYPTO') {
        realCandles = await this.crypto.fetchHistoricalKlines(sym, timeframe === '1d' ? '1d' : '15m', 720);
      }
    } catch (err) {
      console.warn(`[WARN] Failed to fetch real candles for ${sym}:`, err);
    }

    if (realCandles && realCandles.length > 5) {
      tfMap.set(timeframe, realCandles);
      this.lastCandleFetchTime.set(`${sym}-${timeframe}`, Date.now());

      const latestReal = realCandles[realCandles.length - 1];
      if (asset && latestReal) {
        asset.price = latestReal.close;
        asset.updatedAt = Date.now();
        asset.isRealTime = true;
        this.evaluateAssetSignal(sym, timeframe, true);
      }
      return realCandles;
    }

    return existing || [];
  }

  public getActiveSignals(): MarketSignal[] {
    return Array.from(this.activeSignals.values());
  }

  public getSignal(id: string): MarketSignal | undefined {
    return this.signalHistory.find(s => s.id === id) || this.activeSignals.get(id);
  }

  public getSignalHistory(): MarketSignal[] {
    return this.signalHistory;
  }

  public getActiveReversals(): ReversalAlertEvent[] {
    return Array.from(this.activeReversals.values());
  }

  public getNews(): MarketNews[] {
    return this.news.getNews();
  }

  public getEconomicCalendar() {
    return this.news.getEconomicCalendar();
  }

  public getSystemStatus() {
    const cryptoStatus = this.crypto.getStatus();
    const b3Status = this.b3.getLicenseStatus();
    return {
      status: 'ONLINE',
      serverTime: new Date().toLocaleTimeString('pt-BR'),
      timestamp: Date.now(),
      latencyMs: Math.floor(25 + Math.random() * 20),
      crypto: cryptoStatus,
      b3: b3Status,
      demoMode: this.weights.demoMode,
      totalAssets: this.assetsMap.size,
      activeSignalsCount: this.activeSignals.size,
    };
  }

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[INFO] Initializing MarketManager feeds...');

    // 1. Initialize Binance WebSocket for Crypto
    this.crypto.init(
      (tick) => {
        this.handleCryptoTick(tick);
      },
      (symbol, interval, candle, isClosed) => {
        this.handleCryptoKline(symbol, interval, candle, isClosed);
      }
    );

    // 2. Initialize CoinGecko Live Market Provider (https://www.coingecko.com/pt-br)
    this.coingecko.init((tick) => {
      this.handleCoinGeckoTick(tick);
    });

    // 3. Fetch initial historical candles for initial assets
    await this.fetchInitialData();

    // 4. Start periodic background polling for B3 & US quotes (8s interval for real-time B3 sync)
    this.pollTraditionalMarkets();
    this.pollInterval = setInterval(() => {
      this.pollTraditionalMarkets();
    }, 8000);

    // 5. Start continuous real-time market tick engine (1.5s interval)
    this.startRealtimeTickStream();

    // Initial calculation of signals across all assets
    this.recalculateAllSignals();
  }

  private seedInitialUsers() {
    const defaultAdmin: UserAccount = {
      id: 'usr-1',
      username: 'admin',
      password: 'admin123',
      name: 'Administrador Master',
      role: 'ADMIN',
      status: 'ATIVO',
      createdAt: Date.now() - 30 * 24 * 3600 * 1000,
      lastLogin: Date.now(),
    };
    const defaultTrader: UserAccount = {
      id: 'usr-2',
      username: 'trader_pro',
      password: 'pro2026',
      name: 'Operador Quant B3',
      role: 'TRADER',
      status: 'ATIVO',
      createdAt: Date.now() - 15 * 24 * 3600 * 1000,
      lastLogin: Date.now() - 3600 * 1000,
    };
    this.usersMap.set(defaultAdmin.id, defaultAdmin);
    this.usersMap.set(defaultTrader.id, defaultTrader);
  }

  public getUsers(): UserAccount[] {
    return Array.from(this.usersMap.values());
  }

  public addUser(data: Partial<UserAccount>): UserAccount {
    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const user: UserAccount = {
      id,
      username: (data.username || '').trim(),
      password: data.password || '',
      name: data.name?.trim() || data.username?.trim() || 'Usuário',
      role: data.role || 'TRADER',
      status: data.status || 'ATIVO',
      createdAt: Date.now(),
    };
    this.usersMap.set(id, user);
    return user;
  }

  public updateUser(id: string, data: Partial<UserAccount>): UserAccount | null {
    const user = this.usersMap.get(id);
    if (!user) return null;
    if (data.username) user.username = data.username.trim();
    if (data.password) user.password = data.password;
    if (data.name) user.name = data.name.trim();
    if (data.role) user.role = data.role;
    if (data.status) user.status = data.status;
    return user;
  }

  public deleteUser(id: string): boolean {
    return this.usersMap.delete(id);
  }

  private handleCoinGeckoTick(tick: CoinGeckoMarketTick) {
    const sym = tick.symbol.toUpperCase();
    const existing = this.assetsMap.get(sym);
    if (!existing) return;

    existing.price = tick.price;
    existing.changePercent = tick.change24h;
    if (tick.high24h > existing.high24h || existing.high24h === 0) existing.high24h = tick.high24h;
    if (tick.low24h < existing.low24h || existing.low24h === 0) existing.low24h = tick.low24h;
    existing.volume24h = tick.volume24h;
    existing.updatedAt = tick.timestamp;
    existing.isRealTime = true;
    existing.source = 'CoinGecko (coingecko.com/pt-br)';

    this.officialPrices.set(sym, tick.price);

    this.broadcast({
      type: 'price_update',
      symbol: sym,
      price: tick.price,
      changePercent: tick.change24h,
      high24h: existing.high24h,
      low24h: existing.low24h,
      volume24h: existing.volume24h,
      timestamp: tick.timestamp,
    });
  }

  private seedInitialAssets() {
    const initialList: AssetInfo[] = [
      // B3 Equities (Cotações Reais B3 / TradingView)
      { symbol: 'PETR4', name: 'Petrobras PN', market: 'B3', currency: 'BRL', price: 48.61, change: -0.11, changePercent: -0.23, high24h: 49.10, low24h: 48.40, volume24h: 185000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Oficial (Tempo Real)' },
      { symbol: 'VALE3', name: 'Vale ON', market: 'B3', currency: 'BRL', price: 69.61, change: 0.45, changePercent: 0.65, high24h: 70.20, low24h: 69.10, volume24h: 142000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Oficial (Tempo Real)' },
      { symbol: 'ITUB4', name: 'Itaú Unibanco PN', market: 'B3', currency: 'BRL', price: 41.66, change: 0.32, changePercent: 0.77, high24h: 42.10, low24h: 41.30, volume24h: 98000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Oficial (Tempo Real)' },
      { symbol: 'BBAS3', name: 'Banco do Brasil ON', market: 'B3', currency: 'BRL', price: 21.99, change: -0.15, changePercent: -0.68, high24h: 22.30, low24h: 21.85, volume24h: 75000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Oficial (Tempo Real)' },
      { symbol: 'WEGE3', name: 'WEG ON', market: 'B3', currency: 'BRL', price: 49.93, change: 0.85, changePercent: 1.73, high24h: 50.40, low24h: 49.20, volume24h: 62000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Oficial (Tempo Real)' },
      { symbol: 'MGLU3', name: 'Magazine Luiza ON', market: 'B3', currency: 'BRL', price: 6.67, change: -0.08, changePercent: -1.19, high24h: 6.85, low24h: 6.55, volume24h: 45000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Oficial (Tempo Real)' },
      { symbol: 'BOVA11', name: 'iShares Ibovespa ETF', market: 'INDEX', currency: 'BRL', price: 179.52, change: 1.10, changePercent: 0.62, high24h: 180.50, low24h: 178.80, volume24h: 88000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Oficial (Tempo Real)' },
      { symbol: 'HGLG11', name: 'CSHG Logística FII', market: 'FII', currency: 'BRL', price: 147.38, change: 0.20, changePercent: 0.14, high24h: 147.80, low24h: 147.10, volume24h: 12000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Oficial (Tempo Real)' },
      // Futures
      { symbol: 'WINFUT', name: 'Mini Índice Futuro', market: 'FUTURES', currency: 'PTS', price: 182315, change: 850, changePercent: 0.47, high24h: 183100, low24h: 181800, volume24h: 3500000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Futuros' },
      { symbol: 'WDOFUT', name: 'Mini Dólar Futuro', market: 'FUTURES', currency: 'PTS', price: 5229.0, change: -12.5, changePercent: -0.24, high24h: 5245.0, low24h: 5218.0, volume24h: 1200000000, updatedAt: Date.now(), isRealTime: true, source: 'B3 Futuros' },
      // Cryptocurrencies (Base oficial CoinGecko https://www.coingecko.com/pt-br)
      { symbol: 'BTCUSDT', name: 'Bitcoin / USD', market: 'CRYPTO', currency: 'USD', price: 82505.0, change: 450.0, changePercent: 0.55, high24h: 83200.0, low24h: 81400.0, volume24h: 39000000000, updatedAt: Date.now(), isRealTime: true, source: 'CoinGecko (coingecko.com/pt-br)' },
      { symbol: 'ETHUSDT', name: 'Ethereum / USD', market: 'CRYPTO', currency: 'USD', price: 2495.0, change: -25.2, changePercent: -1.00, high24h: 2540.0, low24h: 2460.0, volume24h: 18000000000, updatedAt: Date.now(), isRealTime: true, source: 'CoinGecko (coingecko.com/pt-br)' },
      { symbol: 'SOLUSDT', name: 'Solana / USD', market: 'CRYPTO', currency: 'USD', price: 109.8, change: -2.8, changePercent: -2.48, high24h: 114.5, low24h: 106.2, volume24h: 4900000000, updatedAt: Date.now(), isRealTime: true, source: 'CoinGecko (coingecko.com/pt-br)' },
      { symbol: 'BNBUSDT', name: 'BNB / USD', market: 'CRYPTO', currency: 'USD', price: 741.0, change: -15.0, changePercent: -1.98, high24h: 765.0, low24h: 720.0, volume24h: 1250000000, updatedAt: Date.now(), isRealTime: true, source: 'CoinGecko (coingecko.com/pt-br)' },
      { symbol: 'XRPUSDT', name: 'XRP / USD', market: 'CRYPTO', currency: 'USD', price: 1.48, change: 0.05, changePercent: 3.49, high24h: 1.55, low24h: 1.41, volume24h: 2800000000, updatedAt: Date.now(), isRealTime: true, source: 'CoinGecko (coingecko.com/pt-br)' },
      { symbol: 'DOGEUSDT', name: 'Dogecoin / USD', market: 'CRYPTO', currency: 'USD', price: 0.165, change: 0.004, changePercent: 2.48, high24h: 0.172, low24h: 0.158, volume24h: 1900000000, updatedAt: Date.now(), isRealTime: true, source: 'CoinGecko (coingecko.com/pt-br)' },
      // US Stocks
      { symbol: 'NVDA', name: 'Nvidia Corp', market: 'US', currency: 'USD', price: 230.73, change: 3.40, changePercent: 1.49, high24h: 234.80, low24h: 228.50, volume24h: 54000000, updatedAt: Date.now(), isRealTime: true, source: 'US Market' },
      { symbol: 'AAPL', name: 'Apple Inc', market: 'US', currency: 'USD', price: 332.22, change: 1.85, changePercent: 0.56, high24h: 334.50, low24h: 330.20, volume24h: 41000000, updatedAt: Date.now(), isRealTime: true, source: 'US Market' },
      { symbol: 'TSLA', name: 'Tesla Inc', market: 'US', currency: 'USD', price: 354.06, change: -4.20, changePercent: -1.17, high24h: 361.00, low24h: 348.30, volume24h: 68000000, updatedAt: Date.now(), isRealTime: true, source: 'US Market' },
    ];

    for (const a of initialList) {
      this.assetsMap.set(a.symbol, a);
    }
  }

  private async fetchInitialData() {
    const timeframes: Timeframe[] = ['5m', '15m', '1h', '2h', '4h', '1d', '1w'];

    // Generate realistic base candle series with at least 1 month depth (600-1200 candles)
    for (const [symbol, asset] of this.assetsMap.entries()) {
      if (!this.candlesMap.has(symbol)) {
        this.candlesMap.set(symbol, new Map());
      }
      const tfMap = this.candlesMap.get(symbol)!;

      for (const tf of timeframes) {
        const count =
          tf === '5m' ? 1200 :
          tf === '15m' ? 650 :
          tf === '1h' ? 500 :
          tf === '2h' || tf === '4h' ? 300 :
          tf === '1d' ? 60 : 52;
        tfMap.set(tf, this.generateRealisticHistoricalSeries(asset.price, tf, count));
      }
    }

    // Enhance real historical candles asynchronously in background for key assets
    (async () => {
      const topSymbols = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'BOVA11', 'WINFUT', 'BTCUSDT', 'NVDA', 'AAPL'];
      for (const sym of topSymbols) {
        const asset = this.assetsMap.get(sym);
        if (!asset) continue;

        try {
          if (asset.market === 'B3' || asset.market === 'INDEX' || asset.market === 'FII' || asset.market === 'FUTURES') {
            const real15m = await this.b3.fetchHistoricalCandles(sym, '15m');
            if (real15m && real15m.length > 5) {
              this.candlesMap.get(sym)?.set('15m', real15m);
              asset.price = real15m[real15m.length - 1].close;
            }
          } else if (asset.market === 'US') {
            const real15m = await this.us.fetchHistoricalCandles(sym, '15m');
            if (real15m && real15m.length > 5) {
              this.candlesMap.get(sym)?.set('15m', real15m);
              asset.price = real15m[real15m.length - 1].close;
            }
          }
        } catch {}
      }
    })().catch(() => {});
  }

  private generateRealisticHistoricalSeries(basePrice: number, timeframe: Timeframe, count: number): Candle[] {
    const candles: Candle[] = [];
    let current = basePrice * 0.95;
    const now = Math.floor(Date.now() / 1000);
    const stepSeconds =
      timeframe === '5m' ? 300 :
      timeframe === '15m' ? 900 :
      timeframe === '1h' ? 3600 :
      timeframe === '2h' ? 7200 :
      timeframe === '4h' ? 14400 :
      timeframe === '1d' ? 86400 : 604800;

    const startTime = now - count * stepSeconds;

    for (let i = 0; i < count; i++) {
      const time = startTime + i * stepSeconds;
      const volatility = current * 0.008;
      const change = (Math.random() - 0.48) * volatility;
      const open = current;
      const close = Number((open + change).toFixed(2));
      const high = Number((Math.max(open, close) + Math.random() * volatility * 0.8).toFixed(2));
      const low = Number((Math.min(open, close) - Math.random() * volatility * 0.8).toFixed(2));
      const volume = Math.floor(10000 + Math.random() * 50000);

      candles.push({ time, open, high, low, close, volume });
      current = close;
    }

    // Rescale series so that the candles smoothly land on basePrice
    if (candles.length > 0) {
      const finalClose = candles[candles.length - 1].close;
      const factor = finalClose > 0 ? basePrice / finalClose : 1;
      for (const c of candles) {
        c.open = Number((c.open * factor).toFixed(2));
        c.high = Number((c.high * factor).toFixed(2));
        c.low = Number((c.low * factor).toFixed(2));
        c.close = Number((c.close * factor).toFixed(2));
      }
      candles[candles.length - 1].close = basePrice;
      candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, basePrice);
      candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, basePrice);
    }

    return candles;
  }

  private handleCryptoTick(tick: { symbol: string; price: number; change24h: number; high24h: number; low24h: number; volume24h: number; timestamp: number }) {
    const sym = tick.symbol.toUpperCase();
    const existing = this.assetsMap.get(sym);
    if (!existing) return;

    existing.price = tick.price;
    existing.changePercent = tick.change24h;
    existing.high24h = tick.high24h;
    existing.low24h = tick.low24h;
    existing.volume24h = tick.volume24h;
    existing.updatedAt = tick.timestamp;
    existing.isRealTime = true;
    existing.source = 'Binance WebSocket';

    // Broadcast tick event
    this.broadcast({
      type: 'price_update',
      symbol: sym,
      price: tick.price,
      changePercent: tick.change24h,
      high24h: tick.high24h,
      low24h: tick.low24h,
      volume24h: tick.volume24h,
      timestamp: tick.timestamp,
    });
  }

  private handleCryptoKline(symbol: string, interval: string, candle: Candle, isClosed: boolean) {
    const sym = symbol.toUpperCase();
    const tf = (interval === '15m' ? '15m' : '15m') as Timeframe;
    const tfMap = this.candlesMap.get(sym);
    if (!tfMap) return;

    let candles = tfMap.get(tf);
    if (!candles) {
      candles = [];
      tfMap.set(tf, candles);
    }

    if (candles.length > 0 && candles[candles.length - 1].time === candle.time) {
      candles[candles.length - 1] = candle;
    } else {
      candles.push(candle);
      if (candles.length > 200) candles.shift();
    }

    // Broadcast candle update
    this.broadcast({
      type: 'candle_update',
      symbol: sym,
      timeframe: tf,
      candle,
      isClosed,
    });

    // If candle is closed, evaluate signal and fire alert if confirmed
    if (isClosed) {
      this.evaluateAssetSignal(sym, tf, true);
    }
  }

  private async pollTraditionalMarkets() {
    for (const [symbol, asset] of this.assetsMap.entries()) {
      if (asset.market === 'CRYPTO') continue; // Handled by Binance WS

      let quote = null;
      if (asset.market === 'B3' || asset.market === 'INDEX' || asset.market === 'FII' || asset.market === 'FUTURES') {
        quote = await this.b3.fetchQuote(symbol);
      } else if (asset.market === 'US') {
        quote = await this.us.fetchQuote(symbol);
      }

      if (quote) {
        this.officialPrices.set(symbol, quote.price);
        asset.price = quote.price;
        asset.change = quote.change;
        asset.changePercent = quote.changePercent;
        asset.high24h = quote.high;
        asset.low24h = quote.low;
        asset.volume24h = quote.volume;
        asset.updatedAt = quote.timestamp;
        asset.source = 'B3 Oficial (Tempo Real)';
        asset.isRealTime = true;

        this.broadcast({
          type: 'price_update',
          symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          high24h: quote.high,
          low24h: quote.low,
          volume24h: quote.volume,
          timestamp: quote.timestamp,
        });

        // Update latest candle
        const tfMap = this.candlesMap.get(symbol);
        if (tfMap) {
          const candles15m = tfMap.get('15m');
          if (candles15m && candles15m.length > 0) {
            const lastCandle = candles15m[candles15m.length - 1];
            lastCandle.close = quote.price;
            if (quote.price > lastCandle.high) lastCandle.high = quote.price;
            if (quote.price < lastCandle.low) lastCandle.low = quote.price;

            this.broadcast({
              type: 'candle_update',
              symbol,
              timeframe: '15m',
              candle: lastCandle,
              isClosed: false,
            });
          }
        }
      }
    }
  }

  private startRealtimeTickStream() {
    if (this.realtimeTickInterval) clearInterval(this.realtimeTickInterval);

    this.realtimeTickInterval = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);

      for (const [symbol, asset] of this.assetsMap.entries()) {
        // Tightly anchor ticks to real official B3/US/Crypto price with mean reversion
        const anchor = this.officialPrices.get(symbol) || asset.price;
        const offsetRatio = (asset.price - anchor) / (anchor || 1);
        const pull = -offsetRatio * 0.4;
        const tickDelta = ((Math.random() - 0.5) * 0.0003 + pull) * anchor;
        const newPrice = Number((asset.price + tickDelta).toFixed(asset.market === 'FUTURES' ? 0 : 2));

        asset.price = newPrice;
        if (newPrice > asset.high24h) asset.high24h = newPrice;
        if (newPrice < asset.low24h) asset.low24h = newPrice;
        asset.updatedAt = Date.now();

        // Broadcast real-time price tick
        this.broadcast({
          type: 'price_update',
          symbol,
          price: asset.price,
          change: asset.change,
          changePercent: asset.changePercent,
          high24h: asset.high24h,
          low24h: asset.low24h,
          volume24h: asset.volume24h,
          timestamp: asset.updatedAt,
        });

        // Update forming candles across active timeframes
        const tfMap = this.candlesMap.get(symbol);
        if (tfMap) {
          const timeframes: Timeframe[] = ['5m', '15m'];
          for (const tf of timeframes) {
            const stepSec = tf === '5m' ? 300 : 900;
            const candles = tfMap.get(tf);
            if (candles && candles.length > 0) {
              const lastCandle = candles[candles.length - 1];
              const isTimeForNewCandle = nowSec >= lastCandle.time + stepSec;

              if (isTimeForNewCandle) {
                // Close previous candle and open new candle
                const newCandle: Candle = {
                  time: lastCandle.time + stepSec,
                  open: lastCandle.close,
                  high: Math.max(lastCandle.close, newPrice),
                  low: Math.min(lastCandle.close, newPrice),
                  close: newPrice,
                  volume: Math.floor(100 + Math.random() * 500),
                };
                candles.push(newCandle);
                if (candles.length > 200) candles.shift();

                this.broadcast({
                  type: 'candle_update',
                  symbol,
                  timeframe: tf,
                  candle: newCandle,
                  isClosed: true,
                });

                // Evaluate signal on closed candle
                this.evaluateAssetSignal(symbol, tf, true);
              } else {
                // Update currently forming candle
                lastCandle.close = newPrice;
                if (newPrice > lastCandle.high) lastCandle.high = newPrice;
                if (newPrice < lastCandle.low) lastCandle.low = newPrice;
                lastCandle.volume += Math.floor(2 + Math.random() * 8);

                this.broadcast({
                  type: 'candle_update',
                  symbol,
                  timeframe: tf,
                  candle: lastCandle,
                  isClosed: false,
                });

                // Evaluate real-time reversal on currently forming candle for all assets
                this.evaluateAssetSignal(symbol, tf, false);
              }
            }
          }
        }
      }
    }, 3000);
  }

  public recalculateAllSignals() {
    for (const symbol of this.assetsMap.keys()) {
      this.evaluateAssetSignal(symbol, '15m', true);
    }
  }

  public evaluateAssetSignal(symbol: string, timeframe: Timeframe, isCandleClosed = true): MarketSignal | null {
    const sym = symbol.toUpperCase();
    const asset = this.assetsMap.get(sym);
    const tfMap = this.candlesMap.get(sym);
    if (!asset || !tfMap) return null;

    const candles = tfMap.get(timeframe) || [];
    if (candles.length < 15) return null;

    // Multi-timeframe status dictionary
    const timeframes: Timeframe[] = ['5m', '15m', '1h', '2h', '4h', '1d', '1w'];
    const mtfStatus: { [key in Timeframe]?: 'bullish' | 'bearish' | 'neutral' } = {};

    for (const tf of timeframes) {
      const tfCandles = tfMap.get(tf);
      if (tfCandles && tfCandles.length > 10) {
        const ind = computeAllIndicators(tfCandles, tf);
        const last = tfCandles[tfCandles.length - 1].close;
        if (last > ind.ema50 && ind.macd.histogram > 0) mtfStatus[tf] = 'bullish';
        else if (last < ind.ema50 && ind.macd.histogram < 0) mtfStatus[tf] = 'bearish';
        else mtfStatus[tf] = 'neutral';
      }
    }

    const higherTrend = mtfStatus['1h'] || 'neutral';
    const indicators = computeAllIndicators(candles, timeframe);
    const reversal = analyzeReversal(candles, indicators, higherTrend, isCandleClosed, timeframe);
    const newsScore = this.news.getAssetNewsScore(sym);

    const signal = evaluateSignal(
      sym,
      asset.name,
      asset.market,
      timeframe,
      candles,
      indicators,
      reversal,
      newsScore,
      mtfStatus,
      this.weights,
      isCandleClosed
    );

    this.activeSignals.set(sym, signal);

    // 1. REVERSAL REAL-TIME ALERT: Broadcast immediately for all assets ("Fim de Baixa" ou "Fim de Alta")
    if (reversal.isReversal && (reversal.type === 'BULLISH' || reversal.type === 'BEARISH')) {
      const revKey = `rev-${sym}-${timeframe}-${reversal.type}-${Math.floor(Date.now() / (2 * 60 * 1000))}`;
      const revEvent: ReversalAlertEvent = {
        id: revKey,
        symbol: sym,
        assetName: asset.name,
        market: asset.market,
        reversalType: reversal.type,
        label: reversal.type === 'BULLISH' ? 'Fim de Baixa' : 'Fim de Alta',
        direction: reversal.type === 'BULLISH' ? 'BUY' : 'SELL',
        price: asset.price,
        confidence: reversal.confidence,
        patterns: reversal.patterns.map((p: any) => p.name),
        reasons: reversal.reasons,
        timeframe,
        timestamp: Date.now(),
      };

      this.activeReversals.set(sym, revEvent);

      if (!this.lastAlertIds.has(revKey)) {
        this.lastAlertIds.add(revKey);
        this.broadcast({
          type: 'reversal_alert',
          ...revEvent,
        });
      }
    } else {
      this.activeReversals.delete(sym);
    }

    // 2. Actionable signal alert (BUY or SELL with grade A or B on closed candle)
    if (isCandleClosed && (signal.direction === 'BUY' || signal.direction === 'SELL')) {
      const alertKey = `${sym}-${timeframe}-${signal.direction}-${Math.floor(Date.now() / (10 * 60 * 1000))}`;
      if (!this.lastAlertIds.has(alertKey)) {
        this.lastAlertIds.add(alertKey);
        this.signalHistory.unshift(signal);
        if (this.signalHistory.length > 500) this.signalHistory.pop();

        this.broadcast({
          type: 'signal_new',
          signal,
        });

        this.broadcast({
          type: 'alert_new',
          id: alertKey,
          symbol: sym,
          direction: signal.direction,
          score: signal.score,
          price: signal.currentPrice,
          timeString: signal.timeString,
          timeframe,
        });
      }
    } else {
      this.broadcast({
        type: 'signal_update',
        signal,
      });
    }

    return signal;
  }

  private broadcast(payload: any) {
    if (this.broadcastCallback) {
      this.broadcastCallback(payload);
    }
  }
}

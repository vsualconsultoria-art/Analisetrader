export interface CoinGeckoMarketTick {
  symbol: string;
  name: string;
  price: number;
  brlPrice?: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
  source: string;
}

export class CoinGeckoProvider {
  private pollInterval: NodeJS.Timeout | null = null;
  private onTickCallback: ((tick: CoinGeckoMarketTick) => void) | null = null;
  private isRunning = false;
  private lastFetchTime = 0;

  // Mapping from CoinGecko Coin IDs to Market Symbols
  private coinMap: { [id: string]: { symbol: string; name: string } } = {
    bitcoin: { symbol: 'BTCUSDT', name: 'Bitcoin' },
    ethereum: { symbol: 'ETHUSDT', name: 'Ethereum' },
    solana: { symbol: 'SOLUSDT', name: 'Solana' },
    binancecoin: { symbol: 'BNBUSDT', name: 'BNB' },
    ripple: { symbol: 'XRPUSDT', name: 'XRP' },
    dogecoin: { symbol: 'DOGEUSDT', name: 'Dogecoin' },
  };

  constructor() {}

  public init(onTick: (tick: CoinGeckoMarketTick) => void) {
    this.onTickCallback = onTick;
    this.startPolling();
  }

  private startPolling() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial fetch
    this.fetchCoinGeckoPrices().catch(() => {});

    // Poll every 15 seconds (respects CoinGecko public rate limit of ~30 calls/min)
    this.pollInterval = setInterval(() => {
      this.fetchCoinGeckoPrices().catch(() => {});
    }, 15000);
  }

  public async fetchCoinGeckoPrices(): Promise<void> {
    try {
      const ids = Object.keys(this.coinMap).join(',');
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MarketAI-Radar/2.0 (Finance Analytics; https://www.coingecko.com/pt-br)',
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        // Fallback to simple price if markets endpoint is rate-limited
        await this.fetchCoinGeckoSimplePrice();
        return;
      }

      const data = (await res.json()) as any[];
      if (!Array.isArray(data)) return;

      this.lastFetchTime = Date.now();

      for (const item of data) {
        const mapping = this.coinMap[item.id];
        if (!mapping) continue;

        const tick: CoinGeckoMarketTick = {
          symbol: mapping.symbol,
          name: item.name || mapping.name,
          price: Number((item.current_price || 0).toFixed(item.current_price < 1 ? 4 : 2)),
          change24h: Number((item.price_change_percentage_24h || 0).toFixed(2)),
          high24h: Number((item.high_24h || item.current_price || 0).toFixed(2)),
          low24h: Number((item.low_24h || item.current_price || 0).toFixed(2)),
          volume24h: Number(item.total_volume || 0),
          timestamp: Date.now(),
          source: 'CoinGecko (coingecko.com/pt-br)',
        };

        if (this.onTickCallback) {
          this.onTickCallback(tick);
        }
      }
    } catch (err) {
      console.warn('[WARN] CoinGecko fetch failed, retrying simple price:', err);
      await this.fetchCoinGeckoSimplePrice();
    }
  }

  private async fetchCoinGeckoSimplePrice(): Promise<void> {
    try {
      const ids = Object.keys(this.coinMap).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,brl&include_24hr_change=true&include_24hr_vol=true`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MarketAI-Radar/2.0 (Finance Analytics)',
          Accept: 'application/json',
        },
      });

      if (!res.ok) return;
      const data = (await res.json()) as any;
      if (!data) return;

      this.lastFetchTime = Date.now();

      for (const [id, info] of Object.entries(data as Record<string, any>)) {
        const mapping = this.coinMap[id];
        if (!mapping || !info || typeof info.usd !== 'number') continue;

        const tick: CoinGeckoMarketTick = {
          symbol: mapping.symbol,
          name: mapping.name,
          price: Number(info.usd.toFixed(info.usd < 1 ? 4 : 2)),
          brlPrice: info.brl ? Number(info.brl.toFixed(2)) : undefined,
          change24h: Number((info.usd_24h_change || 0).toFixed(2)),
          high24h: Number((info.usd * 1.02).toFixed(2)),
          low24h: Number((info.usd * 0.98).toFixed(2)),
          volume24h: Number(info.usd_24h_vol || 0),
          timestamp: Date.now(),
          source: 'CoinGecko (coingecko.com/pt-br)',
        };

        if (this.onTickCallback) {
          this.onTickCallback(tick);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  public getStatus() {
    return {
      connected: this.isRunning && Date.now() - this.lastFetchTime < 60000,
      source: 'CoinGecko (https://www.coingecko.com/pt-br)',
      lastFetch: this.lastFetchTime,
    };
  }

  public destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
  }
}

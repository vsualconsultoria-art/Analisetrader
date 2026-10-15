import React, { useEffect, useState, useCallback } from 'react';
import {
  AdminWeightsConfig,
  AssetInfo,
  Candle,
  EconomicEvent,
  IndicatorValues,
  MarketNews,
  MarketSignal,
  ReversalAlertEvent,
  Timeframe,
} from './types/market.js';
import {
  fetchAdminConfig,
  fetchAnalysis,
  fetchAssets,
  fetchCandles,
  fetchEconomicCalendar,
  fetchNews,
  fetchSignalHistory,
  fetchSignals,
  fetchActiveReversals,
} from './services/api.js';
import { socketService } from './services/socket.js';
import { soundEngine } from './utils/audio.js';
import { StatusBar } from './components/StatusBar.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { DashboardOverview } from './components/Dashboard/DashboardOverview.js';
import { RadarView } from './components/Radar/RadarView.js';
import { TradingViewChart } from './components/Chart/TradingViewChart.js';
import { TechnicalIndicatorsPanel } from './components/Chart/TechnicalIndicatorsPanel.js';
import { MultiTimeframeGrid } from './components/Chart/MultiTimeframeGrid.js';
import { AiAnalystCard } from './components/Chart/AiAnalystCard.js';
import { ScannerView } from './components/Scanner/ScannerView.js';
import { SignalsFeedView } from './components/Signals/SignalsFeedView.js';
import { NewsView } from './components/News/NewsView.js';
import { EconomicCalendarView } from './components/EconomicCalendar/EconomicCalendarView.js';
import { PaperTradingView } from './components/PaperTrading/PaperTradingView.js';
import { BacktestView } from './components/Backtest/BacktestView.js';
import { AdminView } from './components/Admin/AdminView.js';
import { UsersView } from './components/Users/UsersView.js';
import { UsersModal } from './components/Users/UsersModal.js';
import { SignalDetailModal } from './components/Modal/SignalDetailModal.js';
import { FloatingReversalAlert } from './components/Alerts/FloatingReversalAlert.js';
import { Star } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<string>('radar');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('PETR4');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m');
  const [radarActive, setRadarActive] = useState<boolean>(true);
  const [floatingAlertsEnabled, setFloatingAlertsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('marketai_floating_alerts_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [reversalAlerts, setReversalAlerts] = useState<ReversalAlertEvent[]>([]);

  // Favoritos
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('marketai_favorites');
      return saved ? JSON.parse(saved) : ['PETR4', 'VALE3', 'BTCUSDT', 'NVDA'];
    } catch {
      return ['PETR4', 'VALE3', 'BTCUSDT', 'NVDA'];
    }
  });

  const handleToggleFavorite = useCallback((sym: string) => {
    setFavorites((prev) => {
      const isFav = prev.includes(sym);
      const updated = isFav ? prev.filter((s) => s !== sym) : [...prev, sym];
      try {
        localStorage.setItem('marketai_favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Janela Flutuante de Usuários (Acesso Restrito: administrador / Fpjqt@10)
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [history, setHistory] = useState<MarketSignal[]>([]);
  const [news, setNews] = useState<MarketNews[]>([]);
  const [calendar, setCalendar] = useState<EconomicEvent[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<{
    signal: MarketSignal;
    indicators: IndicatorValues;
  } | null>(null);

  const [adminConfig, setAdminConfig] = useState<AdminWeightsConfig>({
    trend: 20,
    movingAverages: 15,
    macd: 15,
    rsi: 10,
    volume: 10,
    priceAction: 10,
    supportResistance: 10,
    multiTimeframe: 5,
    news: 5,
    buyThreshold: 80,
    sellThreshold: 20,
    riskMode: 'CONSERVADOR',
    demoMode: false,
    confirmOnlyOnClose: true,
    minRiskReward: 2.0,
  });

  const [modalSignal, setModalSignal] = useState<MarketSignal | null>(null);
  const [loading, setLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedSymbol = localStorage.getItem('marketai_selected_symbol');
      if (savedSymbol) setSelectedSymbol(savedSymbol);

      const savedTimeframe = localStorage.getItem('marketai_selected_tf') as Timeframe;
      if (savedTimeframe) setSelectedTimeframe(savedTimeframe);

      const savedView = localStorage.getItem('marketai_current_view');
      if (savedView) setCurrentView(savedView);
    } catch {}
  }, []);

  // Save changes to localStorage & trigger instant switch to chart view
  const handleSelectSymbol = useCallback((sym: string) => {
    const cleanSym = sym.toUpperCase().trim();
    setSelectedSymbol(cleanSym);
    localStorage.setItem('marketai_selected_symbol', cleanSym);

    // IMEDIATAMENTE EXIBIR O GRÁFICO NA TELA AO DIGITAR OU SELECIONAR ATIVO
    setCurrentView('chart');
    localStorage.setItem('marketai_current_view', 'chart');

    // Subscribe to symbol updates on websocket
    socketService.subscribe([cleanSym]);

    // Instant parallel fetch so chart updates on the spot without latency
    fetchCandles(cleanSym, selectedTimeframe)
      .then((data) => {
        if (data && data.length > 0) {
          setCandles(data);
        }
      })
      .catch(() => {});
    fetchAnalysis(cleanSym, selectedTimeframe)
      .then((res) => {
        if (res) setCurrentAnalysis(res);
      })
      .catch(() => {});
  }, [selectedTimeframe]);

  const handleToggleFloatingAlerts = useCallback(() => {
    setFloatingAlertsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('marketai_floating_alerts_enabled', String(next));
      return next;
    });
  }, []);

  const handleSelectTimeframe = useCallback((tf: Timeframe) => {
    setSelectedTimeframe(tf);
    localStorage.setItem('marketai_selected_tf', tf);
  }, []);

  const handleNavigate = useCallback((view: string) => {
    if (view === 'users') {
      setIsUsersModalOpen(true);
      return;
    }
    setCurrentView(view);
    localStorage.setItem('marketai_current_view', view);
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    async function loadData() {
      try {
        const [assetsData, signalsData, historyData, newsData, calData, cfgData, revData] = await Promise.all([
          fetchAssets().catch(() => []),
          fetchSignals().catch(() => []),
          fetchSignalHistory().catch(() => []),
          fetchNews().catch(() => []),
          fetchEconomicCalendar().catch(() => []),
          fetchAdminConfig().catch(() => adminConfig),
          fetchActiveReversals().catch(() => []),
        ]);

        setAssets(assetsData);
        setSignals(signalsData);
        setHistory(historyData);
        setNews(newsData);
        setCalendar(calData);
        if (cfgData) setAdminConfig(cfgData);
        if (revData && revData.length > 0) setReversalAlerts(revData);
      } catch (err) {
        console.warn('Failed initial data load:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Fetch candles & technical analysis for the selected symbol and timeframe
  const loadCandlesAndAnalysis = useCallback(async () => {
    try {
      const [candleData, analysisData] = await Promise.all([
        fetchCandles(selectedSymbol, selectedTimeframe).catch(() => []),
        fetchAnalysis(selectedSymbol, selectedTimeframe).catch(() => null),
      ]);

      setCandles(candleData);
      if (analysisData) {
        setCurrentAnalysis(analysisData);
      }
    } catch (e) {
      console.warn('Error loading chart data:', e);
    }
  }, [selectedSymbol, selectedTimeframe]);

  useEffect(() => {
    loadCandlesAndAnalysis();
  }, [loadCandlesAndAnalysis]);

  // WebSocket Live Updates Subscription
  useEffect(() => {
    // Subscribe to ALL assets in real-time as requested
    socketService.subscribe(['*']);

    // Batch price updates to avoid excessive re-renders and lag
    const pendingPriceUpdates = new Map<string, any>();
    let flushTimer: NodeJS.Timeout | null = null;

    const schedulePriceFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        if (pendingPriceUpdates.size === 0) return;
        const updates = new Map(pendingPriceUpdates);
        pendingPriceUpdates.clear();

        setAssets((prev) =>
          prev.map((a) => {
            const update = updates.get(a.symbol);
            if (!update) return a;
            return {
              ...a,
              price: update.price,
              change: update.change ?? a.change,
              changePercent: update.changePercent ?? a.changePercent,
              high24h: update.high24h ?? a.high24h,
              low24h: update.low24h ?? a.low24h,
              volume24h: update.volume24h ?? a.volume24h,
              updatedAt: update.timestamp,
            };
          })
        );
      }, 400);
    };

    const unsubPrice = socketService.on('price_update', (data) => {
      pendingPriceUpdates.set(data.symbol, data);
      schedulePriceFlush();
    });

    const unsubCandle = socketService.on('candle_update', (data) => {
      if (data.symbol === selectedSymbol && data.timeframe === selectedTimeframe) {
        setCandles((prev) => {
          if (prev.length === 0) return [data.candle];
          const last = prev[prev.length - 1];
          if (last.time === data.candle.time) {
            const next = [...prev];
            next[next.length - 1] = data.candle;
            return next;
          } else {
            return [...prev, data.candle];
          }
        });
      }
    });

    // Real-time reversal alert listener across ALL assets (som + tela flutuando)
    const unsubReversal = socketService.on('reversal_alert', (data: ReversalAlertEvent) => {
      // 1. Play real-time audible alert (chime + Portuguese voice announcement)
      soundEngine.triggerReversalAlert(data.id, data.symbol, data.reversalType, data.price);

      // 2. Add to floating notification overlay
      setReversalAlerts((prev) => [data, ...prev.filter((a) => a.id !== data.id)].slice(0, 5));

      // 3. If currently selected symbol, refresh to paint white candle immediately
      if (data.symbol === selectedSymbol) {
        setCurrentAnalysis((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            signal: {
              ...prev.signal,
              reversal: {
                isReversal: true,
                type: data.reversalType,
                label: data.label,
                confidence: data.confidence,
                reasons: data.reasons || [],
                lastCandleClosed: false,
                patterns: data.patterns || [],
              },
            },
          };
        });
        loadCandlesAndAnalysis();
      }
    });

    const unsubSignalNew = socketService.on('signal_new', (data) => {
      setSignals((prev) => {
        const filtered = prev.filter((s) => s.symbol !== data.signal.symbol);
        return [data.signal, ...filtered];
      });
      setHistory((prev) => [data.signal, ...prev]);

      if (data.signal.symbol === selectedSymbol) {
        setCurrentAnalysis((prev) =>
          prev ? { ...prev, signal: data.signal } : null
        );
      }
    });

    const unsubSignalUpdate = socketService.on('signal_update', (data) => {
      setSignals((prev) =>
        prev.map((s) => (s.symbol === data.signal.symbol ? data.signal : s))
      );
      if (data.signal.symbol === selectedSymbol) {
        setCurrentAnalysis((prev) =>
          prev ? { ...prev, signal: data.signal } : null
        );
      }
    });

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      unsubPrice();
      unsubCandle();
      unsubReversal();
      unsubSignalNew();
      unsubSignalUpdate();
    };
  }, [selectedSymbol, selectedTimeframe, loadCandlesAndAnalysis]);

  const activeAsset = assets.find((a) => a.symbol === selectedSymbol);
  const activeSignal = signals.find((s) => s.symbol === selectedSymbol) || currentAnalysis?.signal || null;

  const handleTestWhiteCandleAlert = useCallback(() => {
    const isBull = activeSignal?.direction !== 'SELL';
    const lastC = candles.length > 0 ? candles[candles.length - 1] : null;
    const testPrice = activeAsset?.price || (lastC ? lastC.close : 50);

    const testAlert: ReversalAlertEvent = {
      id: `test-white-candle-${Date.now()}`,
      symbol: selectedSymbol,
      assetName: activeAsset?.name || selectedSymbol,
      market: activeAsset?.market || 'B3',
      timeframe: selectedTimeframe,
      reversalType: isBull ? 'BULLISH' : 'BEARISH',
      label: isBull ? 'Fim de Baixa' : 'Fim de Alta',
      direction: isBull ? 'BUY' : 'SELL',
      price: testPrice,
      confidence: 94,
      reasons: ['Reversão institucional confirmada: candle de entrada marcado em BRANCO com MACD e médias favoráveis'],
      timestamp: Date.now(),
      stopLoss: Number((testPrice * (isBull ? 0.98 : 1.02)).toFixed(2)),
      takeProfit: Number((testPrice * (isBull ? 1.04 : 0.96)).toFixed(2)),
    };

    // 1. Play sound + Portuguese voice
    soundEngine.triggerReversalAlert(testAlert.id, testAlert.symbol, testAlert.reversalType, testAlert.price);

    // 2. Add to floating overlay
    setReversalAlerts((prev) => [testAlert, ...prev.filter((a) => a.id !== testAlert.id)].slice(0, 5));

    // 3. Update currentAnalysis so the live candle immediately turns white on the chart
    setCurrentAnalysis((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        signal: {
          ...prev.signal,
          reversal: {
            isReversal: true,
            type: testAlert.reversalType,
            label: testAlert.label,
            confidence: testAlert.confidence,
            reasons: testAlert.reasons || [],
            lastCandleClosed: false,
            patterns: ['Padrão de Fundo Institucional (Candle Branco)'],
          },
        },
      };
    });
  }, [activeSignal, candles, activeAsset, selectedSymbol, selectedTimeframe]);

  return (
    <div className="flex h-screen flex-col bg-[#0b0e14] text-slate-100 antialiased overflow-hidden font-sans">
      {/* Top Status Bar: Connection, Market Clock, Latency, Sound/Voice */}
      <StatusBar demoMode={adminConfig.demoMode} />

      {/* Main Header Navbar: Search, Quick Watchlist, Radar Toggle */}
      <Navbar
        signals={signals}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={handleSelectSymbol}
        radarActive={radarActive}
        onToggleRadar={() => setRadarActive(!radarActive)}
        onNavigate={handleNavigate}
        floatingAlertsEnabled={floatingAlertsEnabled}
        onToggleFloatingAlerts={handleToggleFloatingAlerts}
      />

      {/* Content Layout: Sidebar + Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          activeSignalsCount={signals.filter((s) => s.direction !== 'WAIT').length}
          floatingAlertsEnabled={floatingAlertsEnabled}
          onToggleFloatingAlerts={handleToggleFloatingAlerts}
        />

        {/* Dynamic Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0b0e14]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center font-mono text-sm text-slate-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
                <div>Carregando feeds em tempo real e motor de sinais...</div>
              </div>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <DashboardOverview
                  signals={signals}
                  assets={assets}
                  news={news}
                  onSelectSymbol={(sym) => {
                    handleSelectSymbol(sym);
                    handleNavigate('chart');
                  }}
                  onNavigate={handleNavigate}
                />
              )}

              {currentView === 'radar' && (
                <RadarView
                  signals={signals}
                  onSelectSymbol={(sym) => {
                    handleSelectSymbol(sym);
                    handleNavigate('chart');
                  }}
                  onOpenDetail={(sig) => setModalSignal(sig)}
                />
              )}

              {currentView === 'chart' && (
                <div className="space-y-4">
                  {/* Top Bar for Selected Symbol info */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1f293d] bg-[#0c111c] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="font-mono text-lg font-bold text-white tracking-wider">
                            {selectedSymbol}
                          </h1>
                          {/* Ícone Favorito para marcar e desmarcar */}
                          <button
                            onClick={() => handleToggleFavorite(selectedSymbol)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono transition-all border cursor-pointer ${
                              favorites.includes(selectedSymbol)
                                ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                                : 'bg-[#121826] border-slate-700/80 text-slate-400 hover:text-amber-300 hover:border-slate-600'
                            }`}
                            title={favorites.includes(selectedSymbol) ? 'Remover dos Favoritos' : 'Marcar ativo como Favorito'}
                          >
                            <Star className={`h-3.5 w-3.5 ${favorites.includes(selectedSymbol) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                            <span className="font-semibold text-[11px]">{favorites.includes(selectedSymbol) ? 'Favorito' : 'Favoritar'}</span>
                          </button>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {activeAsset?.market || 'B3'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {activeAsset?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                          <span className="font-bold text-slate-100">
                            {activeAsset?.currency === 'USD' ? '$' : 'R$'}{' '}
                            {activeAsset ? activeAsset.price.toFixed(activeAsset.price < 1 ? 4 : 2) : '0.00'}
                          </span>
                          <span
                            className={`font-semibold ${
                              (activeAsset?.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {(activeAsset?.changePercent || 0) >= 0 ? '+' : ''}
                            {activeAsset?.changePercent.toFixed(2)}%
                          </span>
                          <span className="text-slate-600">·</span>
                          {activeAsset?.market === 'CRYPTO' ? (
                            <a
                              href="https://www.coingecko.com/pt-br"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 underline font-mono text-[11px]"
                            >
                              Fonte: CoinGecko (Tempo Real)
                            </a>
                          ) : (
                            <span className="text-slate-400">
                              Fonte: {activeAsset?.source || 'Oficial B3'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Signal status badge */}
                    {activeSignal && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 font-mono font-bold text-sm ${
                              activeSignal.direction === 'BUY'
                                ? 'text-emerald-400'
                                : activeSignal.direction === 'SELL'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                activeSignal.direction === 'BUY'
                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                                  : activeSignal.direction === 'SELL'
                                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                                  : 'bg-slate-500'
                              }`}
                            />
                            {activeSignal.direction === 'BUY'
                              ? 'SINAL DE COMPRA'
                              : activeSignal.direction === 'SELL'
                              ? 'SINAL DE VENDA'
                              : 'SEM SINAL (AGUARDAR)'}
                          </span>
                          <div className="text-[11px] font-mono text-slate-400">
                            Score: <strong className="text-white">{activeSignal.score}/100</strong> (Confiança {activeSignal.confidencePercent}%)
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleTestWhiteCandleAlert}
                            className="flex items-center gap-1.5 rounded bg-white hover:bg-slate-100 text-slate-950 font-mono font-bold px-3 py-1.5 text-xs shadow-[0_0_15px_rgba(255,255,255,0.35)] transition-all active:scale-95 cursor-pointer border border-white"
                            title="Testar aparição do candle branco de reversão e aviso imediato"
                          >
                            <span className="h-2 w-2 rounded-full bg-slate-950 animate-ping" />
                            <span>⚪ Testar Candle Branco & Aviso</span>
                          </button>

                          <button
                            onClick={() => setModalSignal(activeSignal)}
                            className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                          >
                            Ver Fatores
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TradingView Chart */}
                  <TradingViewChart
                    symbol={selectedSymbol}
                    candles={candles}
                    timeframe={selectedTimeframe}
                    onTimeframeChange={handleSelectTimeframe}
                    signal={activeSignal}
                    indicators={currentAnalysis?.indicators}
                    isCandleClosed={activeSignal?.isConfirmed ?? true}
                    activeReversal={reversalAlerts.find((r) => r.symbol === selectedSymbol) || null}
                  />

                  {/* Technical Indicators Panel */}
                  <TechnicalIndicatorsPanel
                    indicators={currentAnalysis?.indicators || null}
                    currentPrice={activeAsset?.price || 10}
                  />

                  {/* Multi-Timeframe Confirmation Matrix */}
                  <MultiTimeframeGrid
                    mtfStatus={activeSignal?.multiTimeframeStatus || {}}
                    selectedTimeframe={selectedTimeframe}
                    onSelectTimeframe={handleSelectTimeframe}
                  />

                  {/* AI Market Analyst Card with 'Analisar Agora' */}
                  <AiAnalystCard
                    signal={activeSignal}
                    symbol={selectedSymbol}
                    timeframe={selectedTimeframe}
                  />
                </div>
              )}

              {currentView === 'scanner' && (
                <ScannerView
                  signals={signals}
                  onSelectSymbol={(sym) => {
                    handleSelectSymbol(sym);
                    handleNavigate('chart');
                  }}
                  onOpenDetail={(sig) => setModalSignal(sig)}
                />
              )}

              {currentView === 'signals' && (
                <SignalsFeedView
                  signals={signals}
                  history={history}
                  onSelectSymbol={(sym) => {
                    handleSelectSymbol(sym);
                    handleNavigate('chart');
                  }}
                  onOpenDetail={(sig) => setModalSignal(sig)}
                />
              )}

              {currentView === 'news' && (
                <NewsView
                  news={news}
                  onSelectSymbol={(sym) => {
                    handleSelectSymbol(sym);
                    handleNavigate('chart');
                  }}
                />
              )}

              {currentView === 'calendar' && (
                <EconomicCalendarView events={calendar} />
              )}

              {currentView === 'paper' && (
                <PaperTradingView
                  assets={assets}
                  selectedSymbol={selectedSymbol}
                />
              )}

              {currentView === 'backtest' && (
                <BacktestView
                  assets={assets}
                  selectedSymbol={selectedSymbol}
                />
              )}

              {currentView === 'admin' && (
                <AdminView
                  config={adminConfig}
                  onUpdateConfig={(newConfig) => setAdminConfig(newConfig)}
                />
              )}

              {currentView === 'users' && (
                <UsersView />
              )}
            </>
          )}
        </main>
      </div>

      {/* Signal Details Modal */}
      <SignalDetailModal
        signal={modalSignal}
        onClose={() => setModalSignal(null)}
        onSelectSymbol={(sym) => {
          handleSelectSymbol(sym);
          handleNavigate('chart');
        }}
      />

      {/* Floating Reversal Alert Overlay (Tela Flutuante com Som em Tempo Real - Pode ser Ativada/Desativada) */}
      {floatingAlertsEnabled && (
        <FloatingReversalAlert
          alerts={reversalAlerts}
          onDismiss={(id) => setReversalAlerts((prev) => prev.filter((a) => a.id !== id))}
          onSelectSymbol={(sym) => {
            handleSelectSymbol(sym);
            handleNavigate('chart');
          }}
          onNavigateToChart={() => handleNavigate('chart')}
          onToggleFloatingAlerts={handleToggleFloatingAlerts}
        />
      )}

      {/* Janela Flutuante de Usuários (Acesso Restrito: administrador / Fpjqt@10) */}
      <UsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
      />
    </div>
  );
}

export default App;

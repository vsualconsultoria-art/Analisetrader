import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  CrosshairMode,
  createSeriesMarkers,
  CandlestickData,
  Time,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts';
import {
  ArrowRight,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Radio,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Candle, IndicatorValues, MarketSignal, ReversalAlertEvent, Timeframe } from '../../types/market.js';
import { soundEngine } from '../../utils/audio.js';

interface ReversalPoint {
  time: number;
  index: number;
  type: 'BULLISH' | 'BEARISH';
  price: number;
}

const computeReversalPivots = (scanCandles: Candle[], timeframe: Timeframe): ReversalPoint[] => {
  const tfLower = (timeframe || '15m').toLowerCase();
  let lookbackCount = 14;
  let minSwingDepth = 0.014; // 1.4%
  let minCandleSeparation = 7;
  let tolerance = 0.008;

  if (tfLower === '5m') {
    lookbackCount = 10;
    minSwingDepth = 0.008;
    minCandleSeparation = 5;
    tolerance = 0.006;
  } else if (tfLower === '15m') {
    lookbackCount = 14;
    minSwingDepth = 0.015;
    minCandleSeparation = 7;
    tolerance = 0.008;
  } else if (tfLower === '1h') {
    lookbackCount = 26; // ~4 dias de pregão
    minSwingDepth = 0.028; // 2.8% para atingir os topos/fundos estruturais de 1 hora
    minCandleSeparation = 12; // Mínimo 12 horas de movimento entre topos e fundos
    tolerance = 0.012;
  } else if (tfLower === '2h' || tfLower === '4h') {
    lookbackCount = 24;
    minSwingDepth = 0.040;
    minCandleSeparation = 10;
    tolerance = 0.015;
  } else if (tfLower === '1d' || tfLower === '1w') {
    lookbackCount = 30;
    minSwingDepth = 0.055;
    minCandleSeparation = 14;
    tolerance = 0.020;
  }

  const scanCloses = scanCandles.map(x => x.close);
  const calcEMAArray = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    const res: number[] = [];
    let ema = data[0];
    for (let idx = 0; idx < data.length; idx++) {
      if (idx === 0) ema = data[0];
      else ema = data[idx] * k + ema * (1 - k);
      res.push(ema);
    }
    return res;
  };

  const scanEma9 = calcEMAArray(scanCloses, 9);
  const scanEma21 = calcEMAArray(scanCloses, 21);
  const scanFast = calcEMAArray(scanCloses, 12);
  const scanSlow = calcEMAArray(scanCloses, 26);
  const scanMacdLine = scanFast.map((f, idx) => f - scanSlow[idx]);
  const scanSignalLine = calcEMAArray(scanMacdLine, 9);
  const scanMacdHist = scanMacdLine.map((m, idx) => m - scanSignalLine[idx]);

  const rawPivots: ReversalPoint[] = [];

  for (let i = lookbackCount; i < scanCandles.length; i++) {
    const c = scanCandles[i];
    const prevCandle = scanCandles[i - 1];

    let lowestPrior = Infinity;
    let highestPrior = -Infinity;
    for (let j = i - lookbackCount; j < i; j++) {
      const sc = scanCandles[j];
      if (sc.low < lowestPrior) lowestPrior = sc.low;
      if (sc.high > highestPrior) highestPrior = sc.high;
    }

    const candleRange = Math.max(0.0001, c.high - c.low);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWickRatio = lowerWick / candleRange;
    const upperWickRatio = upperWick / candleRange;

    const priceDrop = (highestPrior - c.low) / (highestPrior || 1);
    const priceRally = (c.high - lowestPrior) / (lowestPrior || 1);

    // Se temos candles posteriores (candles históricos anteriores ao penúltimo)
    if (i < scanCandles.length - 2) {
      let lowestPost = Infinity;
      let highestPost = -Infinity;
      let hasTurnUp = false;
      let hasTurnDown = false;
      const postEnd = Math.min(scanCandles.length, i + 5);
      for (let j = i + 1; j < postEnd; j++) {
        const sc = scanCandles[j];
        if (sc.low < lowestPost) lowestPost = sc.low;
        if (sc.high > highestPost) highestPost = sc.high;
        if (sc.close > c.high || sc.close > sc.open) hasTurnUp = true;
        if (sc.close < c.low || sc.close < sc.open) hasTurnDown = true;
      }

      // --- FUNDO HISTÓRICO: FIM DE TENDÊNCIA DE BAIXA (🟢 BOLA VERDE) ---
      const isDowntrendIntoSupport = priceDrop >= minSwingDepth;
      const isAtSupport = c.low <= lowestPrior * (1 + tolerance) && c.low <= lowestPost;
      const isBullishDefense = (c.close >= c.open && c.close >= prevCandle.close) || lowerWickRatio >= 0.32;

      const isEmaBullConfirmed =
        (c.close >= scanEma9[i] * 0.997) ||
        (scanEma9[i] >= scanEma9[i - 1] * 0.999) ||
        (c.close >= scanEma21[i] * 0.995) ||
        (lowerWickRatio >= 0.38);
      const isMacdBullConfirmed =
        (scanMacdHist[i] >= scanMacdHist[i - 1]) ||
        (scanMacdLine[i] >= scanSignalLine[i]) ||
        (scanMacdHist[i] > -0.05);

      if (isAtSupport && isDowntrendIntoSupport && isBullishDefense && hasTurnUp && isEmaBullConfirmed && isMacdBullConfirmed) {
        rawPivots.push({
          time: c.time as number,
          index: i,
          type: 'BULLISH',
          price: c.low,
        });
        continue;
      }

      // --- TOPO HISTÓRICO: FIM DE TENDÊNCIA DE ALTA (🔴 BOLA VERMELHA) ---
      const isUptrendIntoResistance = priceRally >= minSwingDepth;
      const isAtResistance = c.high >= highestPrior * (1 - tolerance) && c.high >= highestPost;
      const isBearishRejection = (c.close < c.open && c.close <= prevCandle.close) || upperWickRatio >= 0.32;

      const isEmaBearConfirmed =
        (c.close <= scanEma9[i] * 1.003) ||
        (scanEma9[i] <= scanEma9[i - 1] * 1.001) ||
        (c.close <= scanEma21[i] * 1.005) ||
        (upperWickRatio >= 0.38);
      const isMacdBearConfirmed =
        (scanMacdHist[i] <= scanMacdHist[i - 1]) ||
        (scanMacdLine[i] <= scanSignalLine[i]) ||
        (scanMacdHist[i] < 0.05);

      if (isAtResistance && isUptrendIntoResistance && isBearishRejection && hasTurnDown && isEmaBearConfirmed && isMacdBearConfirmed) {
        rawPivots.push({
          time: c.time as number,
          index: i,
          type: 'BEARISH',
          price: c.high,
        });
      }
    } else {
      // --- ÚLTIMOS CANDLES (INCLUINDO O ÚLTIMO CANDLE FORMADO/ATUAL) ---
      // Analisar com precisão se chegou na EXAUSTÃO de alta ou baixa e NÃO é apenas um pullback!

      // 1. TOPO DA RESISTÊNCIA COM EXAUSTÃO DE ALTA (🔴 BOLA VERMELHA & CANDLE BRANCO)
      const isAtResistancePeak = c.high >= highestPrior * (1 - tolerance);
      const hasPriorUptrend = priceRally >= minSwingDepth;

      // Exaustão de alta (rejeição de preço):
      const hasBearishRejection =
        upperWickRatio >= 0.28 ||
        (c.close < c.open && c.close <= prevCandle.close) ||
        (c.close < prevCandle.low);

      // Médias móveis na exaustão (preço esticou e perde sustentação da EMA 9):
      const isEmaExhaustionBear =
        (c.close <= scanEma9[i] * 1.002) ||
        (scanEma9[i] <= scanEma9[i - 1] * 1.0005) ||
        (c.high >= scanEma21[i] * 1.015 && upperWickRatio >= 0.25);

      // MACD na exaustão de alta (histograma desacelerando ou cruzando para baixo):
      const isMacdExhaustionBear =
        (scanMacdHist[i] <= scanMacdHist[i - 1]) ||
        (scanMacdLine[i] <= scanSignalLine[i]);

      if (isAtResistancePeak && hasPriorUptrend && hasBearishRejection && isEmaExhaustionBear && isMacdExhaustionBear) {
        rawPivots.push({
          time: c.time as number,
          index: i,
          type: 'BEARISH',
          price: c.high,
        });
        continue;
      }

      // 2. FUNDO DO SUPORTE COM EXAUSTÃO DE BAIXA (🟢 BOLA VERDE & CANDLE BRANCO)
      const isAtSupportTrough = c.low <= lowestPrior * (1 + tolerance);
      const hasPriorDowntrend = priceDrop >= minSwingDepth;

      // Exaustão de baixa (defesa compradora/absorção):
      const hasBullishDefense =
        lowerWickRatio >= 0.28 ||
        (c.close > c.open && c.close >= prevCandle.close) ||
        (c.close > prevCandle.high);

      // Médias móveis na exaustão (preço defende e retoma em direção à EMA 9):
      const isEmaExhaustionBull =
        (c.close >= scanEma9[i] * 0.998) ||
        (scanEma9[i] >= scanEma9[i - 1] * 0.9995) ||
        (c.low <= scanEma21[i] * 0.985 && lowerWickRatio >= 0.25);

      // MACD na exaustão de baixa (histograma subindo/infletindo para cima ou cruzando):
      const isMacdExhaustionBull =
        (scanMacdHist[i] >= scanMacdHist[i - 1]) ||
        (scanMacdLine[i] >= scanSignalLine[i]);

      if (isAtSupportTrough && hasPriorDowntrend && hasBullishDefense && isEmaExhaustionBull && isMacdExhaustionBull) {
        rawPivots.push({
          time: c.time as number,
          index: i,
          type: 'BULLISH',
          price: c.low,
        });
      }
    }
  }

  const alternatingReversals: ReversalPoint[] = [];
  let currentGroup: ReversalPoint[] = [];
  let currentType: 'BULLISH' | 'BEARISH' | null = null;

  for (const p of rawPivots) {
    if (!currentType) {
      currentType = p.type;
      currentGroup = [p];
    } else if (p.type === currentType) {
      currentGroup.push(p);
    } else {
      const lastAdded = alternatingReversals[alternatingReversals.length - 1];
      if (currentType === 'BULLISH') {
        const best = currentGroup.reduce((min, cur) => cur.price < min.price ? cur : min, currentGroup[0]);
        if (!lastAdded || Math.abs(best.index - lastAdded.index) >= minCandleSeparation) {
          alternatingReversals.push(best);
        }
      } else {
        const best = currentGroup.reduce((max, cur) => cur.price > max.price ? cur : max, currentGroup[0]);
        if (!lastAdded || Math.abs(best.index - lastAdded.index) >= minCandleSeparation) {
          alternatingReversals.push(best);
        }
      }
      currentType = p.type;
      currentGroup = [p];
    }
  }

  if (currentGroup.length > 0 && currentType) {
    const lastAdded = alternatingReversals[alternatingReversals.length - 1];
    if (currentType === 'BULLISH') {
      const best = currentGroup.reduce((min, cur) => cur.price < min.price ? cur : min, currentGroup[0]);
      if (!lastAdded || Math.abs(best.index - lastAdded.index) >= minCandleSeparation) {
        alternatingReversals.push(best);
      }
    } else {
      const best = currentGroup.reduce((max, cur) => cur.price > max.price ? cur : max, currentGroup[0]);
      if (!lastAdded || Math.abs(best.index - lastAdded.index) >= minCandleSeparation) {
        alternatingReversals.push(best);
      }
    }
  }

  return alternatingReversals;
};

interface TradingViewChartProps {
  symbol: string;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  signal?: MarketSignal | null;
  indicators?: IndicatorValues | null;
  isCandleClosed?: boolean;
  activeReversal?: ReversalAlertEvent | null;
}

const TradingViewChartComponent: React.FC<TradingViewChartProps> = ({
  symbol,
  candles,
  timeframe,
  onTimeframeChange,
  signal,
  indicators,
  isCandleClosed = true,
  activeReversal,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdChartContainerRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<any> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<any> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<any> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<any> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<any> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<any> | null>(null);
  const macdHistSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const macdLineSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const supportLineRef = useRef<any>(null);
  const resistanceLineRef = useRef<any>(null);

  // Indicators visibility state
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(true);
  const [showEMA50, setShowEMA50] = useState(false);
  const [showEMA200, setShowEMA200] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  // Performance tracking refs (avoid lag and unnecessary full recalculations)
  const prevCandlesCountRef = useRef(0);
  const prevLastTimeRef = useRef(0);
  const prevSymbolRef = useRef(symbol);
  const prevTfRef = useRef(timeframe);
  const lastFullCalculatedRef = useRef(0);
  const lastReversalTimeRef = useRef<number | null>(null);
  const prevIsLiveRevRef = useRef<boolean>(false);

  // Fast math anchors for real-time live tick indicator updates
  const baseEma9Ref = useRef<number>(0);
  const baseEma21Ref = useRef<number>(0);
  const baseEma50Ref = useRef<number>(0);
  const baseEma200Ref = useRef<number>(0);
  const baseFastEmaRef = useRef<number>(0);
  const baseSlowEmaRef = useRef<number>(0);
  const baseSignalEmaRef = useRef<number>(0);
  const baseHistRef = useRef<number>(0);

  // Reversal Message Box state
  const [showMessageBox, setShowMessageBox] = useState(true);
  const [isBoxMinimized, setIsBoxMinimized] = useState(false);
  const [orderExecutedFeedback, setOrderExecutedFeedback] = useState<string | null>(null);

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ESC key listener to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Track if user manually zoomed or scrolled
  const userScrolledRef = useRef(false);

  // Timeframes list
  const timeframes: Timeframe[] = ['5m', '15m', '1h', '2h', '4h', '1d', '1w'];

  // Initialize Lightweight Charts (Candlestick Main Chart + MACD Synchronized Subchart)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Candlestick Main Price Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#090d15' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#161f30' },
        horzLines: { color: '#161f30' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#1f293d',
        autoScale: true,
        minimumWidth: 85,
      },
      timeScale: {
        borderColor: '#1f293d',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
    });

    chartRef.current = chart;

    // Detect real user interaction (clicks, drags, wheel) to preserve manual zoom/pan position
    const onUserInteract = () => {
      userScrolledRef.current = true;
    };
    const mainEl = chartContainerRef.current;
    mainEl.addEventListener('mousedown', onUserInteract);
    mainEl.addEventListener('wheel', onUserInteract, { passive: true });
    mainEl.addEventListener('touchstart', onUserInteract, { passive: true });

    const macdEl = macdChartContainerRef.current;
    if (macdEl) {
      macdEl.addEventListener('mousedown', onUserInteract);
      macdEl.addEventListener('wheel', onUserInteract, { passive: true });
      macdEl.addEventListener('touchstart', onUserInteract, { passive: true });
    }

    // 1.1 Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // 1.2 Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // 1.3 Médias Móveis Principais: EMA 9 (Amarela) e EMA 21 (Branca) - Sem exibir valores no gráfico para máxima velocidade
    ema9SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#facc15', // Amarela vívida solicitada pelo usuário
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ema21SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#ffffff', // Branca vívida solicitada pelo usuário
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ema50SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#a855f7',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ema200SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#64748b', // Cinza suave
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // 1.4 Bollinger Bands
    bbUpperRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.4)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bbLowerRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.4)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // 2. Subgráfico MACD Sincronizado (Requisitado pelo usuário)
    let macdChart: IChartApi | null = null;
    if (macdChartContainerRef.current) {
      macdChart = createChart(macdChartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#070b12' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#161f30' },
          horzLines: { color: '#161f30' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: '#1f293d',
          autoScale: true,
          minimumWidth: 85,
        },
        timeScale: {
          borderColor: '#1f293d',
          timeVisible: true,
          secondsVisible: false,
        },
        width: macdChartContainerRef.current.clientWidth,
        height: 135,
      });

      macdChartRef.current = macdChart;

      // 2.1 Histograma MACD
      const macdHistSeries = macdChart.addSeries(HistogramSeries, {
        color: '#10b981',
        priceFormat: {
          type: 'price',
          precision: 3,
          minMove: 0.001,
        },
      });
      macdHistSeriesRef.current = macdHistSeries;

      // Linha Zero de referência
      macdHistSeries.createPriceLine({
        price: 0,
        color: '#334155',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: '',
      });

      // 2.2 Linha MACD (12, 26) - Amarela (Solicitada pelo usuário)
      const macdLineSeries = macdChart.addSeries(LineSeries, {
        color: '#facc15', // Amarela vívida
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      macdLineSeriesRef.current = macdLineSeries;

      // 2.3 Linha de Sinal (EMA 9 do MACD) - Branca (Solicitada pelo usuário)
      const macdSignalSeries = macdChart.addSeries(LineSeries, {
        color: '#ffffff', // Branca vívida
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      macdSignalSeriesRef.current = macdSignalSeries;

      // Sincronização de largura das escalas de preço (alinhamento vertical perfeito 1:1)
      const syncPriceScaleWidths = () => {
        if (!chartRef.current || !macdChartRef.current) return;
        try {
          const w1 = chartRef.current.priceScale('right').width();
          const w2 = macdChartRef.current.priceScale('right').width();
          const targetW = Math.max(w1, w2, 85);
          chartRef.current.applyOptions({ rightPriceScale: { minimumWidth: targetW } });
          macdChartRef.current.applyOptions({ rightPriceScale: { minimumWidth: targetW } });
        } catch {}
      };

      // Sincronização exata 1:1 do timeScale (sem desvio e sem atraso na mesma linha vertical)
      let isSyncing = false;
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (isSyncing || !range || !macdChartRef.current) return;
        isSyncing = true;
        macdChartRef.current.timeScale().setVisibleLogicalRange(range);
        syncPriceScaleWidths();
        isSyncing = false;
      });

      macdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (isSyncing || !range || !chartRef.current) return;
        isSyncing = true;
        chartRef.current.timeScale().setVisibleLogicalRange(range);
        syncPriceScaleWidths();
        isSyncing = false;
      });

      // Sincronização da linha vertical do cursor (Crosshair) entre o gráfico de preço e o MACD
      chart.subscribeCrosshairMove((param) => {
        if (!macdChartRef.current || !macdHistSeriesRef.current) return;
        if (!param.time || param.point === undefined) {
          macdChartRef.current.clearCrosshairPosition();
          return;
        }
        macdChartRef.current.setCrosshairPosition(0, param.time, macdHistSeriesRef.current);
      });

      macdChart.subscribeCrosshairMove((param) => {
        if (!chartRef.current || !candleSeriesRef.current) return;
        if (!param.time || param.point === undefined) {
          chartRef.current.clearCrosshairPosition();
          return;
        }
        chartRef.current.setCrosshairPosition(0, param.time, candleSeriesRef.current);
      });
    }

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
      if (macdChartContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({
          width: macdChartContainerRef.current.clientWidth,
        });
      }
      if (chartRef.current && macdChartRef.current) {
        try {
          const w1 = chartRef.current.priceScale('right').width();
          const w2 = macdChartRef.current.priceScale('right').width();
          const targetW = Math.max(w1, w2, 85);
          chartRef.current.applyOptions({ rightPriceScale: { minimumWidth: targetW } });
          macdChartRef.current.applyOptions({ rightPriceScale: { minimumWidth: targetW } });
        } catch {}
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mainEl.removeEventListener('mousedown', onUserInteract);
      mainEl.removeEventListener('wheel', onUserInteract);
      mainEl.removeEventListener('touchstart', onUserInteract);
      if (macdEl) {
        macdEl.removeEventListener('mousedown', onUserInteract);
        macdEl.removeEventListener('wheel', onUserInteract);
        macdEl.removeEventListener('touchstart', onUserInteract);
      }
      chart.remove();
      if (macdChart) macdChart.remove();
      chartRef.current = null;
      macdChartRef.current = null;
    };
  }, []);

  // Update chart dimensions when showMACD or isFullscreen toggle changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartContainerRef.current && chartRef.current) {
        const w = chartContainerRef.current.clientWidth;
        const mainH = isFullscreen
          ? (showMACD ? window.innerHeight - 280 : window.innerHeight - 120)
          : (showMACD ? 350 : 485);
        chartRef.current.applyOptions({
          height: Math.max(260, mainH),
          width: w,
        });
      }
      if (macdChartContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({
          width: macdChartContainerRef.current.clientWidth,
          height: isFullscreen ? 140 : 135,
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [showMACD, isFullscreen]);

  // Update chart data and markers whenever candles or signal change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    // Format candle data for Lightweight charts (sorted by timestamp ascending)
    const sorted = [...candles].sort((a, b) => a.time - b.time);

    // Filter duplicates on same timestamp
    const uniqueCandles: Candle[] = [];
    const seenTimes = new Set<number>();
    for (const c of sorted) {
      if (!seenTimes.has(c.time)) {
        seenTimes.add(c.time);
        uniqueCandles.push(c);
      }
    }

    const lastCandle = uniqueCandles[uniqueCandles.length - 1];
    const lastCandleTime = lastCandle ? (lastCandle.time as number) : 0;

    const isContextChanged =
      prevSymbolRef.current !== symbol ||
      prevTfRef.current !== timeframe;
    if (isContextChanged) {
      userScrolledRef.current = false;
      prevCandlesCountRef.current = 0;
      prevLastTimeRef.current = 0;
    }
    prevSymbolRef.current = symbol;
    prevTfRef.current = timeframe;

    // Detect reversal points to highlight the last reversal candle (entry candle) in white
    const tfLower = (timeframe || '15m').toLowerCase();
    const scanWindow =
      tfLower === '5m' ? 100 :
      tfLower === '15m' ? 130 :
      tfLower === '1h' ? 160 :
      tfLower === '1d' || tfLower === '1w' ? 180 : 140;
    const scanCandles = uniqueCandles.slice(Math.max(0, uniqueCandles.length - scanWindow));
    const alternatingReversals = computeReversalPivots(scanCandles, timeframe);

    const lastHistRev = alternatingReversals.length > 0 ? alternatingReversals[alternatingReversals.length - 1] : null;
    const isLastCandleRev = !!lastCandle && !!lastHistRev && (
      lastHistRev.time === (lastCandle.time as number) ||
      (uniqueCandles.length > 1 && lastHistRev.time === (uniqueCandles[uniqueCandles.length - 2].time as number))
    );
    const hasLiveRevEvent = !!activeReversal && activeReversal.symbol === symbol;
    const isLiveReversal = !!signal?.reversal?.isReversal || hasLiveRevEvent || isLastCandleRev;
    const liveRevType = hasLiveRevEvent
      ? activeReversal.reversalType
      : (signal?.reversal?.type || (lastHistRev ? lastHistRev.type : null));

    const lastReversalTime = isLiveReversal
      ? (lastCandle ? (lastCandle.time as number) : null)
      : (lastHistRev ? lastHistRev.time : null);
    lastReversalTimeRef.current = lastReversalTime;

    // Conjunto com TODOS os candles de reversão identificados para marcar TODOS na cor branca (#ffffff)
    const allReversalTimesSet = new Set<number>();
    alternatingReversals.forEach((r) => allReversalTimesSet.add(r.time));
    if (lastReversalTime) {
      allReversalTimesSet.add(lastReversalTime);
    }
    if (isLiveReversal && lastCandle) {
      allReversalTimesSet.add(lastCandle.time as number);
    }
    if (isLastCandleRev && lastHistRev) {
      allReversalTimesSet.add(lastHistRev.time);
    }

    // Reversal Markers (Somente Bolas VERDE no suporte/fundo e VERMELHA na resistência/topo)
    const renderReversalMarkers = () => {
      if (!candleSeriesRef.current || uniqueCandles.length === 0) return;
      const markers: any[] = [];
      const markersMap = new Map<number, any>();

      for (const rev of alternatingReversals) {
        if (rev.type === 'BULLISH') {
          markersMap.set(rev.time, {
            time: rev.time as Time,
            position: 'belowBar',
            color: '#10b981', // BOLA VERDE NO FUNDO
            shape: 'circle',
            text: 'Fim de Baixa (Compra)',
          });
        } else {
          markersMap.set(rev.time, {
            time: rev.time as Time,
            position: 'aboveBar',
            color: '#ef4444', // BOLA VERMELHA NO TOPO
            shape: 'circle',
            text: 'Fim de Alta (Venda)',
          });
        }
      }

      const reversalType = liveRevType || signal?.reversal?.type || (lastHistRev ? lastHistRev.type : null);
      if (isLiveReversal && lastCandle && reversalType) {
        if (reversalType === 'BULLISH') {
          markersMap.set(lastCandle.time, {
            time: lastCandle.time as Time,
            position: 'belowBar',
            color: '#10b981', // BOLA VERDE
            shape: 'circle',
            text: 'ENTRADA COMPRA (Fim de Baixa)',
          });
        } else if (reversalType === 'BEARISH') {
          markersMap.set(lastCandle.time, {
            time: lastCandle.time as Time,
            position: 'aboveBar',
            color: '#ef4444', // BOLA VERMELHA
            shape: 'circle',
            text: 'ENTRADA VENDA (Fim de Alta)',
          });
        }
      }

      for (const m of markersMap.values()) {
        markers.push(m);
      }
      markers.sort((a, b) => (a.time as number) - (b.time as number));
      createSeriesMarkers(candleSeriesRef.current, markers);
    };

    // Fast path: If same candle count and timestamp and same context, update forming candle instantly!
    const isLiveTickOnly =
      !isContextChanged &&
      prevCandlesCountRef.current === uniqueCandles.length &&
      prevLastTimeRef.current === lastCandleTime;

    if (isLiveTickOnly && lastCandle) {
      const isThisCandleReversal =
        allReversalTimesSet.has(lastCandleTime) || isLiveReversal;

      const isUp = lastCandle.close >= lastCandle.open;
      candleSeriesRef.current.update({
        time: lastCandle.time as Time,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
        color: isThisCandleReversal ? '#ffffff' : (isUp ? '#10b981' : '#ef4444'),
        borderColor: isThisCandleReversal ? '#ffffff' : (isUp ? '#10b981' : '#ef4444'),
        wickColor: isThisCandleReversal ? '#ffffff' : (isUp ? '#10b981' : '#ef4444'),
      });
      volumeSeriesRef.current.update({
        time: lastCandle.time as Time,
        value: lastCandle.volume,
        color: lastCandle.close >= lastCandle.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
      });

      // Atualização instantânea das Médias Móveis acompanhando a linha do preço em tempo real (Sem lag)
      const k9 = 2 / (9 + 1);
      const k21 = 2 / (21 + 1);
      const k50 = 2 / (50 + 1);
      const k200 = 2 / (200 + 1);

      const curEma9 = Number((lastCandle.close * k9 + baseEma9Ref.current * (1 - k9)).toFixed(2));
      const curEma21 = Number((lastCandle.close * k21 + baseEma21Ref.current * (1 - k21)).toFixed(2));
      const curEma50 = Number((lastCandle.close * k50 + baseEma50Ref.current * (1 - k50)).toFixed(2));
      const curEma200 = Number((lastCandle.close * k200 + baseEma200Ref.current * (1 - k200)).toFixed(2));

      if (showEMA9 && ema9SeriesRef.current) {
        ema9SeriesRef.current.update({ time: lastCandle.time as Time, value: curEma9 });
      }
      if (showEMA21 && ema21SeriesRef.current) {
        ema21SeriesRef.current.update({ time: lastCandle.time as Time, value: curEma21 });
      }
      if (showEMA50 && ema50SeriesRef.current) {
        ema50SeriesRef.current.update({ time: lastCandle.time as Time, value: curEma50 });
      }
      if (showEMA200 && ema200SeriesRef.current) {
        ema200SeriesRef.current.update({ time: lastCandle.time as Time, value: curEma200 });
      }

      // Atualização instantânea das linhas do MACD acompanhando a mesma linha vertical do candle
      if (showMACD && macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistSeriesRef.current) {
        const k12 = 2 / (12 + 1);
        const k26 = 2 / (26 + 1);
        const k9Sig = 2 / (9 + 1);
        const curFast = lastCandle.close * k12 + baseFastEmaRef.current * (1 - k12);
        const curSlow = lastCandle.close * k26 + baseSlowEmaRef.current * (1 - k26);
        const curMacd = curFast - curSlow;
        const curSig = curMacd * k9Sig + baseSignalEmaRef.current * (1 - k9Sig);
        const curHist = curMacd - curSig;

        const mVal = Number(curMacd.toFixed(3));
        const sVal = Number(curSig.toFixed(3));
        const hVal = Number(curHist.toFixed(3));
        const isGrowing = Math.abs(hVal) >= Math.abs(baseHistRef.current);
        const color = hVal >= 0
          ? (isGrowing ? '#10b981' : 'rgba(16, 185, 129, 0.65)')
          : (isGrowing ? '#ef4444' : 'rgba(239, 68, 68, 0.65)');

        macdLineSeriesRef.current.update({ time: lastCandle.time as Time, value: mVal });
        macdSignalSeriesRef.current.update({ time: lastCandle.time as Time, value: sVal });
        macdHistSeriesRef.current.update({ time: lastCandle.time as Time, value: hVal, color });
      }

      if (isThisCandleReversal || prevIsLiveRevRef.current) {
        renderReversalMarkers();
      }
      prevIsLiveRevRef.current = isThisCandleReversal;

      return;
    }

    // Full path: Initial load, new candle opened, or symbol/timeframe changed
    // Marcar TODO candle de reversão na cor branca (#ffffff) com pavio e borda brancos
    const candleData: CandlestickData<Time>[] = uniqueCandles.map((c) => {
      const isReversalCandle = allReversalTimesSet.has(c.time as number);
      const isUp = c.close >= c.open;
      return {
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        color: isReversalCandle ? '#ffffff' : (isUp ? '#10b981' : '#ef4444'),
        borderColor: isReversalCandle ? '#ffffff' : (isUp ? '#10b981' : '#ef4444'),
        wickColor: isReversalCandle ? '#ffffff' : (isUp ? '#10b981' : '#ef4444'),
      };
    });

    const volumeData = uniqueCandles.map(c => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    prevCandlesCountRef.current = uniqueCandles.length;
    prevLastTimeRef.current = lastCandleTime;
    lastFullCalculatedRef.current = Date.now();

    // Compute EMAs and MACD in single high-performance O(N) pass for all candles from index 0
    const closes = uniqueCandles.map(c => c.close);
    const times = uniqueCandles.map(c => c.time as Time);
    const n = closes.length;

    const k9 = 2 / (9 + 1);
    const k21 = 2 / (21 + 1);
    const k50 = 2 / (50 + 1);
    const k200 = 2 / (200 + 1);
    const k12 = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    const k9Sig = 2 / (9 + 1);

    const ema9Arr: { time: Time; value: number }[] = [];
    const ema21Arr: { time: Time; value: number }[] = [];
    const ema50Arr: { time: Time; value: number }[] = [];
    const ema200Arr: { time: Time; value: number }[] = [];

    const macdLineData: { time: Time; value: number }[] = [];
    const signalLineData: { time: Time; value: number }[] = [];
    const histData: { time: Time; value: number; color: string }[] = [];

    let ema9 = closes[0];
    let ema21 = closes[0];
    let ema50 = closes[0];
    let ema200 = closes[0];
    let fastEMA = closes[0];
    let slowEMA = closes[0];
    let signalEMA = 0;
    let prevHist = 0;

    for (let i = 0; i < n; i++) {
      const p = closes[i];
      const t = times[i];

      if (i > 0) {
        ema9 = p * k9 + ema9 * (1 - k9);
        ema21 = p * k21 + ema21 * (1 - k21);
        ema50 = p * k50 + ema50 * (1 - k50);
        ema200 = p * k200 + ema200 * (1 - k200);
        fastEMA = p * k12 + fastEMA * (1 - k12);
        slowEMA = p * k26 + slowEMA * (1 - k26);
      }

      ema9Arr.push({ time: t, value: Number(ema9.toFixed(2)) });
      ema21Arr.push({ time: t, value: Number(ema21.toFixed(2)) });
      ema50Arr.push({ time: t, value: Number(ema50.toFixed(2)) });
      ema200Arr.push({ time: t, value: Number(ema200.toFixed(2)) });

      const macdVal = fastEMA - slowEMA;
      if (i === 0) {
        signalEMA = macdVal;
      } else {
        signalEMA = macdVal * k9Sig + signalEMA * (1 - k9Sig);
      }
      const histVal = macdVal - signalEMA;

      const mVal = Number(macdVal.toFixed(3));
      const sVal = Number(signalEMA.toFixed(3));
      const hVal = Number(histVal.toFixed(3));

      macdLineData.push({ time: t, value: mVal });
      signalLineData.push({ time: t, value: sVal });

      const isGrowing = Math.abs(hVal) >= Math.abs(prevHist);
      const color = hVal >= 0
        ? (isGrowing ? '#10b981' : 'rgba(16, 185, 129, 0.65)')
        : (isGrowing ? '#ef4444' : 'rgba(239, 68, 68, 0.65)');
      histData.push({ time: t, value: hVal, color });
      prevHist = hVal;

      // Armazenar os valores-base do penúltimo candle para ticks ao vivo ultra-rápidos
      if (i === n - 2) {
        baseEma9Ref.current = ema9;
        baseEma21Ref.current = ema21;
        baseEma50Ref.current = ema50;
        baseEma200Ref.current = ema200;
        baseFastEmaRef.current = fastEMA;
        baseSlowEmaRef.current = slowEMA;
        baseSignalEmaRef.current = signalEMA;
        baseHistRef.current = hVal;
      }
    }

    if (n === 1) {
      baseEma9Ref.current = ema9;
      baseEma21Ref.current = ema21;
      baseEma50Ref.current = ema50;
      baseEma200Ref.current = ema200;
      baseFastEmaRef.current = fastEMA;
      baseSlowEmaRef.current = slowEMA;
      baseSignalEmaRef.current = signalEMA;
      baseHistRef.current = 0;
    }

    if (ema9SeriesRef.current) ema9SeriesRef.current.setData(showEMA9 ? ema9Arr : []);
    if (ema21SeriesRef.current) ema21SeriesRef.current.setData(showEMA21 ? ema21Arr : []);
    if (ema50SeriesRef.current) ema50SeriesRef.current.setData(showEMA50 ? ema50Arr : []);
    if (ema200SeriesRef.current) ema200SeriesRef.current.setData(showEMA200 ? ema200Arr : []);

    if (macdHistSeriesRef.current) macdHistSeriesRef.current.setData(showMACD ? histData : []);
    if (macdLineSeriesRef.current) macdLineSeriesRef.current.setData(showMACD ? macdLineData : []);
    if (macdSignalSeriesRef.current) macdSignalSeriesRef.current.setData(showMACD ? signalLineData : []);

    // Sincronizar intervalo visível e larguras do subgráfico MACD imediatamente
    if (chartRef.current && macdChartRef.current) {
      const visRange = chartRef.current.timeScale().getVisibleLogicalRange();
      if (visRange) {
        macdChartRef.current.timeScale().setVisibleLogicalRange(visRange);
      }
    }

    // Bollinger Bands
    if (bbUpperRef.current && bbLowerRef.current) {
      if (showBollinger && closes.length >= 20) {
        const upper: { time: Time; value: number }[] = [];
        const lower: { time: Time; value: number }[] = [];
        for (let i = 19; i < closes.length; i++) {
          const slice = closes.slice(i - 19, i + 1);
          const mean = slice.reduce((a, b) => a + b, 0) / 20;
          const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 20;
          const stdDev = Math.sqrt(variance);
          upper.push({ time: times[i], value: Number((mean + 2 * stdDev).toFixed(2)) });
          lower.push({ time: times[i], value: Number((mean - 2 * stdDev).toFixed(2)) });
        }
        bbUpperRef.current.setData(upper);
        bbLowerRef.current.setData(lower);
      } else {
        bbUpperRef.current.setData([]);
        bbLowerRef.current.setData([]);
      }
    }

    // Support and Resistance Price Lines
    if (indicators && candleSeriesRef.current) {
      if (supportLineRef.current) {
        candleSeriesRef.current.removePriceLine(supportLineRef.current);
      }
      if (resistanceLineRef.current) {
        candleSeriesRef.current.removePriceLine(resistanceLineRef.current);
      }

      supportLineRef.current = candleSeriesRef.current.createPriceLine({
        price: indicators.support,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `SUP R$ ${indicators.support.toFixed(2)}`,
      });

      resistanceLineRef.current = candleSeriesRef.current.createPriceLine({
        price: indicators.resistance,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `RES R$ ${indicators.resistance.toFixed(2)}`,
      });
    }

    // EXCLUSIVE REVERSAL MARKERS (Bolas de Tendência Proporcionais ao Tempo):
    renderReversalMarkers();

    // Auto scroll to latest candle on initial load or if user hasn't scrolled
    if (!userScrolledRef.current && chartRef.current) {
      chartRef.current.timeScale().scrollToRealTime();
      if (macdChartRef.current) {
        macdChartRef.current.timeScale().scrollToRealTime();
      }
    }
  }, [candles, symbol, timeframe, showEMA9, showEMA21, showEMA50, showEMA200, showBollinger, showVolume, indicators, signal, activeReversal]);

  const handleScrollToRealtime = () => {
    userScrolledRef.current = false;
    if (chartRef.current) {
      chartRef.current.timeScale().scrollToRealTime();
    }
    if (macdChartRef.current) {
      macdChartRef.current.timeScale().scrollToRealTime();
    }
  };

  const handleSimulateOrder = () => {
    const isBuy = signal?.direction === 'BUY' || signal?.reversal?.type === 'BULLISH';
    if (isBuy) {
      soundEngine.playBuyBeep();
      soundEngine.speak(`Ordem de compra simulada em ${symbol}`);
    } else {
      soundEngine.playSellBeep();
      soundEngine.speak(`Ordem de venda simulada em ${symbol}`);
    }

    setOrderExecutedFeedback(`Ordem simulada executada com sucesso a R$ ${lastCandle?.close.toFixed(2)}!`);
    setTimeout(() => {
      setOrderExecutedFeedback(null);
    }, 4000);
  };

  const lastCandle = candles[candles.length - 1];
  const isLastBull = lastCandle ? lastCandle.close >= lastCandle.open : true;
  const candleChangePct = lastCandle && lastCandle.open > 0
    ? ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
    : 0;

  const hasLiveRevEvent = !!activeReversal && activeReversal.symbol === symbol;
  const isReversal = !!signal?.reversal?.isReversal || hasLiveRevEvent;
  const currentRevType = hasLiveRevEvent ? activeReversal.reversalType : signal?.reversal?.type;
  const isRevBull = isReversal && currentRevType === 'BULLISH';
  const isRevBear = isReversal && currentRevType === 'BEARISH';
  const isBuy = isRevBull || (!isReversal && signal?.direction === 'BUY');
  const isSell = isRevBear || (!isReversal && signal?.direction === 'SELL');

  return (
    <div
      onDoubleClick={() => setIsFullscreen((prev) => !prev)}
      className={`flex flex-col transition-all duration-200 select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#090d15] p-3 w-screen h-screen m-0 border-0 rounded-none overflow-hidden'
          : 'rounded-lg border border-[#1f293d] bg-[#090d15] overflow-hidden shadow-xl'
      }`}
    >
      {/* Banner de Aviso de Modo Tela Cheia */}
      {isFullscreen && (
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950/90 via-[#0e1422] to-slate-900 px-4 py-2 border-b border-emerald-500/40 text-xs font-mono text-slate-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-bold text-white tracking-wider">TELA CHEIA: GRÁFICO & ANÁLISE QUANT</span>
            <span className="text-slate-400 hidden sm:inline">· Pressione ESC ou clique 2x no gráfico para voltar ao normal</span>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
            title="Voltar ao tamanho normal (ESC)"
          >
            <Minimize2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Sair da Tela Cheia (ESC)</span>
          </button>
        </div>
      )}

      {/* Top Chart Toolbar: Symbol, Price, Timeframes, Indicators, Real-time Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f293d] bg-[#0c111c] px-4 py-2.5">
        {/* Symbol & Live Price */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-base font-bold text-white tracking-wider">
            {symbol}
          </span>
          {lastCandle && (
            <div className="flex items-center gap-1.5 font-mono">
              <span className={`text-sm font-bold ${isLastBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {lastCandle.close.toFixed(2)}
              </span>
              <span className={`text-[11px] font-semibold ${candleChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({candleChangePct >= 0 ? '+' : ''}{candleChangePct.toFixed(2)}%)
              </span>
            </div>
          )}

          {/* Candle state and Real-Time pulse indicator */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              AO VIVO
            </span>

            {isCandleClosed ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-slate-300 font-medium">
                · Último candle fechado
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-amber-400 font-medium">
                · Candle em formação...
              </span>
            )}
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-[#121927] p-1 rounded-md border border-[#1f293d]">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2336]'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Indicator Toggles & Reset Scroll & Fullscreen Button */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setShowEMA9(!showEMA9)}
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors border ${
              showEMA9 ? 'border-yellow-400 bg-yellow-950/70 text-yellow-300 font-bold shadow-[0_0_8px_rgba(250,204,21,0.2)]' : 'border-slate-800 text-slate-500'
            }`}
          >
            EMA 9 (Amarela)
          </button>
          <button
            onClick={() => setShowEMA21(!showEMA21)}
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors border ${
              showEMA21 ? 'border-white/80 bg-slate-800/90 text-white font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'border-slate-800 text-slate-500'
            }`}
          >
            EMA 21 (Branca)
          </button>
          <button
            onClick={() => setShowMACD(!showMACD)}
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors border ${
              showMACD ? 'border-indigo-500/70 bg-indigo-950/60 text-indigo-300 font-bold' : 'border-slate-800 text-slate-500'
            }`}
          >
            MACD (12, 26, 9)
          </button>
          <button
            onClick={() => setShowEMA200(!showEMA200)}
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors border ${
              showEMA200 ? 'border-slate-400/50 bg-slate-800 text-slate-200 font-semibold' : 'border-slate-800 text-slate-500'
            }`}
          >
            EMA 200
          </button>
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors border ${
              showBollinger ? 'border-blue-500/50 bg-blue-950/40 text-blue-400 font-semibold' : 'border-slate-800 text-slate-500'
            }`}
          >
            BB
          </button>

          {/* Re-open Message Box button if closed */}
          {!showMessageBox && (
            <button
              onClick={() => setShowMessageBox(true)}
              className="flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-500/60 px-2 py-0.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-900 transition-colors"
            >
              <Zap className="h-3 w-3" />
              <span>CAIXA DE SINAL</span>
            </button>
          )}

          {/* Reset scroll button */}
          <button
            onClick={handleScrollToRealtime}
            title="Ir para o último candle"
            className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 ml-1"
          >
            <ArrowRight className="h-3 w-3" />
            <span>ÚLTIMO CANDLE</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Sair da tela cheia (ESC)' : 'Abrir em tela cheia (Duplo clique no gráfico)'}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-colors border ml-1 cursor-pointer ${
              isFullscreen
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700'
            }`}
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3 text-emerald-400" /> : <Maximize2 className="h-3 w-3" />}
            <span className="hidden sm:inline">{isFullscreen ? 'REDUZIR' : 'TELA CHEIA'}</span>
          </button>
        </div>
      </div>

      {/* Lightweight Chart Render Box + Floating Reversal / Signal Message Box */}
      <div
        className="relative w-full"
        style={{
          height: isFullscreen
            ? (showMACD ? 'calc(100vh - 280px)' : 'calc(100vh - 120px)')
            : (showMACD ? '350px' : '485px'),
        }}
      >
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* BANNER AVISO EM TEMPO REAL: CANDLE BRANCO DE REVERSÃO DETECTADO - EFETUAR ENTRADA */}
        {(isReversal || hasLiveRevEvent) && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2.5 rounded-lg bg-black/95 border-2 border-white px-3.5 py-2 shadow-[0_0_25px_rgba(255,255,255,0.5)] backdrop-blur-md">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-[0_0_10px_#ffffff]" />
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-black text-white tracking-wide">
                <span>⚪ AVISO DE ENTRADA: CANDLE BRANCO EM {symbol}!</span>
              </div>
              <div className="text-[10px] font-mono font-bold text-amber-300">
                EFETUAR ENTRADA IMEDIATA ({isRevBull ? 'COMPRA' : 'VENDA'} A R$ {lastCandle?.close.toFixed(2) || '0.00'})
              </div>
            </div>
          </div>
        )}

        {/* CAIXA DE MENSAGEM DE REVERSÃO DE TENDÊNCIA (Disparada exclusivamente na virada de tendência) */}
        {showMessageBox && (
          <div
            className={`absolute top-3 right-3 z-30 w-[340px] sm:w-[380px] rounded-lg border transition-all duration-300 backdrop-blur-md ${
              isRevBull
                ? 'border-emerald-500/80 bg-[#07130e]/95 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                : isRevBear
                ? 'border-rose-500/80 bg-[#16090d]/95 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                : 'border-slate-800/90 bg-[#0a0f19]/95 shadow-lg'
            }`}
          >
            {/* Header with glowing ball and signal status */}
            <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                {/* Glowing signal ball - ONLY on reversal */}
                {isReversal ? (
                  <span className="relative flex h-3.5 w-3.5">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                        isRevBull ? 'bg-emerald-400' : 'bg-rose-400'
                      } opacity-75`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                        isRevBull ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-rose-500 shadow-[0_0_12px_#ef4444]'
                      }`}
                    />
                  </span>
                ) : (
                  <span className="relative flex h-3 w-3">
                    <span className="inline-flex rounded-full h-3 w-3 bg-slate-600" />
                  </span>
                )}

                <div>
                  <span className={`text-xs font-black tracking-wide ${isRevBull ? 'text-emerald-400' : isRevBear ? 'text-rose-400' : 'text-slate-300'}`}>
                    {isRevBull
                      ? '🟢 Fim de Baixa'
                      : isRevBear
                      ? '🔴 Fim de Alta'
                      : '⚪ Aguardando Fim de Tendência'}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {isReversal
                      ? isRevBull
                        ? `Fim de Baixa no Suporte R$ ${indicators?.support.toFixed(2) || '0.00'} · Candle Branco (Entrada)`
                        : `Fim de Alta na Resistência R$ ${indicators?.resistance.toFixed(2) || '0.00'} · Candle Branco (Entrada)`
                      : 'Último candle de reversão é destacado na cor Branca'}
                  </div>
                </div>
              </div>

              {/* Minimize & Close buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsBoxMinimized(!isBoxMinimized)}
                  className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                  title={isBoxMinimized ? 'Expandir caixa' : 'Minimizar caixa'}
                >
                  {isBoxMinimized ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setShowMessageBox(false)}
                  className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                  title="Fechar mensagem"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Box Body (Expandable) */}
            {!isBoxMinimized && (
              <div className="p-3 text-xs space-y-2.5">
                {/* Reversal / Pattern Description */}
                <div className="rounded bg-[#080d17]/80 p-2 border border-slate-800/80 text-[11px] text-slate-300">
                  <p className="font-medium">
                    {isReversal ? (
                      <span className={`${isRevBull ? 'text-emerald-300' : 'text-rose-300'} font-semibold block mb-0.5`}>
                        ⚡ {signal?.reversal?.reasons[0] || (isRevBull ? 'Candle no suporte estrutural com virada compradora' : 'Candle na resistência estrutural com virada vendedora')}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-normal block mb-0.5">
                        {timeframe === '1h'
                          ? 'Reversão Proporcional 1H: Exige movimento mais demorado atingindo os topos de resistência e fundos de suporte de 1 hora, eliminando pequenas reversões e ruídos intermediários.'
                          : timeframe === '15m'
                          ? 'Reversão Proporcional 15M: Ciclo ágil intraday para capturar o início de tendências de 15 minutos em suportes e resistências chave.'
                          : `Reversão Proporcional ${timeframe.toUpperCase()}: Calibrada dinamicamente ao tempo gráfico para assegurar topos e fundos reais.`}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/50 mt-1">
                    <span>Ativo: <strong className="text-white font-mono">{symbol} ({timeframe.toUpperCase()})</strong></span>
                    <span>Modo: <strong className="text-sky-400 font-mono">
                      {timeframe === '1h' ? 'Ciclo 1H (Demorado / Topo-Fundo)' : timeframe === '15m' ? 'Ciclo 15M (Intraday Ágil)' : `Ciclo ${timeframe.toUpperCase()}`}
                    </strong></span>
                  </div>
                </div>

                {/* Operation Execution Parameters (Entry, Stop Loss, Target 1, Target 2) */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#05080f]/90 p-2.5 rounded border border-slate-800/80">
                  <div>
                    <span className="text-slate-400 text-[10px] block">PREÇO DE ENTRADA</span>
                    <strong className="text-slate-100 text-xs">
                      R$ {signal?.signalPrice ? signal.signalPrice.toFixed(2) : (lastCandle?.close.toFixed(2) || '0.00')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">STOP LOSS ({isRevBull ? 'Abaixo Suporte' : 'Acima Resist.'})</span>
                    <strong className="text-rose-400 text-xs">
                      R$ {signal?.stopLoss ? signal.stopLoss.toFixed(2) : (lastCandle ? (lastCandle.close * 0.98).toFixed(2) : '0.00')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ALVO 1 (Intermediário)</span>
                    <strong className="text-emerald-400 text-xs">
                      R$ {signal?.takeProfit1 ? signal.takeProfit1.toFixed(2) : (lastCandle ? (lastCandle.close * 1.025).toFixed(2) : '0.00')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ALVO 2 ({isRevBull ? 'Resistência' : 'Suporte'})</span>
                    <strong className="text-emerald-300 text-xs">
                      R$ {signal?.takeProfit2 ? signal.takeProfit2.toFixed(2) : (lastCandle ? (lastCandle.close * 1.06).toFixed(2) : '0.00')}
                    </strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/50 flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Relação Risco / Retorno:</span>
                    <strong className="text-sky-400 font-bold text-xs">
                      1 : {signal?.riskRewardRatio ? signal.riskRewardRatio.toFixed(1) : '3.2'}
                    </strong>
                  </div>
                </div>

                {/* Action Button: Execute Simulation */}
                <div className="pt-0.5">
                  <button
                    onClick={handleSimulateOrder}
                    disabled={!isReversal}
                    className={`w-full py-1.5 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                      isRevBull
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50 cursor-pointer'
                        : isRevBear
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50 cursor-pointer'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>
                      {isRevBull
                        ? 'SIMULAR ENTRADA NO SUPORTE (COMPRA)'
                        : isRevBear
                        ? 'SIMULAR ENTRADA NA RESISTÊNCIA (VENDA)'
                        : 'AGUARDANDO FIM DE TENDÊNCIA (MACD + MÉDIAS 9/21)'}
                    </span>
                  </button>

                  {orderExecutedFeedback && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 p-1.5 rounded border border-emerald-500/50">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{orderExecutedFeedback}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subgráfico MACD Sincronizado (Requisitado: Exibir o MACD no gráfico) */}
      <div
        className="w-full border-t border-[#1f293d] bg-[#070b12]"
        style={{ display: showMACD ? 'block' : 'none' }}
      >
        <div className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-[#0a0f1a] border-b border-[#161f30] text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-300">Sub-Gráfico MACD (12, 26, 9)</span>
            <span className="text-slate-600">|</span>
            <span className="text-yellow-300 font-bold">Linha MACD (Amarela)</span>
            <span className="text-slate-500">·</span>
            <span className="text-white font-bold">Sinal (Branca)</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400 font-semibold">Histograma</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Validação técnica de Fim de Tendência
          </div>
        </div>
        <div ref={macdChartContainerRef} className="w-full h-[135px]" />
      </div>

      {/* Bottom Bar: Candle OHLCV summary and Technical Indicator Values */}
      {lastCandle && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#1f293d] bg-[#0c111c] px-4 py-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>O: <strong className="text-slate-200">{lastCandle.open.toFixed(2)}</strong></span>
            <span>H: <strong className="text-emerald-400">{lastCandle.high.toFixed(2)}</strong></span>
            <span>L: <strong className="text-rose-400">{lastCandle.low.toFixed(2)}</strong></span>
            <span>C: <strong className="text-slate-200">{lastCandle.close.toFixed(2)}</strong></span>
            <span>Vol: <strong className="text-slate-300">{lastCandle.volume.toLocaleString('pt-BR')}</strong></span>
          </div>
          {indicators && (
            <div className="hidden md:flex items-center gap-3 text-slate-400">
              <span>RSI: <strong className="text-slate-200">{indicators.rsi14.toFixed(1)}</strong></span>
              <span>MACD: <strong className={indicators.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {indicators.macd.histogram >= 0 ? '+' : ''}{indicators.macd.histogram.toFixed(3)}
              </strong></span>
              <span>ATR: <strong className="text-slate-200">{indicators.atr14.toFixed(2)}</strong></span>
              <span>ADX: <strong className="text-slate-200">{indicators.adx14.toFixed(1)}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TradingViewChart = React.memo(TradingViewChartComponent);

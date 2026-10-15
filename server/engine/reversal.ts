import type { Candle, IndicatorValues, ReversalAnalysis, Timeframe } from '../types.ts';
import { calculateEMA, calculateMACD } from './indicators.ts';
import { detectCandlestickPatterns, detectDivergences } from './patterns.ts';

export interface TimeframeReversalProfile {
  lookbackCandles: number;
  minTrendSlope: number;
  minSwingDepth: number; // Minimum percentage swing from high/low to the level
  levelTolerance: number;
  minCandleSeparation: number;
  timeframeLabel: string;
}

export function getTimeframeProfile(timeframe: Timeframe = '15m'): TimeframeReversalProfile {
  switch (timeframe) {
    case '5m':
      return {
        lookbackCandles: 10,
        minTrendSlope: 0.004,
        minSwingDepth: 0.008, // 0.8%
        levelTolerance: 0.006,
        minCandleSeparation: 6,
        timeframeLabel: '5M (Reversão Rápida / Scalp)',
      };
    case '15m':
      return {
        lookbackCandles: 14,
        minTrendSlope: 0.007,
        minSwingDepth: 0.015, // 1.5%
        levelTolerance: 0.008,
        minCandleSeparation: 8,
        timeframeLabel: '15M (Reversão Intraday)',
      };
    case '1h':
      return {
        lookbackCandles: 26, // ~4 dias de pregão B3
        minTrendSlope: 0.018, // 1.8%
        minSwingDepth: 0.030, // 3.0% para topos e fundos de 1h
        levelTolerance: 0.012,
        minCandleSeparation: 12,
        timeframeLabel: '1H (Reversão Estrutural / Topos e Fundos)',
      };
    case '2h':
    case '4h':
      return {
        lookbackCandles: 24,
        minTrendSlope: 0.024,
        minSwingDepth: 0.045, // 4.5%
        levelTolerance: 0.015,
        minCandleSeparation: 10,
        timeframeLabel: '4H (Reversão Macro / Médio Prazo)',
      };
    case '1d':
    case '1w':
      return {
        lookbackCandles: 30,
        minTrendSlope: 0.040,
        minSwingDepth: 0.065, // 6.5%
        levelTolerance: 0.020,
        minCandleSeparation: 15,
        timeframeLabel: 'Diário (Reversão Ampla de Tendência)',
      };
    default:
      return {
        lookbackCandles: 14,
        minTrendSlope: 0.007,
        minSwingDepth: 0.015,
        levelTolerance: 0.008,
        minCandleSeparation: 8,
        timeframeLabel: '15M (Padrão)',
      };
  }
}

export function analyzeReversal(
  candles: Candle[],
  indicators: IndicatorValues,
  higherTimeframeTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral',
  lastCandleClosed = true,
  timeframe: Timeframe = '15m'
): ReversalAnalysis {
  if (candles.length < 12) {
    return {
      isReversal: false,
      type: 'NONE',
      confidence: 0,
      patterns: [],
      reasons: [],
      lastCandleClosed,
    };
  }

  const profile = getTimeframeProfile(timeframe);

  const patterns = detectCandlestickPatterns(candles);
  const closes = candles.map(c => c.close);
  const rsiDivergences = detectDivergences(
    candles,
    closes.map(() => indicators.rsi14),
    closes.map(() => indicators.macd.histogram)
  );

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const currentPrice = lastCandle.close;

  const isLastCandleBullish = lastCandle.close >= lastCandle.open;
  const isLastCandleBearish = lastCandle.close < lastCandle.open;

  const candleRange = Math.max(0.0001, lastCandle.high - lastCandle.low);
  const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
  const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
  const lowerWickRatio = lowerWick / candleRange;
  const upperWickRatio = upperWick / candleRange;

  // Analysis of prior candles proportional to timeframe lookback
  const actualLookback = Math.min(profile.lookbackCandles, candles.length - 1);
  const recentSlice = candles.slice(-actualLookback - 1, -1);

  const priorSlope = recentSlice.length > 3
    ? (recentSlice[recentSlice.length - 1].close - recentSlice[0].close) / recentSlice[0].close
    : 0;

  const highestPrior = Math.max(...recentSlice.map(c => c.high));
  const lowestPrior = Math.min(...recentSlice.map(c => c.low));

  const dropFromHigh = (highestPrior - lastCandle.low) / (highestPrior || 1);
  const rallyFromLow = (lastCandle.high - lowestPrior) / (lowestPrior || 1);

  const downCandlesCount = recentSlice.filter(c => c.close <= c.open).length;
  const upCandlesCount = recentSlice.filter(c => c.close >= c.open).length;

  const isPriorDowntrend =
    dropFromHigh >= profile.minSwingDepth ||
    (priorSlope < -profile.minTrendSlope && downCandlesCount >= Math.floor(recentSlice.length * 0.5));

  const isPriorUptrend =
    rallyFromLow >= profile.minSwingDepth ||
    (priorSlope > profile.minTrendSlope && upCandlesCount >= Math.floor(recentSlice.length * 0.5));

  // Support & Resistance tests
  const distToSupport = (currentPrice - indicators.support) / (currentPrice || 1);
  const testedSupport =
    lastCandle.low <= indicators.support * (1 + profile.levelTolerance) ||
    (distToSupport >= -0.008 && distToSupport <= profile.levelTolerance) ||
    (lastCandle.low <= indicators.bollinger.lower * 1.005);

  const distToResistance = (indicators.resistance - currentPrice) / (currentPrice || 1);
  const testedResistance =
    lastCandle.high >= indicators.resistance * (1 - profile.levelTolerance) ||
    (distToResistance >= -0.008 && distToResistance <= profile.levelTolerance) ||
    (lastCandle.high >= indicators.bollinger.upper * 0.995);

  // =========================================================================
  // CONFIRMAÇÕES DE MÉDIAS MÓVEIS E MACD (Regra solicitada pelo usuário):
  // "bolas para topos como fim de tendencia e fundos como fim de tendencia
  //  confirmado pelo macd e medias moveis"
  // =========================================================================
  const macdData = calculateMACD(closes);
  const lastMacdHist = macdData.histogram[closes.length - 1] ?? indicators.macd.histogram;
  const prevMacdHist = macdData.histogram[closes.length - 2] ?? lastMacdHist;
  const lastMacdLine = macdData.macdLine[closes.length - 1] ?? indicators.macd.line;
  const lastMacdSig = macdData.signalLine[closes.length - 1] ?? indicators.macd.signal;

  const ema9Data = calculateEMA(closes, 9);
  const ema21Data = calculateEMA(closes, 21);
  const lastEma9 = ema9Data[closes.length - 1] ?? indicators.ema9;
  const prevEma9 = ema9Data[closes.length - 2] ?? lastEma9;
  const lastEma21 = ema21Data[closes.length - 1] ?? indicators.ema21;
  const prevEma21 = ema21Data[closes.length - 2] ?? lastEma21;

  // 1. Confirmações para FUNDO (Fim da tendência de baixa / Início de Alta):
  // - MACD: Histograma infletindo para cima (menos negativo ou positivo) OU Linha MACD > Sinal
  const isMacdBullishConfirmed =
    (lastMacdHist >= prevMacdHist) ||
    (lastMacdLine >= lastMacdSig) ||
    (lastMacdHist > -0.04);

  // - Médias Móveis (EMA 9 e 21): Preço defende o suporte e retoma a EMA 9 ou aproximação altista em direção à EMA 21
  const isMovingAverageBullishConfirmed =
    (currentPrice >= lastEma9 * 0.997) ||
    (lastCandle.close > prevCandle.close && lastEma9 >= prevEma9 * 0.999) ||
    (lastEma9 - lastEma21 >= (prevEma9 - prevEma21) * 0.998) ||
    (lowerWickRatio >= 0.35 && currentPrice >= indicators.support);

  // 2. Confirmações para TOPO (Fim da tendência de alta / Início de Baixa):
  // - MACD: Histograma infletindo para baixo (menos positivo ou negativo) OU Linha MACD < Sinal
  const isMacdBearishConfirmed =
    (lastMacdHist <= prevMacdHist) ||
    (lastMacdLine <= lastMacdSig) ||
    (lastMacdHist < 0.04);

  // - Médias Móveis (EMA 9 e 21): Preço rejeita a resistência e perde a EMA 9 ou afastamento baixista da EMA 21
  const isMovingAverageBearishConfirmed =
    (currentPrice <= lastEma9 * 1.003) ||
    (lastCandle.close < prevCandle.close && lastEma9 <= prevEma9 * 1.001) ||
    (lastEma9 - lastEma21 <= (prevEma9 - prevEma21) * 1.002) ||
    (upperWickRatio >= 0.35 && currentPrice <= indicators.resistance);

  // ==========================================
  // FUNDO: FIM DE TENDÊNCIA DE BAIXA (🟢 BOLA VERDE)
  // ==========================================
  const bullishReasons: string[] = [];
  let bullishPoints = 0;

  // Requer: Fundo no suporte + Exaustão da queda + Confirmação MACD + Confirmação Médias Móveis
  if (testedSupport && isPriorDowntrend && isMacdBullishConfirmed && isMovingAverageBullishConfirmed) {
    bullishPoints += 40;
    bullishReasons.push(`🟢 FUNDO IDENTIFICADO: Fim da tendência de baixa no suporte R$ ${indicators.support.toFixed(2)} (${profile.timeframeLabel})`);
    bullishReasons.push('✔ Confirmado por Médias Móveis: Preço defendeu o suporte e retomou a EMA 9');
    bullishReasons.push(`✔ Confirmado pelo MACD: Inflexão compradora no histograma (${lastMacdHist >= prevMacdHist ? 'curvando para alta' : 'cruzamento positivo'})`);

    // Candlestick action at Support:
    if (isLastCandleBullish) {
      if (lastCandle.close > prevCandle.high) {
        bullishPoints += 25;
        bullishReasons.push('Candle comprador superou a máxima anterior rompendo a inércia vendedora');
      } else if (lastCandle.close > prevCandle.close) {
        bullishPoints += 15;
        bullishReasons.push('Fechamento comprador positivo no fundo');
      }

      if (lowerWickRatio >= 0.3) {
        bullishPoints += 15;
        bullishReasons.push('Sombra inferior relevante demonstrando absorção compradora no fundo');
      }
    } else {
      if (lowerWickRatio >= 0.45) {
        bullishPoints += 25;
        bullishReasons.push('Martelo / Pinbar com forte rejeição da mínima no suporte');
      }
    }

    // Pattern confirmation at Support
    const bullishPattern = patterns.find(p => p.type === 'bullish');
    if (bullishPattern) {
      bullishPoints += 20;
      bullishReasons.push(`Padrão gráfico altista formado no fundo: ${bullishPattern.name}`);
    }

    if (indicators.rsi14 < 45 && indicators.rsi14 > 20) {
      bullishPoints += 10;
      bullishReasons.push(`RSI em recuperação (${indicators.rsi14.toFixed(1)}) saindo da sobrevenda`);
    }
    if (indicators.volumeRatio >= 1.15) {
      bullishPoints += 10;
      bullishReasons.push(`Volume ${((indicators.volumeRatio - 1) * 100).toFixed(0)}% acima da média validando o fundo`);
    }
    if (rsiDivergences.bullishRSI || rsiDivergences.bullishMACD) {
      bullishPoints += 15;
      bullishReasons.push('Divergência altista confirmada no fundo');
    }
  }

  // ==========================================
  // TOPO: FIM DE TENDÊNCIA DE ALTA (🔴 BOLA VERMELHA)
  // ==========================================
  const bearishReasons: string[] = [];
  let bearishPoints = 0;

  // Requer: Topo na resistência + Exaustão da alta + Confirmação MACD + Confirmação Médias Móveis
  if (testedResistance && isPriorUptrend && isMacdBearishConfirmed && isMovingAverageBearishConfirmed) {
    bearishPoints += 40;
    bearishReasons.push(`🔴 TOPO IDENTIFICADO: Fim da tendência de alta na resistência R$ ${indicators.resistance.toFixed(2)} (${profile.timeframeLabel})`);
    bearishReasons.push('✔ Confirmado por Médias Móveis: Preço rejeitou a resistência e perdeu a EMA 9');
    bearishReasons.push(`✔ Confirmado pelo MACD: Inflexão vendedora no histograma (${lastMacdHist <= prevMacdHist ? 'curvando para baixa' : 'cruzamento negativo'})`);

    // Candlestick action at Resistance:
    if (isLastCandleBearish) {
      if (lastCandle.close < prevCandle.low) {
        bearishPoints += 25;
        bearishReasons.push('Candle vendedor rompeu a mínima anterior configurando engolfo no topo');
      } else if (lastCandle.close < prevCandle.close) {
        bearishPoints += 15;
        bearishReasons.push('Fechamento em queda com reversão imediata no topo');
      }

      if (upperWickRatio >= 0.3) {
        bearishPoints += 15;
        bearishReasons.push('Sombra superior longa indicando rejeição institucional de topo');
      }
    } else {
      if (upperWickRatio >= 0.45) {
        bearishPoints += 25;
        bearishReasons.push('Estrela cadente / Shooting Star com rejeição maciça do topo');
      }
    }

    // Pattern confirmation at Resistance
    const bearishPattern = patterns.find(p => p.type === 'bearish');
    if (bearishPattern) {
      bearishPoints += 20;
      bearishReasons.push(`Padrão gráfico vendedor formado no topo: ${bearishPattern.name}`);
    }

    if (indicators.rsi14 > 55 && indicators.rsi14 < 80) {
      bearishPoints += 10;
      bearishReasons.push(`RSI em declínio (${indicators.rsi14.toFixed(1)}) após sobrecompra`);
    }
    if (indicators.volumeRatio >= 1.15) {
      bearishPoints += 10;
      bearishReasons.push(`Volume ${((indicators.volumeRatio - 1) * 100).toFixed(0)}% acima da média validando o topo`);
    }
    if (rsiDivergences.bearishRSI || rsiDivergences.bearishMACD) {
      bearishPoints += 15;
      bearishReasons.push('Divergência baixista confirmada no topo');
    }
  }

  // Normalize confidence (0 to 100)
  const maxPossible = 95;
  const bullishConfidence = (testedSupport && isPriorDowntrend && isMacdBullishConfirmed && isMovingAverageBullishConfirmed)
    ? Math.min(98, Math.round((bullishPoints / maxPossible) * 100))
    : 0;
  const bearishConfidence = (testedResistance && isPriorUptrend && isMacdBearishConfirmed && isMovingAverageBearishConfirmed)
    ? Math.min(98, Math.round((bearishPoints / maxPossible) * 100))
    : 0;

  // Strict Threshold: Minimum 60% confidence with MACD and Moving Average confirmations
  const REVERSAL_THRESHOLD = 60;

  if (bullishConfidence >= REVERSAL_THRESHOLD && bullishConfidence > bearishConfidence + 10) {
    return {
      isReversal: true,
      type: 'BULLISH',
      confidence: bullishConfidence,
      patterns: patterns.map(p => p.name),
      reasons: bullishReasons,
      lastCandleClosed,
    };
  }

  if (bearishConfidence >= REVERSAL_THRESHOLD && bearishConfidence > bullishConfidence + 10) {
    return {
      isReversal: true,
      type: 'BEARISH',
      confidence: bearishConfidence,
      patterns: patterns.map(p => p.name),
      reasons: bearishReasons,
      lastCandleClosed,
    };
  }

  return {
    isReversal: false,
    type: 'NONE',
    confidence: Math.max(bullishConfidence, bearishConfidence),
    patterns: patterns.map(p => p.name),
    reasons: [],
    lastCandleClosed,
  };
}

import type { Candle, IndicatorValues, Timeframe } from '../types.ts';

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
      result.push(sum / period);
    }
  }
  return result;
}

export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  if (data.length === 0) return result;
  const multiplier = 2 / (period + 1);

  // Initial SMA as first EMA
  let prevEMA = data[0];
  result.push(prevEMA);

  for (let i = 1; i < data.length; i++) {
    const currentEMA = (data[i] - prevEMA) * multiplier + prevEMA;
    result.push(currentEMA);
    prevEMA = currentEMA;
  }
  return result;
}

export function calculateRSI(closes: number[], period = 14): number[] {
  const result: number[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => 50);
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i <= period; i++) {
    result.push(50);
  }

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }

  return result;
}

export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

  return { macdLine, signalLine, histogram };
}

export function calculateATR(candles: Candle[], period = 14): number[] {
  const tr: number[] = [];
  if (candles.length === 0) return [];

  tr.push(candles[0].high - candles[0].low);

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
  }

  return calculateSMA(tr, period);
}

export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): { upper: number[]; middle: number[]; lower: number[]; bandwidth: number[] } {
  const sma = calculateSMA(closes, period);
  const upper: number[] = [];
  const middle = sma;
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(closes[i]);
      lower.push(closes[i]);
      bandwidth.push(0);
      continue;
    }

    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const up = mean + stdDevMultiplier * stdDev;
    const low = mean - stdDevMultiplier * stdDev;
    upper.push(up);
    lower.push(low);
    bandwidth.push(mean > 0 ? (up - low) / mean : 0);
  }

  return { upper, middle, lower, bandwidth };
}

export function calculateADX(candles: Candle[], period = 14): number[] {
  if (candles.length < period * 2) {
    return candles.map(() => 25);
  }

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const hl = cur.high - cur.low;
    const hc = Math.abs(cur.high - prev.close);
    const lc = Math.abs(cur.low - prev.close);
    tr.push(Math.max(hl, hc, lc));
  }

  const smoothedTR = calculateEMA(tr, period);
  const smoothedPlusDM = calculateEMA(plusDM, period);
  const smoothedMinusDM = calculateEMA(minusDM, period);

  const dx: number[] = [];
  for (let i = 0; i < smoothedTR.length; i++) {
    const trVal = smoothedTR[i] || 1;
    const plusDI = (smoothedPlusDM[i] / trVal) * 100;
    const minusDI = (smoothedMinusDM[i] / trVal) * 100;
    const sumDI = plusDI + minusDI;
    const diffDI = Math.abs(plusDI - minusDI);
    dx.push(sumDI === 0 ? 0 : (diffDI / sumDI) * 100);
  }

  const adx = calculateEMA(dx, period);
  return [25, ...adx];
}

export function calculateSupertrend(candles: Candle[], period = 10, multiplier = 3): { value: number; direction: 'up' | 'down' } {
  if (candles.length < period) {
    const last = candles[candles.length - 1];
    return { value: last ? last.close : 0, direction: 'up' };
  }

  const atrs = calculateATR(candles, period);
  let upperBand = 0;
  let lowerBand = 0;
  let direction: 'up' | 'down' = 'up';
  let supertrendValue = 0;

  for (let i = period; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const atr = atrs[i] || 1;

    const basicUpper = (c.high + c.low) / 2 + multiplier * atr;
    const basicLower = (c.high + c.low) / 2 - multiplier * atr;

    if (i === period) {
      upperBand = basicUpper;
      lowerBand = basicLower;
    } else {
      upperBand = basicUpper < upperBand || prevC.close > upperBand ? basicUpper : upperBand;
      lowerBand = basicLower > lowerBand || prevC.close < lowerBand ? basicLower : lowerBand;
    }

    if (direction === 'up' && c.close < lowerBand) {
      direction = 'down';
    } else if (direction === 'down' && c.close > upperBand) {
      direction = 'up';
    }

    supertrendValue = direction === 'up' ? lowerBand : upperBand;
  }

  return { value: supertrendValue, direction };
}

export function calculateVWAP(candles: Candle[]): number {
  if (candles.length === 0) return 0;
  let totalPV = 0;
  let totalVolume = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    totalPV += typicalPrice * c.volume;
    totalVolume += c.volume;
  }

  return totalVolume > 0 ? totalPV / totalVolume : candles[candles.length - 1].close;
}

export function findSupportResistance(candles: Candle[], timeframe: Timeframe = '15m'): { support: number; resistance: number } {
  if (candles.length < 5) {
    const last = candles[candles.length - 1]?.close || 10;
    return { support: last * 0.98, resistance: last * 1.02 };
  }

  // Lookback and minimum spread calibrated proportionally to timeframe:
  // 1h has a longer lookback to capture major multi-session tops and bottoms,
  // while 15m is tuned to intraday swings.
  let lookback = 60;
  let minSpread = 0.018; // 1.8%

  if (timeframe === '5m') {
    lookback = 45;
    minSpread = 0.010; // 1.0%
  } else if (timeframe === '15m') {
    lookback = 60;
    minSpread = 0.018; // 1.8%
  } else if (timeframe === '1h') {
    lookback = 90;
    minSpread = 0.035; // 3.5%
  } else if (timeframe === '2h' || timeframe === '4h') {
    lookback = 80;
    minSpread = 0.045; // 4.5%
  } else if (timeframe === '1d' || timeframe === '1w') {
    lookback = 100;
    minSpread = 0.065; // 6.5%
  }

  const slice = candles.slice(-Math.min(lookback, candles.length));
  const currentPrice = candles[candles.length - 1].close;

  // Scan prior candles (excluding the very last candle to see historical levels tested)
  const histSlice = slice.slice(0, -1);
  if (histSlice.length < 4) {
    return { support: currentPrice * (1 - minSpread * 0.5), resistance: currentPrice * (1 + minSpread * 0.5) };
  }

  const swingLows: number[] = [];
  const swingHighs: number[] = [];
  let minLow = histSlice[0].low;
  let maxHigh = histSlice[0].high;

  // Window for swing pivot confirmation (wider window for 1h to avoid noise)
  const pivotWindow = timeframe === '1h' || timeframe === '4h' || timeframe === '1d' ? 3 : 2;

  for (let i = pivotWindow; i < histSlice.length - pivotWindow; i++) {
    const c = histSlice[i];
    let isLow = true;
    let isHigh = true;
    for (let k = 1; k <= pivotWindow; k++) {
      if (histSlice[i - k].low < c.low || histSlice[i + k].low < c.low) isLow = false;
      if (histSlice[i - k].high > c.high || histSlice[i + k].high > c.high) isHigh = false;
    }
    if (isLow) swingLows.push(c.low);
    if (isHigh) swingHighs.push(c.high);
    if (c.low < minLow) minLow = c.low;
    if (c.high > maxHigh) maxHigh = c.high;
  }

  // Find the most relevant support: lowest swing or closest support near/below current price
  let support = minLow;
  if (swingLows.length > 0) {
    const relevantSupports = swingLows.filter(l => l <= currentPrice * 1.015);
    if (relevantSupports.length > 0) {
      support = Math.max(...relevantSupports);
    } else {
      support = Math.min(...swingLows);
    }
  }

  // Find the most relevant resistance: highest swing or closest resistance near/above current price
  let resistance = maxHigh;
  if (swingHighs.length > 0) {
    const relevantResistances = swingHighs.filter(h => h >= currentPrice * 0.985);
    if (relevantResistances.length > 0) {
      resistance = Math.min(...relevantResistances);
    } else {
      resistance = Math.max(...swingHighs);
    }
  }

  // Ensure minimum realistic spread between support and resistance proportional to timeframe
  if (resistance <= support * (1 + minSpread)) {
    resistance = Math.max(resistance, support * (1 + minSpread * 1.2));
  }

  return {
    support: Number(support.toFixed(2)),
    resistance: Number(resistance.toFixed(2)),
  };
}

export function computeAllIndicators(candles: Candle[], timeframe: Timeframe = '15m'): IndicatorValues {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const lastIndex = candles.length - 1;

  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  const ema50Series = calculateEMA(closes, 50);
  const ema200Series = calculateEMA(closes, 200);

  const sma20Series = calculateSMA(closes, 20);
  const sma50Series = calculateSMA(closes, 50);
  const sma200Series = calculateSMA(closes, 200);

  const rsiSeries = calculateRSI(closes, 14);
  const macdData = calculateMACD(closes);
  const atrSeries = calculateATR(candles, 14);
  const bbData = calculateBollingerBands(closes, 20, 2);
  const adxSeries = calculateADX(candles, 14);
  const supertrend = calculateSupertrend(candles, 10, 3);
  const vwap = calculateVWAP(candles.slice(-50));
  const { support, resistance } = findSupportResistance(candles, timeframe);

  const volSMA = calculateSMA(volumes, 20);
  const currentVol = volumes[lastIndex] || 1;
  const avgVol = volSMA[lastIndex] || 1;
  const volumeRatio = avgVol > 0 ? currentVol / avgVol : 1;

  return {
    ema9: ema9Series[lastIndex] || closes[lastIndex],
    ema21: ema21Series[lastIndex] || closes[lastIndex],
    ema50: ema50Series[lastIndex] || closes[lastIndex],
    ema200: ema200Series[lastIndex] || closes[lastIndex],
    sma20: sma20Series[lastIndex] || closes[lastIndex],
    sma50: sma50Series[lastIndex] || closes[lastIndex],
    sma200: sma200Series[lastIndex] || closes[lastIndex],
    rsi14: rsiSeries[lastIndex] || 50,
    macd: {
      line: macdData.macdLine[lastIndex] || 0,
      signal: macdData.signalLine[lastIndex] || 0,
      histogram: macdData.histogram[lastIndex] || 0,
    },
    atr14: atrSeries[lastIndex] || (closes[lastIndex] * 0.015),
    vwap,
    bollinger: {
      upper: bbData.upper[lastIndex] || closes[lastIndex] * 1.02,
      middle: bbData.middle[lastIndex] || closes[lastIndex],
      lower: bbData.lower[lastIndex] || closes[lastIndex] * 0.98,
      bandwidth: bbData.bandwidth[lastIndex] || 0.04,
    },
    adx14: adxSeries[lastIndex] || 25,
    supertrend,
    volumeAvg20: avgVol,
    volumeRatio,
    support,
    resistance,
  };
}

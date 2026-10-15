import type { BacktestParams, BacktestResult, Candle } from '../types.ts';
import { computeAllIndicators } from './indicators.ts';
import { analyzeReversal } from './reversal.ts';
import { evaluateSignal } from './scoring.ts';

export function runBacktest(candles: Candle[], params: BacktestParams): BacktestResult {
  if (candles.length < 50) {
    return {
      symbol: params.symbol,
      timeframe: params.timeframe,
      strategy: params.strategy,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      grossProfit: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      expectancy: 0,
      trades: [],
    };
  }

  const trades: BacktestResult['trades'] = [];
  let capital = params.initialCapital;
  let peakCapital = capital;
  let maxDrawdown = 0;
  let totalGrossProfit = 0;
  let totalGrossLoss = 0;

  let inPosition: {
    type: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    entryDate: string;
    entryIndex: number;
  } | null = null;

  // Walk-forward simulation through candles
  for (let i = 35; i < candles.length; i++) {
    const historicalSlice = candles.slice(0, i + 1);
    const currentCandle = candles[i];
    const prevCandle = candles[i - 1];

    // Check open position exit first
    if (inPosition) {
      let isClosed = false;
      let exitPrice = currentCandle.close;
      let status: 'WIN' | 'LOSS' = 'WIN';

      if (inPosition.type === 'BUY') {
        if (currentCandle.low <= inPosition.stopLoss) {
          exitPrice = inPosition.stopLoss;
          status = 'LOSS';
          isClosed = true;
        } else if (currentCandle.high >= inPosition.takeProfit) {
          exitPrice = inPosition.takeProfit;
          status = 'WIN';
          isClosed = true;
        } else if (i - inPosition.entryIndex >= 25) {
          // Timeout exit
          exitPrice = currentCandle.close;
          status = exitPrice >= inPosition.entryPrice ? 'WIN' : 'LOSS';
          isClosed = true;
        }
      } else {
        if (currentCandle.high >= inPosition.stopLoss) {
          exitPrice = inPosition.stopLoss;
          status = 'LOSS';
          isClosed = true;
        } else if (currentCandle.low <= inPosition.takeProfit) {
          exitPrice = inPosition.takeProfit;
          status = 'WIN';
          isClosed = true;
        } else if (i - inPosition.entryIndex >= 25) {
          exitPrice = currentCandle.close;
          status = exitPrice <= inPosition.entryPrice ? 'WIN' : 'LOSS';
          isClosed = true;
        }
      }

      if (isClosed) {
        const pctReturn =
          inPosition.type === 'BUY'
            ? (exitPrice - inPosition.entryPrice) / inPosition.entryPrice
            : (inPosition.entryPrice - exitPrice) / inPosition.entryPrice;

        const tradeRiskCapital = capital * 0.05; // 5% risk per trade
        const profitCash = tradeRiskCapital * (pctReturn * 20); // leverage / position scaling
        capital += profitCash;

        if (profitCash > 0) totalGrossProfit += profitCash;
        else totalGrossLoss += Math.abs(profitCash);

        if (capital > peakCapital) peakCapital = capital;
        const currentDD = ((peakCapital - capital) / peakCapital) * 100;
        if (currentDD > maxDrawdown) maxDrawdown = currentDD;

        trades.push({
          id: `trade-${trades.length + 1}`,
          type: inPosition.type,
          entryDate: inPosition.entryDate,
          exitDate: new Date(currentCandle.time * 1000).toISOString().slice(0, 16).replace('T', ' '),
          entryPrice: Number(inPosition.entryPrice.toFixed(2)),
          exitPrice: Number(exitPrice.toFixed(2)),
          resultPercent: Number((pctReturn * 100).toFixed(2)),
          profitCash: Number(profitCash.toFixed(2)),
          status,
        });

        inPosition = null;
      }
    }

    // If not in position, scan for new entry
    if (!inPosition && i < candles.length - 2) {
      const indicators = computeAllIndicators(historicalSlice);
      const reversal = analyzeReversal(historicalSlice, indicators, 'neutral', true);
      const signal = evaluateSignal(
        params.symbol,
        params.symbol,
        'B3',
        params.timeframe,
        historicalSlice,
        indicators,
        reversal,
        0,
        {},
        undefined,
        true
      );

      let shouldEnterBuy = false;
      let shouldEnterSell = false;

      if (params.strategy === 'REVERSAL') {
        shouldEnterBuy = reversal.isReversal && reversal.type === 'BULLISH' && reversal.confidence >= 75;
        shouldEnterSell = reversal.isReversal && reversal.type === 'BEARISH' && reversal.confidence >= 75;
      } else if (params.strategy === 'TREND_CONFLUENCE') {
        shouldEnterBuy = signal.direction === 'BUY' && signal.score >= 80;
        shouldEnterSell = signal.direction === 'SELL' && signal.score <= 20;
      } else if (params.strategy === 'MOMENTUM_BREAKOUT') {
        shouldEnterBuy = currentCandle.close > indicators.resistance && indicators.volumeRatio > 1.3;
        shouldEnterSell = currentCandle.close < indicators.support && indicators.volumeRatio > 1.3;
      }

      const atr = indicators.atr14 || currentCandle.close * 0.015;

      if (shouldEnterBuy) {
        inPosition = {
          type: 'BUY',
          entryPrice: currentCandle.close,
          stopLoss: currentCandle.close - 1.5 * atr,
          takeProfit: currentCandle.close + 3.0 * atr,
          entryDate: new Date(currentCandle.time * 1000).toISOString().slice(0, 16).replace('T', ' '),
          entryIndex: i,
        };
      } else if (shouldEnterSell) {
        inPosition = {
          type: 'SELL',
          entryPrice: currentCandle.close,
          stopLoss: currentCandle.close + 1.5 * atr,
          takeProfit: currentCandle.close - 3.0 * atr,
          entryDate: new Date(currentCandle.time * 1000).toISOString().slice(0, 16).replace('T', ' '),
          entryIndex: i,
        };
      }
    }
  }

  const winningTrades = trades.filter(t => t.status === 'WIN').length;
  const losingTrades = trades.filter(t => t.status === 'LOSS').length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;
  const profitFactor = totalGrossLoss > 0 ? Number((totalGrossProfit / totalGrossLoss).toFixed(2)) : totalGrossProfit > 0 ? 99 : 0;
  const expectancy = totalTrades > 0 ? Number(((capital - params.initialCapital) / totalTrades).toFixed(2)) : 0;

  return {
    symbol: params.symbol,
    timeframe: params.timeframe,
    strategy: params.strategy,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    grossProfit: Number((capital - params.initialCapital).toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(1)),
    profitFactor,
    expectancy,
    trades: trades.reverse(), // most recent first
  };
}

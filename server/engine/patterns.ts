import type { Candle } from '../types.ts';

export interface PatternResult {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  reliability: 'high' | 'medium' | 'low';
  description: string;
}

export function detectCandlestickPatterns(candles: Candle[]): PatternResult[] {
  if (candles.length < 3) return [];

  const results: PatternResult[] = [];
  const c3 = candles[candles.length - 1]; // Current / latest closed candle
  const c2 = candles[candles.length - 2]; // Previous candle
  const c1 = candles[candles.length - 3]; // 2 candles ago

  const c3Body = Math.abs(c3.close - c3.open);
  const c3Range = c3.high - c3.low || 0.0001;
  const c3UpperShadow = c3.high - Math.max(c3.open, c3.close);
  const c3LowerShadow = Math.min(c3.open, c3.close) - c3.low;
  const c3IsGreen = c3.close > c3.open;

  const c2Body = Math.abs(c2.close - c2.open);
  const c2IsGreen = c2.close > c2.open;

  const c1Body = Math.abs(c1.close - c1.open);
  const c1IsGreen = c1.close > c1.open;

  // 1. Hammer (Reversal Bullish)
  if (c3LowerShadow >= 2 * c3Body && c3UpperShadow <= 0.2 * c3Range && !c2IsGreen) {
    results.push({
      name: 'Hammer (Martelo)',
      type: 'bullish',
      reliability: 'high',
      description: 'Rejeição de mínimas com sombra inferior longa em região de suporte',
    });
  }

  // 2. Inverted Hammer (Martelo Invertido)
  if (c3UpperShadow >= 2 * c3Body && c3LowerShadow <= 0.2 * c3Range && !c2IsGreen) {
    results.push({
      name: 'Martelo Invertido',
      type: 'bullish',
      reliability: 'medium',
      description: 'Pressão compradora testando topos após queda',
    });
  }

  // 3. Shooting Star (Estrela Cadente)
  if (c3UpperShadow >= 2 * c3Body && c3LowerShadow <= 0.2 * c3Range && c2IsGreen) {
    results.push({
      name: 'Estrela Cadente (Shooting Star)',
      type: 'bearish',
      reliability: 'high',
      description: 'Rejeição forte de topo com sombra superior longa após movimento de alta',
    });
  }

  // 4. Bullish Engulfing (Engolfo de Alta)
  if (!c2IsGreen && c3IsGreen && c3.open <= c2.close && c3.close >= c2.open && c3Body > c2Body) {
    results.push({
      name: 'Engolfo de Alta (Bullish Engulfing)',
      type: 'bullish',
      reliability: 'high',
      description: 'Corpo verde envolve totalmente a vela vermelha anterior com volume',
    });
  }

  // 5. Bearish Engulfing (Engolfo de Baixa)
  if (c2IsGreen && !c3IsGreen && c3.open >= c2.close && c3.close <= c2.open && c3Body > c2Body) {
    results.push({
      name: 'Engolfo de Baixa (Bearish Engulfing)',
      type: 'bearish',
      reliability: 'high',
      description: 'Corpo vermelho engolfa completamente a vela compradora anterior',
    });
  }

  // 6. Doji (Indecisão / Potencial Reversão)
  if (c3Body / c3Range < 0.1) {
    results.push({
      name: 'Doji',
      type: 'neutral',
      reliability: 'medium',
      description: 'Equilíbrio total entre compradores e vendedores com abertura e fechamento iguais',
    });
  }

  // 7. Morning Star (Estrela da Manhã) - 3 candles
  if (!c1IsGreen && (c2Body / (c2.high - c2.low || 0.0001) < 0.3) && c3IsGreen && c3.close > (c1.open + c1.close) / 2) {
    results.push({
      name: 'Estrela da Manhã (Morning Star)',
      type: 'bullish',
      reliability: 'high',
      description: 'Padrão clássico de 3 candles indicando reversão forte de baixa para alta',
    });
  }

  // 8. Evening Star (Estrela da Noite) - 3 candles
  if (c1IsGreen && (c2Body / (c2.high - c2.low || 0.0001) < 0.3) && !c3IsGreen && c3.close < (c1.open + c1.close) / 2) {
    results.push({
      name: 'Estrela da Noite (Evening Star)',
      type: 'bearish',
      reliability: 'high',
      description: 'Padrão clássico de 3 candles indicando reversão de alta para baixa',
    });
  }

  // 9. Piercing Line (Linha de Perfuração)
  if (!c2IsGreen && c3IsGreen && c3.open < c2.low && c3.close > (c2.open + c2.close) / 2 && c3.close < c2.open) {
    results.push({
      name: 'Linha de Perfuração (Piercing Line)',
      type: 'bullish',
      reliability: 'medium',
      description: 'Abertura em gap de baixa com fechamento acima de 50% da vela anterior',
    });
  }

  // 10. Dark Cloud Cover (Nuvem Negra)
  if (c2IsGreen && !c3IsGreen && c3.open > c2.high && c3.close < (c2.open + c2.close) / 2 && c3.close > c2.open) {
    results.push({
      name: 'Nuvem Negra (Dark Cloud Cover)',
      type: 'bearish',
      reliability: 'medium',
      description: 'Abertura em gap de alta com fechamento abaixo de 50% da vela compradora',
    });
  }

  // 11. Marubozu
  if (c3Body / c3Range > 0.88) {
    results.push({
      name: c3IsGreen ? 'Marubozu de Alta' : 'Marubozu de Baixa',
      type: c3IsGreen ? 'bullish' : 'bearish',
      reliability: 'high',
      description: 'Vela de convicção direcional extrema quase sem sombras',
    });
  }

  return results;
}

export function detectDivergences(
  candles: Candle[],
  rsiSeries: number[],
  macdHistogram: number[]
): { bullishRSI: boolean; bearishRSI: boolean; bullishMACD: boolean; bearishMACD: boolean } {
  if (candles.length < 20) {
    return { bullishRSI: false, bearishRSI: false, bullishMACD: false, bearishMACD: false };
  }

  const len = candles.length;
  const pCurrent = candles[len - 1].close;
  const pPrev = candles[len - 10].close;

  const rsiCurrent = rsiSeries[len - 1] || 50;
  const rsiPrev = rsiSeries[len - 10] || 50;

  const macdCurrent = macdHistogram[len - 1] || 0;
  const macdPrev = macdHistogram[len - 10] || 0;

  // Bullish divergence: price made lower low, but indicator made higher low
  const bullishRSI = pCurrent < pPrev && rsiCurrent > rsiPrev && rsiCurrent < 45;
  const bullishMACD = pCurrent < pPrev && macdCurrent > macdPrev && macdCurrent < 0;

  // Bearish divergence: price made higher high, but indicator made lower high
  const bearishRSI = pCurrent > pPrev && rsiCurrent < rsiPrev && rsiCurrent > 55;
  const bearishMACD = pCurrent > pPrev && macdCurrent < macdPrev && macdCurrent > 0;

  return { bullishRSI, bearishRSI, bullishMACD, bearishMACD };
}

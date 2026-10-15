import type {
  AdminWeightsConfig,
  Candle,
  IndicatorValues,
  MarketSignal,
  MarketType,
  ReversalAnalysis,
  SignalDirection,
  SignalFactor,
  SignalGrade,
  Timeframe,
} from '../types.ts';

export const defaultWeights: AdminWeightsConfig = {
  trend: 20,
  movingAverages: 15,
  macd: 15,
  rsi: 10,
  volume: 10,
  priceAction: 10,
  supportResistance: 10,
  multiTimeframe: 5,
  news: 5,
  buyThreshold: 68,
  sellThreshold: 32,
  riskMode: 'CONSERVADOR',
  demoMode: false,
  confirmOnlyOnClose: true,
  minRiskReward: 2.0,
};

export function evaluateSignal(
  symbol: string,
  assetName: string,
  market: MarketType,
  timeframe: Timeframe,
  candles: Candle[],
  indicators: IndicatorValues,
  reversal: ReversalAnalysis,
  newsScore = 0,
  multiTimeframeStatus: { [key in Timeframe]?: 'bullish' | 'bearish' | 'neutral' } = {},
  weights: AdminWeightsConfig = defaultWeights,
  isCandleClosed = true
): MarketSignal {
  const currentPrice = candles[candles.length - 1]?.close || 10;
  const factors: SignalFactor[] = [];
  const reasons: string[] = [];

  let bullishPoints = 0;
  let bearishPoints = 0;

  // 1. Trend Evaluation (Max points: weights.trend = 20)
  const isPriceAboveEma200 = currentPrice > indicators.ema200;
  const isSupertrendUp = indicators.supertrend.direction === 'up';
  const isADXStrong = indicators.adx14 > 22;

  let trendPoints = 0;
  let trendStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let trendDesc = 'Tendência neutra ou indefinida';

  if (isPriceAboveEma200 && isSupertrendUp) {
    trendPoints = weights.trend;
    trendStatus = 'bullish';
    trendDesc = `Supertrend de alta e preço acima da EMA 200 (R$ ${indicators.ema200.toFixed(2)})`;
    bullishPoints += trendPoints;
    reasons.push('Tendência primária de alta confirmada pela EMA 200');
  } else if (!isPriceAboveEma200 && !isSupertrendUp) {
    trendPoints = weights.trend;
    trendStatus = 'bearish';
    trendDesc = `Supertrend de baixa e preço abaixo da EMA 200 (R$ ${indicators.ema200.toFixed(2)})`;
    bearishPoints += trendPoints;
    reasons.push('Tendência primária de baixa confirmada pela EMA 200');
  } else {
    trendPoints = Math.round(weights.trend / 2);
  }

  factors.push({
    name: 'Tendência Principal',
    category: 'Trend',
    points: trendPoints,
    maxPoints: weights.trend,
    status: trendStatus,
    description: trendDesc,
  });

  // 2. Moving Averages Alignment (Max points: weights.movingAverages = 15)
  let maPoints = 0;
  let maStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let maDesc = '';

  const isEmaBullish = indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema50;
  const isEmaBearish = indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema50;

  if (isEmaBullish) {
    maPoints = weights.movingAverages;
    maStatus = 'bullish';
    maDesc = 'Alinhamento altista das médias: EMA 9 > EMA 21 > EMA 50';
    bullishPoints += maPoints;
    reasons.push('Médias móveis de curto e médio prazo alinhadas para alta');
  } else if (isEmaBearish) {
    maPoints = weights.movingAverages;
    maStatus = 'bearish';
    maDesc = 'Alinhamento baixista das médias: EMA 9 < EMA 21 < EMA 50';
    bearishPoints += maPoints;
    reasons.push('Médias móveis alinhadas para baixa');
  } else {
    maPoints = Math.round(weights.movingAverages * 0.4);
    maDesc = 'Médias móveis entrelaçadas';
  }

  factors.push({
    name: 'Médias Móveis (EMA 9/21/50)',
    category: 'MovingAverages',
    points: maPoints,
    maxPoints: weights.movingAverages,
    status: maStatus,
    description: maDesc,
  });

  // 3. MACD Momentum (Max points: weights.macd = 15)
  let macdPoints = 0;
  let macdStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let macdDesc = '';

  if (indicators.macd.line > indicators.macd.signal && indicators.macd.histogram > 0) {
    macdPoints = weights.macd;
    macdStatus = 'bullish';
    macdDesc = `MACD cruzado acima do sinal com histograma positivo (+${indicators.macd.histogram.toFixed(3)})`;
    bullishPoints += macdPoints;
    reasons.push('MACD com momentum comprador crescente');
  } else if (indicators.macd.line < indicators.macd.signal && indicators.macd.histogram < 0) {
    macdPoints = weights.macd;
    macdStatus = 'bearish';
    macdDesc = `MACD cruzado abaixo do sinal com histograma negativo (${indicators.macd.histogram.toFixed(3)})`;
    bearishPoints += macdPoints;
    reasons.push('MACD com momentum vendedor');
  } else {
    macdPoints = Math.round(weights.macd * 0.3);
    macdDesc = 'MACD em zona neutra';
  }

  factors.push({
    name: 'MACD Momentum',
    category: 'MACD',
    points: macdPoints,
    maxPoints: weights.macd,
    status: macdStatus,
    description: macdDesc,
  });

  // 4. RSI (Max points: weights.rsi = 10)
  let rsiPoints = 0;
  let rsiStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let rsiDesc = '';

  if (indicators.rsi14 >= 42 && indicators.rsi14 <= 65) {
    rsiPoints = weights.rsi;
    rsiStatus = 'bullish';
    rsiDesc = `RSI em zona favorável de expansão (${indicators.rsi14.toFixed(1)})`;
    bullishPoints += rsiPoints;
    reasons.push(`RSI saudável em ${indicators.rsi14.toFixed(1)} com espaço para alta`);
  } else if (indicators.rsi14 < 35) {
    rsiPoints = Math.round(weights.rsi * 0.8);
    rsiStatus = 'bullish'; // Oversold bounce potential
    rsiDesc = `RSI sobrevendido (${indicators.rsi14.toFixed(1)}) indicando exaustão vendedora`;
    bullishPoints += rsiPoints;
    reasons.push('RSI em sobrevenda com rejeição');
  } else if (indicators.rsi14 > 70) {
    rsiPoints = weights.rsi;
    rsiStatus = 'bearish';
    rsiDesc = `RSI em sobrecompra (${indicators.rsi14.toFixed(1)}) alertando exaustão compradora`;
    bearishPoints += rsiPoints;
    reasons.push('RSI em sobrecompra extrema');
  } else {
    rsiPoints = Math.round(weights.rsi * 0.5);
    rsiStatus = 'neutral';
    rsiDesc = `RSI neutro (${indicators.rsi14.toFixed(1)})`;
  }

  factors.push({
    name: 'RSI (14)',
    category: 'RSI',
    points: rsiPoints,
    maxPoints: weights.rsi,
    status: rsiStatus,
    description: rsiDesc,
  });

  // 5. Volume Confirmation (Max points: weights.volume = 10)
  let volPoints = 0;
  let volStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let volDesc = '';

  if (indicators.volumeRatio >= 1.25) {
    volPoints = weights.volume;
    const isUpCandle = candles[candles.length - 1].close >= candles[candles.length - 1].open;
    volStatus = isUpCandle ? 'bullish' : 'bearish';
    volDesc = `Volume ${(indicators.volumeRatio * 100).toFixed(0)}% da média móvel de 20 períodos`;
    if (isUpCandle) bullishPoints += volPoints;
    else bearishPoints += volPoints;
    reasons.push(`Volume acima da média (+${((indicators.volumeRatio - 1) * 100).toFixed(0)}%) validando o movimento`);
  } else {
    volPoints = Math.round(weights.volume * 0.4);
    volDesc = `Volume normal (${(indicators.volumeRatio * 100).toFixed(0)}% da média)`;
  }

  factors.push({
    name: 'Confirmação de Volume',
    category: 'Volume',
    points: volPoints,
    maxPoints: weights.volume,
    status: volStatus,
    description: volDesc,
  });

  // 6. Support & Resistance + Reversal Pattern (Max: 20 points combined)
  let srPoints = 0;
  let srStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let srDesc = '';

  if (reversal.isReversal && reversal.type === 'BULLISH') {
    srPoints = weights.supportResistance + weights.priceAction;
    srStatus = 'bullish';
    srDesc = `Reversão altista confirmada no suporte de R$ ${indicators.support.toFixed(2)}`;
    bullishPoints += srPoints;
    reasons.push(...reversal.reasons.slice(0, 2));
  } else if (reversal.isReversal && reversal.type === 'BEARISH') {
    srPoints = weights.supportResistance + weights.priceAction;
    srStatus = 'bearish';
    srDesc = `Reversão baixista confirmada na resistência de R$ ${indicators.resistance.toFixed(2)}`;
    bearishPoints += srPoints;
    reasons.push(...reversal.reasons.slice(0, 2));
  } else {
    srPoints = Math.round((weights.supportResistance + weights.priceAction) * 0.3);
    srDesc = `Suporte: R$ ${indicators.support.toFixed(2)} | Resistência: R$ ${indicators.resistance.toFixed(2)}`;
  }

  factors.push({
    name: 'Suporte, Resistência & Reversão',
    category: 'SupportResistance',
    points: srPoints,
    maxPoints: weights.supportResistance + weights.priceAction,
    status: srStatus,
    description: srDesc,
  });

  // 7. Multi-timeframe Confluence (Max: weights.multiTimeframe = 5)
  const mtfValues = Object.values(multiTimeframeStatus);
  const bullishMtfCount = mtfValues.filter(v => v === 'bullish').length;
  const bearishMtfCount = mtfValues.filter(v => v === 'bearish').length;
  const totalMtfCount = mtfValues.length || 1;

  let mtfPoints = 0;
  let mtfStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (bullishMtfCount >= totalMtfCount * 0.6) {
    mtfPoints = weights.multiTimeframe;
    mtfStatus = 'bullish';
    bullishPoints += mtfPoints;
    reasons.push(`Confluência favorável em ${bullishMtfCount}/${totalMtfCount} timeframes`);
  } else if (bearishMtfCount >= totalMtfCount * 0.6) {
    mtfPoints = weights.multiTimeframe;
    mtfStatus = 'bearish';
    bearishPoints += mtfPoints;
    reasons.push(`Alinhamento vendedor em ${bearishMtfCount}/${totalMtfCount} timeframes`);
  } else {
    mtfPoints = Math.round(weights.multiTimeframe * 0.5);
  }

  factors.push({
    name: 'Confluência Multi-Timeframe',
    category: 'MultiTimeframe',
    points: mtfPoints,
    maxPoints: weights.multiTimeframe,
    status: mtfStatus,
    description: `Alinhamento de timeframes (${bullishMtfCount} alta, ${bearishMtfCount} baixa)`,
  });

  // 8. News Sentiment (Max: weights.news = 5)
  let newsPoints = 0;
  let newsStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (newsScore > 25) {
    newsPoints = weights.news;
    newsStatus = 'bullish';
    bullishPoints += newsPoints;
    reasons.push(`Notícias de mercado com impacto positivo (+${newsScore})`);
  } else if (newsScore < -25) {
    newsPoints = weights.news;
    newsStatus = 'bearish';
    bearishPoints += newsPoints;
    reasons.push(`Notícias com viés desfavorável (${newsScore})`);
  } else {
    newsPoints = Math.round(weights.news * 0.5);
  }

  factors.push({
    name: 'Sentimento de Notícias',
    category: 'News',
    points: newsPoints,
    maxPoints: weights.news,
    status: newsStatus,
    description: `Pontuação de notícias: ${newsScore > 0 ? '+' : ''}${newsScore}`,
  });

  // Lateral Market Detection (ADX < 20 and Bollinger bandwidth narrow)
  const isLateral = indicators.adx14 < 20 && indicators.bollinger.bandwidth < 0.035;

  // High Volatility Detection
  const isHighVolatility = indicators.atr14 / currentPrice > 0.035;

  // Compute final 0-100 Score
  let rawScore = 50;
  if (bullishPoints > bearishPoints) {
    rawScore = Math.min(100, Math.round(50 + (bullishPoints / 100) * 50));
  } else if (bearishPoints > bullishPoints) {
    rawScore = Math.max(0, Math.round(50 - (bearishPoints / 100) * 50));
  }

  // If last candle confirmed a reversal at key support/resistance, elevate score
  if (reversal.isReversal) {
    if (reversal.type === 'BULLISH') {
      rawScore = Math.max(rawScore, 88);
      reasons.unshift(`🟢 Fim de Baixa: Reversão no suporte R$ ${indicators.support.toFixed(2)} com alvo na resistência R$ ${indicators.resistance.toFixed(2)}`);
    } else if (reversal.type === 'BEARISH') {
      rawScore = Math.min(rawScore, 12);
      reasons.unshift(`🔴 Fim de Alta: Reversão na resistência R$ ${indicators.resistance.toFixed(2)} com alvo no suporte R$ ${indicators.support.toFixed(2)}`);
    }
  }

  // Lateral dampening only if no active reversal breakout
  if (isLateral && !reversal.isReversal) {
    rawScore = Math.round(rawScore * 0.75 + 50 * 0.25); // pull towards 50
  }

  // Determine Direction based on threshold or reversal
  // REGRA DO USUÁRIO: "o aplicativo esta dando entradas erradas, somente no final de uma tendencia de alta ou de baixa"
  // Entradas (BUY / SELL) são emitidas EXCLUSIVAMENTE quando houver confirmação técnica de Fim de Tendência (Reversão de Fundo ou Topo)!
  // Fora do fim de tendência (meio de movimento ou sem reversão confirmada por MACD e Médias 9 e 21), a direção é estritamente 'WAIT'.
  let direction: SignalDirection = 'WAIT';
  if (reversal.isReversal) {
    if (reversal.type === 'BULLISH') {
      direction = 'BUY';
    } else if (reversal.type === 'BEARISH') {
      direction = 'SELL';
    }
  } else {
    direction = 'WAIT';
    reasons.unshift(
      '⚪ AGUARDANDO FIM DE TENDÊNCIA: Entrada bloqueada no meio do movimento. Entradas de Compra/Venda são acionadas estritamente no final de tendência de alta (topo) ou de baixa (fundo) com confirmação pelo MACD e Médias Móveis de 9 e 21.'
    );
  }

  // Signal Grade: A/B para reversões confirmadas, D para espera
  let grade: SignalGrade = 'D';
  if (direction !== 'WAIT') {
    if (reversal.confidence >= 75) grade = 'A';
    else if (reversal.confidence >= 60) grade = 'B';
    else grade = 'C';
  } else {
    grade = 'D';
  }

  // Calculate High-Gain Stop Loss, Take Profit 1 & 2 aiming for the full structural swing
  const atr = indicators.atr14 || currentPrice * 0.015;
  let stopLoss = 0;
  let takeProfit1 = 0;
  let takeProfit2 = 0;
  let riskRewardRatio = 0;

  if (direction === 'BUY') {
    // Stop safely below support level
    const calculatedStop = Math.min(indicators.support * 0.992, currentPrice - 1.2 * atr);
    stopLoss = Math.max(0.01, Number(calculatedStop.toFixed(2)));
    const risk = Math.max(currentPrice * 0.006, currentPrice - stopLoss);

    // Target 1: Midpoint towards Resistance (min 2.0x risk)
    const distToResistance = Math.max(risk * 2.2, indicators.resistance - currentPrice);
    takeProfit1 = Number((currentPrice + distToResistance * 0.5).toFixed(2));

    // Target 2: FULL swing to Resistance level (capturing 3.0 to 5.0+ Risk/Reward)
    takeProfit2 = Number(Math.max(indicators.resistance * 0.998, currentPrice + risk * 3.2).toFixed(2));
    riskRewardRatio = Number(((takeProfit2 - currentPrice) / risk).toFixed(1));
  } else if (direction === 'SELL') {
    // Stop safely above resistance level
    const calculatedStop = Math.max(indicators.resistance * 1.008, currentPrice + 1.2 * atr);
    stopLoss = Number(calculatedStop.toFixed(2));
    const risk = Math.max(currentPrice * 0.006, stopLoss - currentPrice);

    // Target 1: Midpoint towards Support (min 2.0x risk)
    const distToSupport = Math.max(risk * 2.2, currentPrice - indicators.support);
    takeProfit1 = Math.max(0.01, Number((currentPrice - distToSupport * 0.5).toFixed(2)));

    // Target 2: FULL swing to Support level (capturing 3.0 to 5.0+ Risk/Reward)
    takeProfit2 = Math.max(0.01, Number(Math.min(indicators.support * 1.002, currentPrice - risk * 3.2).toFixed(2)));
    riskRewardRatio = Number(((currentPrice - takeProfit2) / risk).toFixed(1));
  } else {
    stopLoss = Number((currentPrice * 0.97).toFixed(2));
    takeProfit1 = Number((currentPrice * 1.03).toFixed(2));
    takeProfit2 = Number((currentPrice * 1.06).toFixed(2));
    riskRewardRatio = 2.0;
  }

  const dateObj = new Date();
  const dateStr = dateObj.toISOString().slice(0, 10);
  const timeStr = dateObj.toLocaleTimeString('pt-BR');
  const cleanTime = timeStr.replace(/:/g, '');
  const id = `${symbol}-${timeframe.toUpperCase()}-${dateStr}-${cleanTime}-${direction}`;

  const confluenceRatio = `${reasons.length} confirmações independentes`;

  return {
    id,
    symbol,
    assetName,
    market,
    timeframe,
    direction,
    grade,
    score: rawScore,
    confidencePercent: direction === 'BUY' ? rawScore : direction === 'SELL' ? 100 - rawScore : 50,
    currentPrice,
    signalPrice: currentPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskRewardRatio,
    timestamp: Date.now(),
    timeString: timeStr,
    reversal,
    factors,
    reasons: reasons.length > 0 ? reasons : ['Sem confluência suficiente para posicionamento direcional'],
    multiTimeframeStatus,
    confluenceRatio,
    isConfirmed: isCandleClosed,
    isLateral,
    isHighVolatility,
    status: 'ACTIVE',
    currentProfitPercent: 0,
  };
}

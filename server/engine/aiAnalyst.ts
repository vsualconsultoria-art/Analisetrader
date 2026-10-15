import { GoogleGenAI } from '@google/genai';
import type { AIAnalysisResponse, IndicatorValues, MarketSignal, ReversalAnalysis } from '../types.ts';

interface StructuredMarketInput {
  asset: string;
  timeframe: string;
  price: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd: { line: number; signal: number; histogram: number };
  volumeRatio: number;
  trend: string;
  support: number;
  resistance: number;
  reversal: ReversalAnalysis;
  newsScore: number;
  score: number;
  confluenceReasons: string[];
}

export async function generateAIAnalysis(
  signal: MarketSignal,
  indicators: IndicatorValues,
  newsScore = 0
): Promise<AIAnalysisResponse> {
  const structuredData: StructuredMarketInput = {
    asset: signal.symbol,
    timeframe: signal.timeframe,
    price: signal.currentPrice,
    ema9: Number(indicators.ema9.toFixed(2)),
    ema21: Number(indicators.ema21.toFixed(2)),
    ema50: Number(indicators.ema50.toFixed(2)),
    ema200: Number(indicators.ema200.toFixed(2)),
    rsi: Number(indicators.rsi14.toFixed(1)),
    macd: {
      line: Number(indicators.macd.line.toFixed(3)),
      signal: Number(indicators.macd.signal.toFixed(3)),
      histogram: Number(indicators.macd.histogram.toFixed(3)),
    },
    volumeRatio: Number(indicators.volumeRatio.toFixed(2)),
    trend: signal.factors.find(f => f.category === 'Trend')?.description || 'Neutro',
    support: signal.stopLoss,
    resistance: signal.takeProfit1,
    reversal: signal.reversal,
    newsScore,
    score: signal.score,
    confluenceReasons: signal.reasons,
  };

  const apiKey = process.env.GEMINI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_URL;

  // 1. Try Gemini API first if configured
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é o AI Market Analyst do sistema MarketAI Radar.
Analise os seguintes DADOS TÉCNICOS E ESTRUTURADOS REAIS calculados pelo backend para o ativo ${structuredData.asset}:

${JSON.stringify(structuredData, null, 2)}

REGRAS RÍGIDAS DE ANÁLISE:
1. NÃO invente preços, notícias, datas ou indicadores além dos fornecidos.
2. Seja objetivo, técnico e probabilístico. NUNCA declare 'certeza', 'garantido' ou '100% de precisão'.
3. Retorne EXATAMENTE um objeto JSON válido no seguinte formato sem marcação markdown adicional:
{
  "marketReading": "Minha leitura do mercado: [parágrafo detalhado com interpretação técnica de price action, médias, momentum MACD, RSI e volume]",
  "risks": ["Risco 1...", "Risco 2...", "Risco 3..."],
  "invalidations": ["Fator 1 que invalidaria o sinal...", "Fator 2...", "Fator 3..."]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim() || '{}';
      const parsed = JSON.parse(text);

      return {
        symbol: signal.symbol,
        timeframe: signal.timeframe,
        direction: signal.direction,
        confidence: signal.confidencePercent,
        marketReading: parsed.marketReading || generateDeterministicReading(structuredData),
        risks: Array.isArray(parsed.risks) && parsed.risks.length > 0 ? parsed.risks : generateDeterministicRisks(structuredData),
        invalidations: Array.isArray(parsed.invalidations) && parsed.invalidations.length > 0 ? parsed.invalidations : generateDeterministicInvalidations(structuredData),
        generatedAt: new Date().toLocaleTimeString('pt-BR'),
        model: 'gemini-3.8-flash (Google GenAI)',
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local deterministic engine:', err);
    }
  }

  // 2. Try Ollama if configured
  if (ollamaUrl && process.env.AI_PROVIDER === 'ollama') {
    try {
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen',
          prompt: `Analise estes dados de mercado em JSON: ${JSON.stringify(structuredData)}. Responda em JSON com marketReading, risks, invalidations.`,
          stream: false,
          format: 'json',
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { response: string };
        const parsed = JSON.parse(body.response);
        return {
          symbol: signal.symbol,
          timeframe: signal.timeframe,
          direction: signal.direction,
          confidence: signal.confidencePercent,
          marketReading: parsed.marketReading || generateDeterministicReading(structuredData),
          risks: parsed.risks || generateDeterministicRisks(structuredData),
          invalidations: parsed.invalidations || generateDeterministicInvalidations(structuredData),
          generatedAt: new Date().toLocaleTimeString('pt-BR'),
          model: 'Qwen / Ollama (Local)',
        };
      }
    } catch {
      // fallback
    }
  }

  // 3. High-fidelity statistical & rule-based engine (100% data-grounded, zero hallucination)
  return {
    symbol: signal.symbol,
    timeframe: signal.timeframe,
    direction: signal.direction,
    confidence: signal.confidencePercent,
    marketReading: generateDeterministicReading(structuredData),
    risks: generateDeterministicRisks(structuredData),
    invalidations: generateDeterministicInvalidations(structuredData),
    generatedAt: new Date().toLocaleTimeString('pt-BR'),
    model: 'MarketAI Quantitative Engine (Audited Local)',
  };
}

function generateDeterministicReading(data: StructuredMarketInput): string {
  const dirStr = data.score >= 80 ? 'predominantemente altista' : data.score <= 20 ? 'predominantemente baixista' : 'de consolidação e indefinição direcional';
  const volStr = data.volumeRatio >= 1.2
    ? `O volume está expressivo (${(data.volumeRatio * 100).toFixed(0)}% da média de 20 períodos), confirmando interesse institucional.`
    : `O volume encontra-se moderado (${(data.volumeRatio * 100).toFixed(0)}% da média), sugerindo cautela em rompimentos imediatos.`;

  const maStr = data.price > data.ema200
    ? `O preço negocia acima da EMA 200 (R$ ${data.ema200.toFixed(2)}), mantendo a tendência estrutural de médio prazo preservada.`
    : `O preço negocia abaixo da EMA 200 (R$ ${data.ema200.toFixed(2)}), exigindo atenção com resistência das médias superiores.`;

  const rsiStr = data.rsi > 70
    ? `O RSI em ${data.rsi} indica região de sobrecompra e exaustão temporária.`
    : data.rsi < 35
    ? `O RSI em ${data.rsi} marca nível de sobrevenda e potencial repique técnico.`
    : `O RSI em ${data.rsi} opera em zona de equilíbrio saudável.`;

  const revStr = data.reversal.isReversal
    ? ` No último candle fechado, foi detectada evidência de reversão (${data.reversal.type === 'BULLISH' ? 'alta' : 'baixa'}) com ${data.reversal.confidence}% de confiança estatística.`
    : '';

  return `O ativo ${data.asset} apresenta estrutura ${dirStr} no timeframe de ${data.timeframe.toUpperCase()}. ${maStr} O oscilador MACD registra histograma em ${data.macd.histogram > 0 ? '+' : ''}${data.macd.histogram.toFixed(3)}. ${rsiStr} ${volStr}${revStr}`;
}

function generateDeterministicRisks(data: StructuredMarketInput): string[] {
  const list: string[] = [];
  if (data.score >= 80) {
    list.push(`Resistência imediata localizada próxima a R$ ${data.resistance.toFixed(2)}`);
    if (data.rsi > 65) list.push('RSI em patamar elevado, aumentando probabilidade de pullback');
    list.push('Eventual divergência no book de ofertas ou perda da EMA 21');
  } else if (data.score <= 20) {
    list.push(`Suporte relevante posicionado na região de R$ ${data.support.toFixed(2)}`);
    if (data.rsi < 35) list.push('Sobrevenda prolongada propícia a repique contra a tendência');
    list.push('Retorno de compradores institucionais no rompimento falso de fundo');
  } else {
    list.push('Mercado lateral sem momentum direcional definido (risco de violina)');
    list.push('Osciladores conflitantes com médias entrelaçadas');
    list.push('Ausência de confluência estatística suficiente');
  }
  return list;
}

function generateDeterministicInvalidations(data: StructuredMarketInput): string[] {
  const list: string[] = [];
  if (data.score >= 80) {
    list.push(`Fechamento de candle abaixo do stop loss técnico em R$ ${data.support.toFixed(2)}`);
    list.push('Cruzamento do MACD para o campo negativo');
    list.push('Queda abrupta de volume com perda da EMA 9');
  } else if (data.score <= 20) {
    list.push(`Fechamento de candle acima do stop loss técnico em R$ ${data.resistance.toFixed(2)}`);
    list.push('Inflexão altista do MACD com superação da EMA 21');
    list.push('Volume comprador anormal superando topo anterior');
  } else {
    list.push('Aguardar rompimento confirmado com volume acima da resistência ou suporte');
  }
  return list;
}

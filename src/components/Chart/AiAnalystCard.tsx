import React, { useState } from 'react';
import { Bot, Sparkles, AlertCircle, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { AIAnalysisResponse, MarketSignal } from '../../types/market.js';
import { requestAIAnalysis } from '../../services/api.js';

interface AiAnalystCardProps {
  signal: MarketSignal | null;
  symbol: string;
  timeframe: string;
}

export const AiAnalystCard: React.FC<AiAnalystCardProps> = ({
  signal,
  symbol,
  timeframe,
}) => {
  const [aiData, setAiData] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);

    // Sequence of steps as requested in #107
    const steps = [
      'Coletando dados do mercado...',
      'Calculando médias e osciladores...',
      'Analisando estrutura e price action...',
      'Processando inteligência de notícias...',
      'Consultando modelo de IA...',
      'Calculando score de confluência...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]);
      await new Promise(r => setTimeout(r, 200));
    }

    try {
      const result = await requestAIAnalysis(symbol, timeframe as any);
      setAiData(result);
    } catch (e: any) {
      setError(e.message || 'Erro ao processar análise de IA');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f293d] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              AI Market Analyst
              <span className="text-[10px] font-mono font-normal text-indigo-400 bg-indigo-950/50 px-1.5 py-0.2 rounded border border-indigo-800/40">
                Audited Quant
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Leitura probabilística estruturada com explicabilidade
            </span>
          </div>
        </div>

        {/* Analisar Agora Button as requested in #107 */}
        <button
          onClick={handleRunAnalysis}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
        >
          {loading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span>{loading ? loadingStep : 'ANALISAR AGORA'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded bg-rose-950/40 border border-rose-800/60 p-2 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {aiData ? (
        <div className="space-y-4 text-xs">
          {/* Market Reading */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              Minha leitura do mercado
            </h4>
            <div className="rounded border border-[#1f293d] bg-[#090d15] p-3 text-slate-200 leading-relaxed font-sans">
              {aiData.marketReading}
            </div>
          </div>

          {/* Risks & Invalidation in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded border border-amber-900/30 bg-amber-950/10 p-3">
              <h4 className="text-[11px] font-semibold uppercase text-amber-300 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                Riscos Identificados
              </h4>
              <ul className="space-y-1 text-slate-300">
                {aiData.risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">·</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-rose-900/30 bg-rose-950/10 p-3">
              <h4 className="text-[11px] font-semibold uppercase text-rose-300 mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                Fatores que Invalidariam o Sinal
              </h4>
              <ul className="space-y-1 text-slate-300">
                {aiData.invalidations.map((inv, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">·</span>
                    <span>{inv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
            <span>Modelo: {aiData.model}</span>
            <span>Gerado às: {aiData.generatedAt}</span>
          </div>
        </div>
      ) : (
        <div className="rounded border border-dashed border-[#1f293d] p-6 text-center text-slate-400">
          <Bot className="h-8 w-8 mx-auto mb-2 text-slate-600" />
          <p className="text-xs text-slate-300 font-medium">
            Clique em &ldquo;Analisar Agora&rdquo; para que a IA interprete os indicadores, notícias e confluências de {symbol}.
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Grounded nos dados numéricos calculados pelo backend, sem alucinação de preços.
          </p>
        </div>
      )}
    </div>
  );
};

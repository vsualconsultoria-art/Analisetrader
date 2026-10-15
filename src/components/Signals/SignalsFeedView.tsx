import React from 'react';
import { MarketSignal } from '../../types/market.js';
import { BellRing, Check, Clock, Shield, Target, ChevronRight, CheckCircle2 } from 'lucide-react';

interface SignalsFeedViewProps {
  signals: MarketSignal[];
  history: MarketSignal[];
  onSelectSymbol: (symbol: string) => void;
  onOpenDetail?: (signal: MarketSignal) => void;
}

export const SignalsFeedView: React.FC<SignalsFeedViewProps> = ({
  signals,
  history,
  onSelectSymbol,
  onOpenDetail,
}) => {
  // Combine signals and history
  const allSignals = [...history];
  for (const s of signals) {
    if (!allSignals.some(h => h.id === s.id)) {
      allSignals.unshift(s);
    }
  }

  const actionableSignals = allSignals.filter(s => s.direction !== 'WAIT');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1f293d] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BellRing className="h-5 w-5 text-emerald-400" />
            Feed de Sinais & Histórico Auditado
          </h2>
          <p className="text-xs text-slate-400">
            Registro cronológico imutável com justificativa estatística e rastreamento de resultado pós-sinal.
          </p>
        </div>

        <div className="mt-2 sm:mt-0 font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
          Sinais auditados: <strong className="text-slate-100">{actionableSignals.length}</strong>
        </div>
      </div>

      {/* Signals List */}
      <div className="space-y-3">
        {actionableSignals.length > 0 ? (
          actionableSignals.map((item) => {
            const isBuy = item.direction === 'BUY';
            const priceDiff = item.currentPrice - item.signalPrice;
            const returnPct = item.signalPrice > 0 ? (priceDiff / item.signalPrice) * 100 : 0;
            const adjustedReturn = isBuy ? returnPct : -returnPct;

            return (
              <div
                key={item.id}
                className={`rounded-lg border p-4 transition-all ${
                  isBuy
                    ? 'border-emerald-950 bg-[#08130e] hover:border-emerald-600/50'
                    : 'border-rose-950 bg-[#160a0d] hover:border-rose-600/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold border ${
                        isBuy
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isBuy ? 'C' : 'V'}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-white">
                          {item.symbol}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            isBuy ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isBuy ? 'COMPRA' : 'VENDA'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.timeframe.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Score: <strong className="text-white">{item.score}%</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>{item.timeString}</span>
                        <span>·</span>
                        <span>Preço no Sinal: R$ {item.signalPrice.toFixed(2)}</span>
                        <span>·</span>
                        <span>Atual: R$ {item.currentPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Result Badge */}
                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-500 block uppercase">Desempenho</span>
                      <span
                        className={`text-xs font-bold ${
                          adjustedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {adjustedReturn >= 0 ? '+' : ''}{adjustedReturn.toFixed(2)}%
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onSelectSymbol(item.symbol);
                        if (onOpenDetail) onOpenDetail(item);
                      }}
                      className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1 border border-slate-700"
                    >
                      <span>Ver Fatores</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Factors Summary */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
                  {item.reasons.map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800"
                    >
                      <Check className="h-3 w-3 text-emerald-400" />
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhum sinal confirmado registrado no histórico da sessão.
          </div>
        )}
      </div>
    </div>
  );
};

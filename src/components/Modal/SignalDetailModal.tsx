import React from 'react';
import { MarketSignal } from '../../types/market.js';
import { X, Check, Shield, Target, Clock, ArrowRight, Layers, FileText } from 'lucide-react';

interface SignalDetailModalProps {
  signal: MarketSignal | null;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
}

export const SignalDetailModal: React.FC<SignalDetailModalProps> = ({
  signal,
  onClose,
  onSelectSymbol,
}) => {
  if (!signal) return null;

  const isBuy = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl border border-[#1f293d] bg-[#0c111c] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 border-b border-[#1f293d] pb-4 mb-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-xl font-bold border ${
              isBuy
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : isSell
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            {isBuy ? 'COMPRA' : isSell ? 'VENDA' : 'AGUARDE'}
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xl font-bold text-white tracking-wide">
                {signal.symbol}
              </h2>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {signal.market}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {signal.timeframe.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {signal.assetName} · ID: <span className="font-mono text-[10px] text-slate-500">{signal.id}</span>
            </p>
          </div>
        </div>

        {/* Core Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs mb-5">
          <div className="rounded bg-[#090d15] p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Score / Confiança</span>
            <span className={`text-base font-bold ${isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-slate-200'}`}>
              {signal.score}/100 ({signal.confidencePercent}%)
            </span>
          </div>

          <div className="rounded bg-[#090d15] p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Preço Entrada</span>
            <span className="text-base font-bold text-white">
              R$ {signal.currentPrice.toFixed(2)}
            </span>
          </div>

          <div className="rounded bg-[#090d15] p-2.5 border border-slate-800">
            <span className="text-[10px] text-rose-400 block">Stop Loss</span>
            <span className="text-base font-bold text-rose-400">
              R$ {signal.stopLoss.toFixed(2)}
            </span>
          </div>

          <div className="rounded bg-[#090d15] p-2.5 border border-slate-800">
            <span className="text-[10px] text-emerald-400 block">Alvo 1 (R/R 1:{signal.riskRewardRatio})</span>
            <span className="text-base font-bold text-emerald-400">
              R$ {signal.takeProfit1.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Decision Log - Breakdown of points as required in #82 */}
        <div className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-2.5 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-emerald-400" />
            Log de Decisão Estatística (Composição de Pontos)
          </h3>

          <div className="rounded-lg border border-[#1f293d] bg-[#090d15] divide-y divide-[#172033] max-h-56 overflow-y-auto">
            {signal.factors.map((factor, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">{factor.name}</span>
                  <span className="text-[11px] text-slate-400">{factor.description}</span>
                </div>
                <div className="font-mono text-right pl-3 shrink-0">
                  <span
                    className={`font-bold ${
                      factor.status === 'bullish'
                        ? 'text-emerald-400'
                        : factor.status === 'bearish'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    +{factor.points}
                  </span>
                  <span className="text-slate-500 text-[10px]"> / {factor.maxPoints}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1f293d]">
          <span className="text-xs text-slate-500 font-mono">
            Horário do sinal: {signal.timeString}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                onSelectSymbol(signal.symbol);
                onClose();
              }}
              className="rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors"
            >
              Abrir Gráfico Completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

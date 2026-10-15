import React from 'react';
import { MarketSignal } from '../../types/market.js';
import { ArrowUpRight, ArrowDownRight, Clock, Target, Shield, Check, ChevronRight, AlertOctagon } from 'lucide-react';

interface SignalCardProps {
  signal: MarketSignal;
  onSelect: (symbol: string) => void;
  onOpenDetail?: (signal: MarketSignal) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  onSelect,
  onOpenDetail,
}) => {
  const isBuy = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';
  const isWait = signal.direction === 'WAIT';

  return (
    <div
      className={`rounded-lg border transition-all ${
        isBuy
          ? 'border-emerald-500/30 bg-[#091410] hover:border-emerald-500/60'
          : isSell
          ? 'border-rose-500/30 bg-[#160b0e] hover:border-rose-500/60'
          : 'border-[#1f293d] bg-[#0c111c] hover:border-slate-700'
      } p-4 flex flex-col justify-between`}
    >
      <div>
        {/* Top: Asset, Market, Direction Ball & Confidence */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-white tracking-wide">
                {signal.symbol}
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                {signal.market}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {signal.timeframe.toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-slate-400 truncate block max-w-[180px]">
              {signal.assetName}
            </span>
          </div>

          {/* Visual Signal Ball & Direction: ONLY green/red ball on trend reversal */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              {signal.reversal.isReversal ? (
                signal.reversal.type === 'BULLISH' ? (
                  <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_12px_#10b981]"></span>
                    </span>
                    Fim de Baixa [{signal.timeframe.toUpperCase()}] 🟢
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-black text-rose-400">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 shadow-[0_0_12px_#f43f5e]"></span>
                    </span>
                    Fim de Alta [{signal.timeframe.toUpperCase()}] 🔴
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-600 shadow-sm" />
                  AGUARDANDO [{signal.timeframe.toUpperCase()}]
                </span>
              )}
            </div>

            <div className="mt-0.5 text-right font-mono text-xs">
              <span className="text-slate-400 text-[10px]">Confiança: </span>
              <strong className={signal.reversal.isReversal ? (signal.reversal.type === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-400'}>
                {signal.reversal.isReversal ? `${signal.reversal.confidence}%` : `${signal.confidencePercent}%`}
              </strong>
            </div>
          </div>
        </div>

        {/* Price & Reversal Badge */}
        <div className="flex items-baseline justify-between mb-3 border-y border-slate-800/60 py-2">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Preço Atual</span>
            <span className="font-mono text-base font-bold text-slate-100">
              R$ {signal.currentPrice.toFixed(2)}
            </span>
          </div>

          {signal.reversal.isReversal ? (
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded border ${
                signal.reversal.type === 'BULLISH'
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'text-rose-400 bg-rose-950/60 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.25)]'
              }`}>
                <span className="h-2 w-2 rounded-full animate-pulse bg-current" />
                {signal.reversal.type === 'BULLISH'
                  ? `⚡ Fim de Baixa`
                  : `⚡ Fim de Alta`}
              </span>
            </div>
          ) : (
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400">
                Aguardando: <strong className="text-slate-300">Fim de Baixa ou Alta</strong>
              </span>
            </div>
          )}
        </div>

        {/* Levels: Entry, Stop, TP1, TP2, R/R */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3 bg-[#080d17] p-2.5 rounded border border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Shield className="h-3 w-3 text-rose-400" />
              Stop Loss
            </span>
            <span className="font-semibold text-rose-400">
              R$ {signal.stopLoss.toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Target className="h-3 w-3 text-emerald-400" />
              Alvo 1 (Interm.)
            </span>
            <span className="font-semibold text-emerald-400">
              R$ {signal.takeProfit1.toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500">Alvo 2 (Alvo Estrutural)</span>
            <span className="font-semibold text-emerald-300">
              R$ {signal.takeProfit2.toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500">Relação R/R</span>
            <span className="font-semibold text-sky-400">
              1:{signal.riskRewardRatio.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Motivos do sinal */}
        <div className="space-y-1 mb-3">
          <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Motivos da Confluência:
          </span>
          <div className="space-y-1 text-[11px]">
            {signal.reasons.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-slate-300">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="line-clamp-1">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card Actions: Ver Análise */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
          <Clock className="h-3 w-3" />
          {signal.timeString}
        </span>

        <button
          onClick={() => {
            onSelect(signal.symbol);
            if (onOpenDetail) onOpenDetail(signal);
          }}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <span>VER ANÁLISE</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

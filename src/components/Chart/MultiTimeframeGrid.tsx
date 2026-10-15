import React from 'react';
import { Timeframe } from '../../types/market.js';
import { CheckCircle2, XCircle, MinusCircle, Layers } from 'lucide-react';

interface MultiTimeframeGridProps {
  mtfStatus: { [key in Timeframe]?: 'bullish' | 'bearish' | 'neutral' };
  selectedTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
}

export const MultiTimeframeGrid: React.FC<MultiTimeframeGridProps> = ({
  mtfStatus,
  selectedTimeframe,
  onSelectTimeframe,
}) => {
  const timeframes: Timeframe[] = ['5m', '15m', '1h', '2h', '4h', '1d', '1w'];

  const bullishCount = Object.values(mtfStatus).filter(v => v === 'bullish').length;
  const bearishCount = Object.values(mtfStatus).filter(v => v === 'bearish').length;
  const totalCount = timeframes.length;

  return (
    <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Confluência Multi-Timeframe (MTF)
          </span>
        </div>
        <div className="text-xs font-mono">
          <span className="text-emerald-400 font-bold">{bullishCount}</span> alta /{' '}
          <span className="text-rose-400 font-bold">{bearishCount}</span> baixa de{' '}
          <span className="text-slate-300">{totalCount}</span> períodos
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {timeframes.map((tf) => {
          const status = mtfStatus[tf] || 'neutral';
          const isSelected = selectedTimeframe === tf;

          return (
            <button
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-[#1f293d] bg-[#090d15] hover:border-slate-700'
              }`}
            >
              <span className="font-mono text-xs font-bold text-slate-200">
                {tf.toUpperCase()}
              </span>

              <div className="my-1">
                {status === 'bullish' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : status === 'bearish' ? (
                  <XCircle className="h-4 w-4 text-rose-400" />
                ) : (
                  <MinusCircle className="h-4 w-4 text-slate-500" />
                )}
              </div>

              <span
                className={`text-[10px] font-semibold uppercase ${
                  status === 'bullish'
                    ? 'text-emerald-400'
                    : status === 'bearish'
                    ? 'text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {status === 'bullish' ? 'Alta' : status === 'bearish' ? 'Baixa' : 'Neutro'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

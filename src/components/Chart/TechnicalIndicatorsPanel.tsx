import React from 'react';
import { IndicatorValues } from '../../types/market.js';
import { TrendingUp, TrendingDown, Gauge, BarChart2, Layers } from 'lucide-react';

interface TechnicalIndicatorsPanelProps {
  indicators: IndicatorValues | null;
  currentPrice: number;
}

export const TechnicalIndicatorsPanel: React.FC<TechnicalIndicatorsPanelProps> = ({
  indicators,
  currentPrice,
}) => {
  if (!indicators) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* RSI Gauge */}
      <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Gauge className="h-3.5 w-3.5 text-sky-400" />
            RSI (14)
          </span>
          <span className="font-mono text-[11px] text-slate-500">30 / 70</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold text-white">
            {indicators.rsi14.toFixed(1)}
          </span>
          <span className={`text-[11px] font-semibold ${
            indicators.rsi14 > 70 ? 'text-rose-400' : indicators.rsi14 < 30 ? 'text-emerald-400' : 'text-slate-400'
          }`}>
            {indicators.rsi14 > 70 ? 'Sobrecomprado' : indicators.rsi14 < 30 ? 'Sobrevendido' : 'Neutro'}
          </span>
        </div>
        {/* Visual progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-300 ${
              indicators.rsi14 > 70 ? 'bg-rose-500' : indicators.rsi14 < 30 ? 'bg-emerald-500' : 'bg-sky-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, indicators.rsi14))}%` }}
          />
        </div>
      </div>

      {/* MACD */}
      <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
            MACD (12, 26, 9)
          </span>
          <span className="font-mono text-[11px] text-slate-500">Histogram</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`font-mono text-xl font-bold ${
            indicators.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {indicators.macd.histogram >= 0 ? '+' : ''}{indicators.macd.histogram.toFixed(3)}
          </span>
          <span className="text-[11px] text-slate-400">
            Linha: {indicators.macd.line.toFixed(2)}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          Sinal: <span className="font-mono text-slate-300">{indicators.macd.signal.toFixed(2)}</span>
          <span className="text-slate-600 mx-1">·</span>
          <span className={indicators.macd.line > indicators.macd.signal ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {indicators.macd.line > indicators.macd.signal ? 'Bullish Cross' : 'Bearish Cross'}
          </span>
        </div>
      </div>

      {/* Volume Ratio & ATR */}
      <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <BarChart2 className="h-3.5 w-3.5 text-amber-400" />
            Volume vs Média (20)
          </span>
          <span className="font-mono text-[11px] text-slate-500">ATR {indicators.atr14.toFixed(2)}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold text-white">
            {(indicators.volumeRatio * 100).toFixed(0)}%
          </span>
          <span className={`text-[11px] font-semibold ${
            indicators.volumeRatio >= 1.25 ? 'text-emerald-400' : 'text-slate-400'
          }`}>
            {indicators.volumeRatio >= 1.25 ? 'Acima da Média' : 'Volume Médio'}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          ADX: <span className="font-mono text-slate-200">{indicators.adx14.toFixed(1)}</span>
          <span className="text-slate-600 mx-1">·</span>
          <span>{indicators.adx14 > 25 ? 'Tendência Forte' : 'Tendência Fraca'}</span>
        </div>
      </div>

      {/* Support & Resistance Levels */}
      <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            Níveis Técnicos Chave
          </span>
          <span className="font-mono text-[11px] text-slate-500">S / R</span>
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between items-center text-rose-400">
            <span className="text-[11px]">Resistência:</span>
            <span className="font-bold">R$ {indicators.resistance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span className="text-[11px]">Suporte:</span>
            <span className="font-bold">R$ {indicators.support.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

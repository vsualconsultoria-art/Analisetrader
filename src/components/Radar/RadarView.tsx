import React, { useState } from 'react';
import { MarketSignal, MarketType } from '../../types/market.js';
import { SignalCard } from './SignalCard.js';
import { Radar, Filter, ShieldAlert } from 'lucide-react';

interface RadarViewProps {
  signals: MarketSignal[];
  onSelectSymbol: (symbol: string) => void;
  onOpenDetail?: (signal: MarketSignal) => void;
}

export const RadarView: React.FC<RadarViewProps> = ({
  signals,
  onSelectSymbol,
  onOpenDetail,
}) => {
  const [marketFilter, setMarketFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');

  const filteredSignals = signals.filter((sig) => {
    if (marketFilter !== 'ALL' && sig.market !== marketFilter) {
      return false;
    }
    if (directionFilter === 'BUY' && sig.direction !== 'BUY') return false;
    if (directionFilter === 'SELL' && sig.direction !== 'SELL') return false;
    if (directionFilter === 'WAIT' && sig.direction !== 'WAIT') return false;
    if (directionFilter === 'REVERSAL' && !sig.reversal.isReversal) return false;
    return true;
  });

  // Sort: actionable signals with highest confidence first
  const sortedSignals = [...filteredSignals].sort((a, b) => {
    if (a.direction !== 'WAIT' && b.direction === 'WAIT') return -1;
    if (a.direction === 'WAIT' && b.direction !== 'WAIT') return 1;
    return b.confidencePercent - a.confidencePercent;
  });

  return (
    <div className="space-y-4">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f293d] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radar className="h-5 w-5 text-emerald-400" />
            Radar de Reversões em Níveis Chave
          </h2>
          <p className="text-xs text-slate-400">
            Filtro rigoroso: entradas exclusivas em suporte (para alta) ou resistência (para baixa) com alvos longos e eliminação de ruídos.
          </p>
        </div>

        {/* Market Category Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#090d15] p-1 rounded-lg border border-[#1f293d]">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'B3', label: 'Ações B3' },
            { id: 'CRYPTO', label: 'Cripto' },
            { id: 'FUTURES', label: 'Futuros' },
            { id: 'US', label: 'Ações US' },
            { id: 'FII', label: 'FIIs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMarketFilter(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                marketFilter === tab.id
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121927]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Direction & Status Subfilters */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 flex items-center gap-1 text-[11px] mr-1">
            <Filter className="h-3 w-3" />
            Filtrar:
          </span>
          <button
            onClick={() => setDirectionFilter('REVERSAL')}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 font-bold ${
              directionFilter === 'REVERSAL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-500/40'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            ⚡ Reversões no Suporte/Resistência ({signals.filter(s => s.reversal.isReversal).length})
          </button>
          <button
            onClick={() => setDirectionFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              directionFilter === 'ALL'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({signals.length})
          </button>
          <button
            onClick={() => setDirectionFilter('BUY')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              directionFilter === 'BUY'
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/50 font-medium'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            🟢 No Suporte - Alta ({signals.filter(s => s.reversal.isReversal && s.reversal.type === 'BULLISH').length})
          </button>
          <button
            onClick={() => setDirectionFilter('SELL')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              directionFilter === 'SELL'
                ? 'bg-rose-950/70 text-rose-400 border border-rose-500/50 font-medium'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            🔴 Na Resistência - Baixa ({signals.filter(s => s.reversal.isReversal && s.reversal.type === 'BEARISH').length})
          </button>
          <button
            onClick={() => setDirectionFilter('WAIT')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              directionFilter === 'WAIT'
                ? 'bg-slate-800 text-slate-300 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ⚪ Sem Reversão ({signals.filter(s => !s.reversal.isReversal).length})
          </button>
        </div>

        <span className="text-slate-400 font-mono text-[11px]">
          Exibindo {sortedSignals.length} de {signals.length} ativos
        </span>
      </div>

      {/* Grid of Signals */}
      {sortedSignals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSignals.map((signal) => (
            <SignalCard
              key={signal.symbol}
              signal={signal}
              onSelect={onSelectSymbol}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#1f293d] p-8 text-center text-slate-400">
          <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-medium text-slate-300">Nenhum ativo encontrado para os filtros selecionados.</p>
          <p className="text-xs text-slate-500 mt-1">O sistema mantém a disciplina estatística e não emite sinais sem confluência.</p>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { MarketSignal } from '../../types/market.js';
import { Filter, ArrowUpRight, ArrowDownRight, Layers, Volume2, Shield } from 'lucide-react';

interface ScannerViewProps {
  signals: MarketSignal[];
  onSelectSymbol: (symbol: string) => void;
  onOpenDetail?: (signal: MarketSignal) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  signals,
  onSelectSymbol,
  onOpenDetail,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filterOptions = [
    { id: 'all', label: 'Todos os Ativos' },
    { id: 'reversal_bullish', label: 'Possível Reversão Alta' },
    { id: 'reversal_bearish', label: 'Possível Reversão Baixa' },
    { id: 'strong_buy', label: 'Score Compra (>=80)' },
    { id: 'strong_sell', label: 'Score Venda (<=20)' },
    { id: 'abnormal_volume', label: 'Volume Anormal' },
    { id: 'rsi_oversold', label: 'RSI Sobrevendido (<35)' },
    { id: 'rsi_overbought', label: 'RSI Sobrecomprado (>70)' },
    { id: 'high_volatility', label: 'Alta Volatilidade' },
    { id: 'positive_news', label: 'Notícia Positiva' },
  ];

  const filtered = signals.filter((s) => {
    if (filterCategory === 'reversal_bullish') {
      return s.reversal.isReversal && s.reversal.type === 'BULLISH';
    }
    if (filterCategory === 'reversal_bearish') {
      return s.reversal.isReversal && s.reversal.type === 'BEARISH';
    }
    if (filterCategory === 'strong_buy') {
      return s.score >= 80;
    }
    if (filterCategory === 'strong_sell') {
      return s.score <= 20;
    }
    if (filterCategory === 'abnormal_volume') {
      return s.factors.some(f => f.category === 'Volume' && f.points >= 8);
    }
    if (filterCategory === 'rsi_oversold') {
      return s.factors.some(f => f.category === 'RSI' && f.description.includes('sobrevendid'));
    }
    if (filterCategory === 'rsi_overbought') {
      return s.factors.some(f => f.category === 'RSI' && f.description.includes('sobrecompr'));
    }
    if (filterCategory === 'high_volatility') {
      return s.isHighVolatility;
    }
    if (filterCategory === 'positive_news') {
      return s.factors.some(f => f.category === 'News' && f.points >= 5);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f293d] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-emerald-400" />
            Scanner Quantitativo de Mercado
          </h2>
          <p className="text-xs text-slate-400">
            Triagem automatizada baseada em filtros de reversão, momentum e volume institucional.
          </p>
        </div>

        <span className="font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
          Encontrados: <strong className="text-emerald-400">{filtered.length}</strong> ativos
        </span>
      </div>

      {/* Filter Selection Chips */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterCategory(f.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              filterCategory === f.id
                ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                : 'bg-[#0c111c] text-slate-300 border-[#1f293d] hover:border-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results Table */}
      <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#090d15] text-slate-400 border-b border-[#1f293d] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Ativo</th>
                <th className="px-4 py-3">Mercado</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Direção</th>
                <th className="px-4 py-3">Score Confluência</th>
                <th className="px-4 py-3">Reversão Engine</th>
                <th className="px-4 py-3">Stop Loss</th>
                <th className="px-4 py-3">Alvo 1</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172033] text-slate-200">
              {filtered.map((item) => (
                <tr
                  key={item.symbol}
                  className="hover:bg-[#111827] transition-colors cursor-pointer"
                  onClick={() => onSelectSymbol(item.symbol)}
                >
                  <td className="px-4 py-3 font-bold text-white">
                    {item.symbol}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {item.market}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-100">
                    R$ {item.currentPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 font-bold ${
                        item.direction === 'BUY'
                          ? 'text-emerald-400'
                          : item.direction === 'SELL'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.direction === 'BUY'
                            ? 'bg-emerald-500'
                            : item.direction === 'SELL'
                            ? 'bg-rose-500'
                            : 'bg-slate-500'
                        }`}
                      />
                      {item.direction === 'BUY' ? 'COMPRA' : item.direction === 'SELL' ? 'VENDA' : 'AGUARDAR'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            item.score >= 80 ? 'bg-emerald-500' : item.score <= 20 ? 'bg-rose-500' : 'bg-slate-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <span className="font-bold">{item.score}/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.reversal.isReversal ? (
                      <span className="text-amber-400 font-semibold text-[11px] bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                        ⚡ {item.reversal.type} ({item.reversal.confidence}%)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Nenhuma</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-rose-400 font-semibold">
                    R$ {item.stopLoss.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">
                    R$ {item.takeProfit1.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSymbol(item.symbol);
                        if (onOpenDetail) onOpenDetail(item);
                      }}
                      className="rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 transition-colors"
                    >
                      Analisar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

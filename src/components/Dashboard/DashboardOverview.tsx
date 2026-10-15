import React from 'react';
import { MarketSignal, AssetInfo, MarketNews } from '../../types/market.js';
import { TrendingUp, TrendingDown, MinusCircle, Newspaper, Zap, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface DashboardOverviewProps {
  signals: MarketSignal[];
  assets: AssetInfo[];
  news: MarketNews[];
  onSelectSymbol: (symbol: string) => void;
  onNavigate: (view: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  signals,
  assets,
  news,
  onSelectSymbol,
  onNavigate,
}) => {
  const buySignals = signals.filter(s => s.direction === 'BUY');
  const sellSignals = signals.filter(s => s.direction === 'SELL');
  const waitSignals = signals.filter(s => s.direction === 'WAIT');
  const reversalSignals = signals.filter(s => s.reversal.isReversal);

  const assetsUp = assets.filter(a => a.changePercent > 0);
  const assetsDown = assets.filter(a => a.changePercent < 0);

  // Top Opportunities ranking as requested in #31
  const topOpportunities = [...signals]
    .filter(s => s.direction !== 'WAIT')
    .sort((a, b) => b.confidencePercent - a.confidencePercent)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Risk Banner Reminder */}
      <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>Aviso de Risco & Probabilidade:</strong> O sistema utiliza confluência multi-fatorial estatística. Nenhum sinal é garantia de rentabilidade no mercado financeiro.
          </span>
        </div>
        <span className="font-mono text-[11px] text-amber-400">Modo Conservador Ativo</span>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3.5">
          <span className="text-[11px] text-slate-400 block font-medium">Oportunidades</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-white">
              {buySignals.length + sellSignals.length}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold font-mono">Confluentes</span>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-950/50 bg-[#081510] p-3.5 border-l-4 border-l-emerald-500">
          <span className="text-[11px] text-emerald-300 block font-medium flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            Sinais de Compra
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-400">
              {buySignals.length}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Score &ge; 80</span>
          </div>
        </div>

        <div className="rounded-lg border border-rose-950/50 bg-[#160a0d] p-3.5 border-l-4 border-l-rose-500">
          <span className="text-[11px] text-rose-300 block font-medium flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            Sinais de Venda
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-rose-400">
              {sellSignals.length}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Score &le; 20</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3.5">
          <span className="text-[11px] text-slate-400 block font-medium flex items-center gap-1">
            <MinusCircle className="h-3.5 w-3.5 text-slate-500" />
            Sem Sinal (Aguardar)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-300">
              {waitSignals.length}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">21 - 79 pts</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3.5">
          <span className="text-[11px] text-slate-400 block font-medium flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Reversões
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-amber-400">
              {reversalSignals.length}
            </span>
            <span className="text-[10px] text-amber-400/80 font-mono">Radar Engine</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3.5">
          <span className="text-[11px] text-slate-400 block font-medium flex items-center gap-1">
            <Newspaper className="h-3.5 w-3.5 text-sky-400" />
            Notícias Relevantes
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-sky-400">
              {news.length}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">B3 & Macro</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Ranking TOP OPORTUNIDADES and Latest Market Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Oportunidades Ranking as requested in #31 */}
        <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-emerald-400" />
              Ranking Top Oportunidades
            </h3>
            <button
              onClick={() => onNavigate('radar')}
              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
            >
              Ver Radar Completo &rarr;
            </button>
          </div>

          <div className="space-y-2">
            {topOpportunities.length > 0 ? (
              topOpportunities.map((op, idx) => (
                <div
                  key={op.symbol}
                  onClick={() => {
                    onSelectSymbol(op.symbol);
                    onNavigate('chart');
                  }}
                  className="flex items-center justify-between p-2.5 rounded-md border border-[#1f293d] bg-[#090d15] hover:border-emerald-500/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 font-mono text-xs font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-white">
                          {op.symbol}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {op.market}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        R$ {op.currentPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        op.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          op.direction === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {op.direction === 'BUY' ? 'COMPRA' : 'VENDA'}
                    </span>
                    <div className="text-[10px] font-mono text-slate-400">
                      Score: <strong className="text-slate-200">{op.score}%</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Nenhum ativo com confluência acima de 80% no momento.
              </div>
            )}
          </div>
        </div>

        {/* Live Feed of Active Confirmed Signals */}
        <div className="lg:col-span-2 rounded-lg border border-[#1f293d] bg-[#0c111c] p-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Monitor de Mercado em Tempo Real
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {assetsUp.length} ativos em alta · {assetsDown.length} em baixa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {assets.slice(0, 8).map((asset) => {
              const sig = signals.find(s => s.symbol === asset.symbol);
              const isUp = asset.changePercent >= 0;

              return (
                <div
                  key={asset.symbol}
                  onClick={() => {
                    onSelectSymbol(asset.symbol);
                    onNavigate('chart');
                  }}
                  className="flex items-center justify-between p-2.5 rounded-md border border-[#1f293d] bg-[#090d15] hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-white">
                        {asset.symbol}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {asset.market}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px] block">
                      {asset.name}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-slate-100">
                      R$ {asset.price.toFixed(2)}
                    </div>
                    <div
                      className={`font-mono text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? '+' : ''}{asset.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

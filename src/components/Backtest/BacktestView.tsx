import React, { useState } from 'react';
import { AssetInfo, Timeframe } from '../../types/market.js';
import { runBacktestSimulation } from '../../services/api.js';
import { History, Play, CheckCircle2, XCircle, TrendingUp, AlertCircle } from 'lucide-react';

interface BacktestViewProps {
  assets: AssetInfo[];
  selectedSymbol: string;
}

export const BacktestView: React.FC<BacktestViewProps> = ({
  assets,
  selectedSymbol,
}) => {
  const [symbol, setSymbol] = useState(selectedSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [strategy, setStrategy] = useState<'REVERSAL' | 'TREND_CONFLUENCE' | 'MOMENTUM_BREAKOUT'>('REVERSAL');
  const [periodDays, setPeriodDays] = useState(90);
  const [initialCapital, setInitialCapital] = useState(10000);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await runBacktestSimulation({
        symbol,
        timeframe,
        strategy,
        periodDays,
        initialCapital,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao executar backtest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1f293d] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            Módulo de Backtest & Validação Estatística
          </h2>
          <p className="text-xs text-slate-400">
            Simulação walk-forward em dados históricos com regras estritas de stop e alvo para evitar overfitting.
          </p>
        </div>
      </div>

      {/* Control Form */}
      <form onSubmit={handleRunBacktest} className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Ativo</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-slate-200"
            >
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} ({a.market})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-slate-200"
            >
              <option value="5m">5 Minutos</option>
              <option value="15m">15 Minutos</option>
              <option value="1h">1 Hora</option>
              <option value="4h">4 Horas</option>
              <option value="1d">1 Dia</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Estratégia</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-slate-200"
            >
              <option value="REVERSAL">Reversão Radar Engine</option>
              <option value="TREND_CONFLUENCE">Trend Confluence (&ge;80 Score)</option>
              <option value="MOMENTUM_BREAKOUT">Momentum Breakout</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Capital Inicial (R$)</label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-slate-200"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-indigo-600 hover:bg-indigo-500 py-2 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{loading ? 'Calculando...' : 'Rodar Backtest'}</span>
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded bg-rose-950/40 border border-rose-800/60 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
              <span className="text-[11px] text-slate-400 block">Total de Trades</span>
              <span className="font-mono text-xl font-bold text-white">
                {result.totalTrades}
              </span>
            </div>

            <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
              <span className="text-[11px] text-slate-400 block">Taxa de Acerto</span>
              <span className="font-mono text-xl font-bold text-emerald-400">
                {result.winRate}%
              </span>
            </div>

            <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
              <span className="text-[11px] text-slate-400 block">Profit Factor</span>
              <span className="font-mono text-xl font-bold text-sky-400">
                {result.profitFactor}
              </span>
            </div>

            <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
              <span className="text-[11px] text-slate-400 block">Lucro Líquido</span>
              <span className={`font-mono text-xl font-bold ${
                result.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {result.grossProfit >= 0 ? '+' : ''}R$ {result.grossProfit}
              </span>
            </div>

            <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
              <span className="text-[11px] text-slate-400 block">Max Drawdown</span>
              <span className="font-mono text-xl font-bold text-rose-400">
                -{result.maxDrawdown}%
              </span>
            </div>

            <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-3">
              <span className="text-[11px] text-slate-400 block">Expectancy</span>
              <span className="font-mono text-xl font-bold text-slate-100">
                R$ {result.expectancy}
              </span>
            </div>
          </div>

          {/* Trade History */}
          <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f293d] bg-[#090d15] text-xs font-semibold text-slate-200">
              Histórico Detalhado de Trades do Backtest
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#090d15] text-slate-400 border-b border-[#1f293d] uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Direção</th>
                    <th className="px-4 py-2">Entrada</th>
                    <th className="px-4 py-2">Saída</th>
                    <th className="px-4 py-2">Retorno %</th>
                    <th className="px-4 py-2">Resultado R$</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#172033] text-slate-200">
                  {result.trades.map((t: any) => (
                    <tr key={t.id} className="hover:bg-[#111827]">
                      <td className="px-4 py-2 text-slate-400">{t.id}</td>
                      <td className={`px-4 py-2 font-bold ${t.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type}
                      </td>
                      <td className="px-4 py-2">R$ {t.entryPrice.toFixed(2)}</td>
                      <td className="px-4 py-2">R$ {t.exitPrice.toFixed(2)}</td>
                      <td className={`px-4 py-2 font-bold ${t.resultPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.resultPercent >= 0 ? '+' : ''}{t.resultPercent}%
                      </td>
                      <td className={`px-4 py-2 font-bold ${t.profitCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.profitCash >= 0 ? '+' : ''}R$ {t.profitCash.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        {t.status === 'WIN' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                            <CheckCircle2 className="h-3 w-3" /> GAIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[10px] bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                            <XCircle className="h-3 w-3" /> LOSS
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { PaperPosition, AssetInfo } from '../../types/market.js';
import { Wallet, Plus, Trash2, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';

interface PaperTradingViewProps {
  assets: AssetInfo[];
  selectedSymbol: string;
}

export const PaperTradingView: React.FC<PaperTradingViewProps> = ({
  assets,
  selectedSymbol,
}) => {
  const [positions, setPositions] = useState<PaperPosition[]>([
    {
      id: 'pos-1',
      symbol: 'PETR4',
      direction: 'BUY',
      entryPrice: 37.80,
      quantity: 500,
      currentPrice: 38.65,
      stopLoss: 36.90,
      takeProfit: 40.10,
      pnlCash: 425.00,
      pnlPercent: 2.25,
      openTime: 'Hoje às 10:15',
      status: 'OPEN',
    },
    {
      id: 'pos-2',
      symbol: 'VALE3',
      direction: 'SELL',
      entryPrice: 59.10,
      quantity: 200,
      currentPrice: 58.20,
      stopLoss: 60.20,
      takeProfit: 56.50,
      pnlCash: 180.00,
      pnlPercent: 1.52,
      openTime: 'Hoje às 11:30',
      status: 'OPEN',
    },
  ]);

  const [formSymbol, setFormSymbol] = useState(selectedSymbol);
  const [formDir, setFormDir] = useState<'BUY' | 'SELL'>('BUY');
  const [formQty, setFormQty] = useState(100);

  const currentAsset = assets.find(a => a.symbol === formSymbol) || assets[0];
  const currentPrice = currentAsset?.price || 10;

  const handleOpenPosition = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = currentPrice;
    const stop = formDir === 'BUY' ? entry * 0.98 : entry * 1.02;
    const tp = formDir === 'BUY' ? entry * 1.05 : entry * 0.95;

    const newPos: PaperPosition = {
      id: `pos-${Date.now()}`,
      symbol: formSymbol,
      direction: formDir,
      entryPrice: Number(entry.toFixed(2)),
      quantity: Number(formQty),
      currentPrice: Number(entry.toFixed(2)),
      stopLoss: Number(stop.toFixed(2)),
      takeProfit: Number(tp.toFixed(2)),
      pnlCash: 0,
      pnlPercent: 0,
      openTime: new Date().toLocaleTimeString('pt-BR'),
      status: 'OPEN',
    };

    setPositions([newPos, ...positions]);
  };

  const handleClosePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
  };

  const totalPnL = positions.reduce((sum, p) => sum + p.pnlCash, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1f293d] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            Paper Trading (Simulação Sem Risco)
          </h2>
          <p className="text-xs text-slate-400">
            Validação prática do algoritmo em tempo real com capital simulado e ordens virtuais.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="font-mono text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
            PnL Acumulado: <strong className={totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {totalPnL >= 0 ? '+' : ''}R$ {totalPnL.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      {/* New Order Form & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-emerald-400" />
            Abrir Operação Simulada
          </h3>

          <form onSubmit={handleOpenPosition} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Ativo Selecionado</label>
              <select
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value)}
                className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                {assets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol} ({a.market}) - R$ {a.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormDir('BUY')}
                className={`py-2 rounded font-bold transition-colors ${
                  formDir === 'BUY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                COMPRA
              </button>
              <button
                type="button"
                onClick={() => setFormDir('SELL')}
                className={`py-2 rounded font-bold transition-colors ${
                  formDir === 'SELL'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                VENDA
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Quantidade / Contratos</label>
              <input
                type="number"
                value={formQty}
                onChange={(e) => setFormQty(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="p-2 rounded bg-[#090d15] border border-slate-800 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Cotação estimada:</span>
                <span className="font-bold text-white">R$ {currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Volume financeiro:</span>
                <span className="font-bold text-white">R$ {(currentPrice * formQty).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded bg-emerald-600 hover:bg-emerald-500 py-2 font-bold text-white transition-colors"
            >
              Executar Ordem Virtual
            </button>
          </form>
        </div>

        {/* Positions Table */}
        <div className="lg:col-span-2 rounded-lg border border-[#1f293d] bg-[#0c111c] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
            Posições Abertas ({positions.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#090d15] text-slate-400 border-b border-[#1f293d] uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2">Ativo</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Qtd</th>
                  <th className="px-3 py-2">Entrada</th>
                  <th className="px-3 py-2">Stop / Alvo</th>
                  <th className="px-3 py-2">PnL Atual</th>
                  <th className="px-3 py-2 text-right">Encerrar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172033] text-slate-200">
                {positions.map((pos) => {
                  const isBuy = pos.direction === 'BUY';
                  return (
                    <tr key={pos.id} className="hover:bg-[#111827]">
                      <td className="px-3 py-2.5 font-bold text-white">
                        {pos.symbol}
                      </td>
                      <td className="px-3 py-2.5 font-bold">
                        <span className={isBuy ? 'text-emerald-400' : 'text-rose-400'}>
                          {isBuy ? 'COMPRA' : 'VENDA'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{pos.quantity}</td>
                      <td className="px-3 py-2.5">R$ {pos.entryPrice.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-[11px]">
                        <span className="text-rose-400 font-semibold">{pos.stopLoss.toFixed(2)}</span> /{' '}
                        <span className="text-emerald-400 font-semibold">{pos.takeProfit.toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-2.5 font-bold">
                        <span className={pos.pnlCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {pos.pnlCash >= 0 ? '+' : ''}R$ {pos.pnlCash.toFixed(2)} ({pos.pnlPercent}%)
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          className="rounded p-1 text-slate-500 hover:bg-rose-950/50 hover:text-rose-400 transition-colors"
                          title="Zerar posição"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Search, Radio, Activity, Zap, BellRing } from 'lucide-react';
import { MarketSignal } from '../types/market.js';

interface NavbarProps {
  signals: MarketSignal[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  radarActive: boolean;
  onToggleRadar: () => void;
  onNavigate: (view: string) => void;
  floatingAlertsEnabled: boolean;
  onToggleFloatingAlerts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  signals,
  selectedSymbol,
  onSelectSymbol,
  radarActive,
  onToggleRadar,
  onNavigate,
  floatingAlertsEnabled,
  onToggleFloatingAlerts,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredSuggestions = searchInput.trim().length > 0
    ? signals
        .filter((s) => s.symbol.toLowerCase().includes(searchInput.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const handleSelectAndGo = (sym: string) => {
    onSelectSymbol(sym.toUpperCase().trim());
    onNavigate('chart');
    setSearchInput('');
    setShowDropdown(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleSelectAndGo(searchInput.trim());
    }
  };

  // Top watchlist quick bar assets
  const quickWatchlist = ['PETR4', 'VALE3', 'ITUB4', 'BTCUSDT', 'NVDA', 'WINFUT', 'WDOFUT'];

  const getSignalFor = (symbol: string) => {
    return signals.find(s => s.symbol === symbol);
  };

  const buyCount = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const waitCount = signals.filter(s => s.direction === 'WAIT').length;

  return (
    <nav className="border-b border-[#1f293d] bg-[#090d15] px-4 py-2.5">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Brand & Market counters */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex cursor-pointer items-center gap-2 group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400 transition-colors">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                MarketAI <span className="text-emerald-400">Radar</span>
              </span>
              <span className="block text-[10px] text-slate-400 -mt-1 font-mono tracking-wider">
                PRO QUANT ENGINE
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs border-l border-slate-800 pl-3">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono font-semibold text-emerald-400">{buyCount}</span> compras
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span className="font-mono font-semibold text-rose-400">{sellCount}</span> vendas
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-slate-500"></span>
              <span className="font-mono font-semibold text-slate-400">{waitCount}</span> neutros
            </span>
          </div>
        </div>

        {/* Search bar & quick watchlist */}
        <div className="flex flex-1 items-center justify-center max-w-xl mx-2">
          <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Digite o ativo: PETR4, VALE3, BTCUSDT, NVDA..."
                className="w-full rounded-md border border-[#232f48] bg-[#0f1624] py-1.5 pl-9 pr-24 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-emerald-600/90 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Zap className="h-3 w-3" />
                Analisar
              </button>

              {/* Autocomplete Suggestions Dropdown */}
              {showDropdown && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-[#232f48] bg-[#0c121e] shadow-2xl z-50 overflow-hidden font-mono text-xs">
                  <div className="px-3 py-1 bg-slate-900/90 text-[10px] text-slate-400 border-b border-slate-800 flex justify-between">
                    <span>Ativos encontrados (clique para abrir o gráfico):</span>
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  {filteredSuggestions.map((s) => (
                    <div
                      key={s.symbol}
                      onClick={() => handleSelectAndGo(s.symbol)}
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-800/80 cursor-pointer border-b border-[#1f293d]/40 last:border-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white tracking-wide">{s.symbol}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{s.market}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold ${s.direction === 'BUY' ? 'text-emerald-400' : s.direction === 'SELL' ? 'text-rose-400' : 'text-slate-400'}`}>
                          {s.direction === 'BUY' ? 'COMPRA' : s.direction === 'SELL' ? 'VENDA' : 'NEUTRO'}
                        </span>
                        <span className="text-slate-300 font-semibold">R$ {(s.currentPrice || s.signalPrice || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Watchlist Quick Bar & Radar Toggle */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div className="flex items-center gap-1.5 text-xs">
            {quickWatchlist.map((sym) => {
              const sig = getSignalFor(sym);
              const dir = sig?.direction || 'WAIT';
              const isSelected = selectedSymbol === sym;

              return (
                <button
                  key={sym}
                  onClick={() => {
                    onSelectSymbol(sym);
                    onNavigate('chart');
                  }}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-mono transition-colors border ${
                    isSelected
                      ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                      : 'border-[#1e273a] bg-[#111726] text-slate-300 hover:border-slate-700 hover:bg-[#161e32]'
                  }`}
                >
                  <span className="font-semibold">{sym}</span>
                  {dir === 'BUY' ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" title="Compra" />
                  ) : dir === 'SELL' ? (
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" title="Venda" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-500" title="Aguardar" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Botão para Ativar e Desativar as janelas flutuantes de reversão de tendência */}
          <button
            onClick={onToggleFloatingAlerts}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono font-bold transition-all border ${
              floatingAlertsEnabled
                ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:bg-emerald-900/60'
                : 'border-slate-700 bg-slate-900/90 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title="Ativar ou Desativar as janelas flutuantes de reversão de tendência em tempo real"
          >
            <BellRing className={`h-3.5 w-3.5 ${floatingAlertsEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>JANELAS FLUTUANTES: {floatingAlertsEnabled ? 'ATIVADAS' : 'DESATIVADAS'}</span>
          </button>

          {/* Radar activation button */}
          <button
            onClick={onToggleRadar}
            className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-all ${
              radarActive
                ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${radarActive ? 'animate-pulse' : ''}`} />
            <span>{radarActive ? 'RADAR ATIVO' : 'ATIVAR RADAR'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

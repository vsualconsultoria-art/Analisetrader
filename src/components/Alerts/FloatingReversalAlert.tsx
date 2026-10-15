import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  X,
  ExternalLink,
  Volume2,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ReversalAlertEvent } from '../../types/market.js';
import { soundEngine } from '../../utils/audio.js';

interface FloatingReversalAlertProps {
  alerts: ReversalAlertEvent[];
  onDismiss: (id: string) => void;
  onSelectSymbol: (symbol: string) => void;
  onNavigateToChart: () => void;
  onToggleFloatingAlerts?: () => void;
}

export const FloatingReversalAlert: React.FC<FloatingReversalAlertProps> = ({
  alerts,
  onDismiss,
  onSelectSymbol,
  onNavigateToChart,
  onToggleFloatingAlerts,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none sm:max-w-md">
      {alerts.slice(0, 3).map((alert) => (
        <SingleReversalCard
          key={alert.id}
          alert={alert}
          onDismiss={() => onDismiss(alert.id)}
          onViewOnChart={() => {
            onSelectSymbol(alert.symbol);
            onNavigateToChart();
            onDismiss(alert.id);
          }}
          onToggleFloatingAlerts={onToggleFloatingAlerts}
        />
      ))}
    </div>
  );
};

interface SingleReversalCardProps {
  alert: ReversalAlertEvent;
  onDismiss: () => void;
  onViewOnChart: () => void;
  onToggleFloatingAlerts?: () => void;
}

const SingleReversalCard: React.FC<SingleReversalCardProps> = ({
  alert,
  onDismiss,
  onViewOnChart,
  onToggleFloatingAlerts,
}) => {
  const isBullish = alert.reversalType === 'BULLISH';
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 14000; // 14 seconds auto-dismiss
    const interval = 100;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onDismiss]);

  const handleReplayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playReversalChime(alert.reversalType);
    setTimeout(() => {
      soundEngine.speak(
        `Atenção! Candle branco de reversão detectado em ${alert.symbol}. Efetuar entrada imediata de ${isBullish ? 'compra' : 'venda'}.`
      );
    }, 350);
  };

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-xl border-2 backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
        isBullish
          ? 'bg-[#061412]/95 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.45)]'
          : 'bg-[#19080c]/95 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.45)]'
      }`}
    >
      {/* Top Banner Tag */}
      <div
        className={`flex items-center justify-between px-3.5 py-1.5 text-[11px] font-mono font-bold tracking-wider uppercase border-b ${
          isBullish
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white shadow-[0_0_8px_#ffffff]"
            />
          </span>
          <span className="flex items-center gap-1 text-white font-black tracking-wide">
            ⚪ AVISO DE ENTRADA: CANDLE BRANCO
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFloatingAlerts && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFloatingAlerts();
              }}
              title="Desativar Janelas Flutuantes"
              className="text-[10px] text-slate-400 hover:text-rose-300 transition-colors px-1 py-0.5 rounded border border-transparent hover:border-rose-900 bg-black/20"
            >
              Desativar Janelas
            </button>
          )}
          <button
            onClick={handleReplayAudio}
            title="Repetir Alerta Sonoro de Entrada"
            className="hover:text-white transition-colors p-0.5 rounded text-amber-300"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDismiss}
            title="Fechar Notificação"
            className="hover:text-white transition-colors p-0.5 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-white tracking-wider">
                {alert.symbol}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                {alert.market}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                {alert.timeframe}
              </span>
            </div>
            <div className="text-xs text-slate-300 truncate max-w-[200px] mt-0.5">
              {alert.assetName}
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-lg font-bold text-white">
              {alert.market === 'CRYPTO' ? '$' : 'R$'}{' '}
              {alert.price ? alert.price.toFixed(2) : '--'}
            </div>
            <div
              className={`text-[11px] font-mono font-black flex items-center justify-end gap-1 ${
                isBullish ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isBullish ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>EFETUAR COMPRA AGORA</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>EFETUAR VENDA AGORA</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reversal Confirmation details with explicit White Candle Instruction */}
        <div className="rounded-lg bg-black/60 border border-slate-800/80 p-2.5 space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Confirmação do Sinal:</span>
            <span className="text-white font-bold">{alert.confidence || 85}% (Alta Precisão)</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-200">
            <CheckCircle2
              className={`h-3.5 w-3.5 shrink-0 ${
                isBullish ? 'text-emerald-400' : 'text-rose-400'
              }`}
            />
            <span>{isBullish ? 'Fundo confirmado por MACD e Médias 9/21' : 'Topo confirmado por MACD e Médias 9/21'}</span>
          </div>

          {/* Prompt instruction requested by user */}
          <div className="flex items-center gap-2 text-[11px] text-white font-bold pt-1.5 border-t border-slate-800/80 bg-white/5 -mx-2.5 px-2.5 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping shrink-0" />
            <span>Candle de entrada marcado em <strong className="text-amber-300 underline">BRANCO</strong> no gráfico!</span>
          </div>
        </div>

        {/* Action Button: Ver no Gráfico Agora */}
        <button
          onClick={onViewOnChart}
          className={`w-full py-2.5 px-3 rounded-lg font-mono text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 border ${
            isBullish
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
              : 'bg-rose-500 hover:bg-rose-400 text-white border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
          }`}
        >
          <ExternalLink className="h-4 w-4" />
          <span>EFETUAR ENTRADA NO GRÁFICO ({alert.symbol})</span>
        </button>
      </div>

      {/* Auto-dismiss progress countdown line */}
      <div className="h-1 w-full bg-slate-900 overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ease-linear ${
            isBullish ? 'bg-emerald-400' : 'bg-rose-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

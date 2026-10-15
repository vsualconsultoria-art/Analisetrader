import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Wifi, AlertTriangle } from 'lucide-react';
import { socketService, SocketStatus } from '../services/socket.js';
import { soundEngine } from '../utils/audio.js';

interface StatusBarProps {
  demoMode?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ demoMode = false }) => {
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(socketService.getStatus());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [soundOn, setSoundOn] = useState<boolean>(soundEngine.isSoundEnabled());
  const [voiceOn, setVoiceOn] = useState<boolean>(soundEngine.isVoiceEnabled());
  const [volume, setVolume] = useState<number>(soundEngine.getVolume());
  const [latency, setLatency] = useState<number>(34);

  useEffect(() => {
    const unsub = socketService.on('connection_change', (data) => {
      setSocketStatus(data.status);
    });

    const unsubStatus = socketService.on('market_status', (data) => {
      if (data.status?.latencyMs) setLatency(data.status.latencyMs);
    });

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR'));
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString('pt-BR'));

    return () => {
      unsub();
      unsubStatus();
      clearInterval(timer);
    };
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundEngine.setSoundEnabled(next);
    if (next) soundEngine.playBuyBeep();
  };

  const handleToggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    soundEngine.setVoiceEnabled(next);
    if (next) soundEngine.speak('Voz ativada');
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundEngine.setVolume(val);
  };

  return (
    <header className="border-b border-[#1f293d] bg-[#0d121c] px-4 py-2 text-xs text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Connection and status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {socketStatus === 'CONNECTED' ? (
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                MERCADO CONECTADO
              </span>
            ) : socketStatus === 'RECONNECTING' ? (
              <span className="flex items-center gap-1.5 font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                RECONECTANDO DADOS...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                SEM CONEXÃO (OFFLINE)
              </span>
            )}
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-slate-400">
            Última atualização: <span className="font-mono text-slate-200">{currentTime}</span>
          </span>

          <span className="text-slate-600">|</span>

          <span className="flex items-center gap-1 text-slate-400">
            <Wifi className="h-3.5 w-3.5 text-slate-400" />
            Latência: <span className="font-mono text-slate-200">{latency} ms</span>
          </span>

          <span className="text-slate-600">|</span>

          <a
            href="https://www.coingecko.com/pt-br"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono hover:underline"
            title="Criptomoedas atualizadas em tempo real com base no CoinGecko"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>CoinGecko PT-BR (Tempo Real)</span>
          </a>

          {demoMode && (
            <>
              <span className="text-slate-600">|</span>
              <span className="rounded bg-amber-950/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-300 border border-amber-800/60">
                DEMO — DADOS SIMULADOS
              </span>
            </>
          )}
        </div>

        {/* Center / Disclaimer text */}
        <div className="hidden xl:flex items-center gap-1.5 text-slate-400 text-[11px]">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
          <span>Análise estatística probabilística com confluência. Nenhum sinal garante lucro.</span>
        </div>

        {/* Right: Audio and Voice Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSound}
              title={soundOn ? 'Desativar Bip Sonoro' : 'Ativar Bip Sonoro'}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                soundOn
                  ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-400'
              }`}
            >
              {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="font-medium text-[11px]">{soundOn ? 'Som ON' : 'Mudo'}</span>
            </button>

            <button
              onClick={handleToggleVoice}
              title={voiceOn ? 'Desativar Voz' : 'Ativar Alerta por Voz'}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                voiceOn
                  ? 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-400'
              }`}
            >
              {voiceOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              <span className="font-medium text-[11px]">{voiceOn ? 'Voz ON' : 'Voz OFF'}</span>
            </button>

            <div className="flex items-center gap-1.5 pl-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="h-1.5 w-16 cursor-pointer appearance-none rounded bg-slate-700 accent-emerald-500"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
              <span className="font-mono text-[10px] text-slate-400 w-6">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

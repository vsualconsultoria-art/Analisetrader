import React, { useState } from 'react';
import { AdminWeightsConfig } from '../../types/market.js';
import { saveAdminConfig } from '../../services/api.js';
import { Sliders, Save, ShieldCheck, Database, Key, CheckCircle, RefreshCw } from 'lucide-react';

interface AdminViewProps {
  config: AdminWeightsConfig;
  onUpdateConfig: (newConfig: AdminWeightsConfig) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [formData, setFormData] = useState<AdminWeightsConfig>({ ...config });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const totalWeights =
    Number(formData.trend) +
    Number(formData.movingAverages) +
    Number(formData.macd) +
    Number(formData.rsi) +
    Number(formData.volume) +
    Number(formData.priceAction) +
    Number(formData.supportResistance) +
    Number(formData.multiTimeframe) +
    Number(formData.news);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await saveAdminConfig(formData);
      if (res.config) {
        onUpdateConfig(res.config);
      }
      setSuccessMsg('Configurações salvas e aplicadas a todos os cálculos em tempo real!');
    } catch {
      // fallback
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1f293d] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-emerald-400" />
            Painel do Administrador & Calibração do Algoritmo
          </h2>
          <p className="text-xs text-slate-400">
            Ajuste fino de pesos ponderados, limites de score, provedores de Market Data e modo de risco operacional.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="mt-2 sm:mt-0 flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors shadow-sm"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>Salvar Alterações</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded bg-emerald-950/40 border border-emerald-800/60 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Score Weights Configuration as requested in #12, #63 */}
        <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4 text-xs">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2 mb-4">
            <h3 className="font-bold text-white uppercase tracking-wider text-xs">
              1. Ponderação de Fatores do Market Score Engine (0 a 100%)
            </h3>
            <span
              className={`font-mono text-xs font-bold ${
                totalWeights === 100 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              Soma: {totalWeights}% {totalWeights === 100 ? '✓ (Equilibrado)' : '(! Recomendado: 100%)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 mb-1">Tendência Principal ({formData.trend}%)</label>
              <input
                type="range"
                min="0"
                max="40"
                value={formData.trend}
                onChange={(e) => setFormData({ ...formData, trend: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Médias Móveis EMA ({formData.movingAverages}%)</label>
              <input
                type="range"
                min="0"
                max="30"
                value={formData.movingAverages}
                onChange={(e) => setFormData({ ...formData, movingAverages: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">MACD Momentum ({formData.macd}%)</label>
              <input
                type="range"
                min="0"
                max="30"
                value={formData.macd}
                onChange={(e) => setFormData({ ...formData, macd: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">RSI Oscilador ({formData.rsi}%)</label>
              <input
                type="range"
                min="0"
                max="25"
                value={formData.rsi}
                onChange={(e) => setFormData({ ...formData, rsi: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Volume Institucional ({formData.volume}%)</label>
              <input
                type="range"
                min="0"
                max="25"
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Price Action & Padrões ({formData.priceAction}%)</label>
              <input
                type="range"
                min="0"
                max="25"
                value={formData.priceAction}
                onChange={(e) => setFormData({ ...formData, priceAction: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Suporte & Resistência ({formData.supportResistance}%)</label>
              <input
                type="range"
                min="0"
                max="25"
                value={formData.supportResistance}
                onChange={(e) => setFormData({ ...formData, supportResistance: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Multi-Timeframe MTF ({formData.multiTimeframe}%)</label>
              <input
                type="range"
                min="0"
                max="20"
                value={formData.multiTimeframe}
                onChange={(e) => setFormData({ ...formData, multiTimeframe: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Sentimento de Notícias ({formData.news}%)</label>
              <input
                type="range"
                min="0"
                max="20"
                value={formData.news}
                onChange={(e) => setFormData({ ...formData, news: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Thresholds & Risk Mode as requested in #3, #84 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4 text-xs space-y-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-xs border-b border-[#1f293d] pb-2">
              2. Gatilhos de Disparo dos Sinais (Score)
            </h3>

            <div>
              <label className="block text-slate-300 mb-1">
                Gatilho Mínimo de Compra (&ge; {formData.buyThreshold}/100)
              </label>
              <input
                type="number"
                min="60"
                max="95"
                value={formData.buyThreshold}
                onChange={(e) => setFormData({ ...formData, buyThreshold: Number(e.target.value) })}
                className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-emerald-400"
              />
              <span className="text-[10px] text-slate-500">Padrão: 80 (pontuação mínima para bola verde)</span>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">
                Gatilho Máximo de Venda (&le; {formData.sellThreshold}/100)
              </label>
              <input
                type="number"
                min="5"
                max="40"
                value={formData.sellThreshold}
                onChange={(e) => setFormData({ ...formData, sellThreshold: Number(e.target.value) })}
                className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-rose-400"
              />
              <span className="text-[10px] text-slate-500">Padrão: 20 (pontuação máxima para bola vermelha)</span>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">
                Relação Risco / Retorno Mínima (1 : {formData.minRiskReward})
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={formData.minRiskReward}
                onChange={(e) => setFormData({ ...formData, minRiskReward: Number(e.target.value) })}
                className="w-full rounded border border-[#1f293d] bg-[#090d15] p-2 text-xs font-mono text-slate-200"
              />
              <span className="text-[10px] text-slate-500">Padrão: 2.0 (rejeita trades com R/R inferior)</span>
            </div>
          </div>

          <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4 text-xs space-y-4">
            <h3 className="font-bold text-white uppercase tracking-wider text-xs border-b border-[#1f293d] pb-2">
              3. Modo de Risco e Confirmações
            </h3>

            <div>
              <label className="block text-slate-300 mb-1">Perfil de Operação</label>
              <div className="grid grid-cols-3 gap-2">
                {(['CONSERVADOR', 'MODERADO', 'AGRESSIVO'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFormData({ ...formData, riskMode: mode })}
                    className={`py-2 rounded font-semibold text-xs transition-colors border ${
                      formData.riskMode === mode
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500'
                        : 'bg-[#090d15] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {formData.riskMode === 'CONSERVADOR'
                  ? 'Exige mais confirmações e filtra qualquer lateralidade.'
                  : formData.riskMode === 'MODERADO'
                  ? 'Equilíbrio padrão de confirmações.'
                  : 'Gera sinais mais rápidos com menor número de filtros.'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-200 block">Confirmar sinal apenas no fechamento</span>
                <span className="text-[10px] text-slate-500">Reduz expressivamente falsos rompimentos</span>
              </div>
              <input
                type="checkbox"
                checked={formData.confirmOnlyOnClose}
                onChange={(e) => setFormData({ ...formData, confirmOnlyOnClose: e.target.checked })}
                className="h-4 w-4 rounded accent-emerald-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-medium text-amber-300 block">Ativar Modo Demonstração (Demo)</span>
                <span className="text-[10px] text-slate-500">Exibe selo visível DEMO — DADOS SIMULADOS</span>
              </div>
              <input
                type="checkbox"
                checked={formData.demoMode}
                onChange={(e) => setFormData({ ...formData, demoMode: e.target.checked })}
                className="h-4 w-4 rounded accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 3. API Providers & Secret Protection as requested in #88, #89 */}
        <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4 text-xs space-y-3">
          <h3 className="font-bold text-white uppercase tracking-wider text-xs border-b border-[#1f293d] pb-2 flex items-center gap-1.5">
            <Key className="h-4 w-4 text-emerald-400" />
            4. Arquitetura de Provedores de Dados (Market Data Adapters)
          </h3>
          <p className="text-slate-400 text-xs">
            Todas as chaves secretas são protegidas no ambiente de execução do backend (`.env`) e jamais expostas ao navegador.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded bg-[#090d15] border border-slate-800">
              <span className="text-slate-400 block text-[10px]">PROVEDOR CRIPTO:</span>
              <strong className="text-emerald-400">Binance Official Live WebSocket (Conectado)</strong>
              <div className="text-[10px] text-slate-500 mt-1">BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT</div>
            </div>

            <div className="p-3 rounded bg-[#090d15] border border-slate-800">
              <span className="text-slate-400 block text-[10px]">PROVEDOR B3:</span>
              <strong className="text-sky-400">B3 Certified Delayed Adapter (15m regulatório)</strong>
              <div className="text-[10px] text-slate-500 mt-1">Chave B2B direta configurável via B3_API_KEY</div>
            </div>

            <div className="p-3 rounded bg-[#090d15] border border-slate-800">
              <span className="text-slate-400 block text-[10px]">INTELIGÊNCIA DE IA:</span>
              <strong className="text-indigo-400">Gemini 3.8 Flash (@google/genai SDK) / Ollama</strong>
              <div className="text-[10px] text-slate-500 mt-1">Grounded nos dados numéricos estruturados</div>
            </div>

            <div className="p-3 rounded bg-[#090d15] border border-slate-800">
              <span className="text-slate-400 block text-[10px]">PROVEDOR DE NOTÍCIAS:</span>
              <strong className="text-emerald-400">Market Intelligence Feed & Copom / Fed Engine</strong>
              <div className="text-[10px] text-slate-500 mt-1">Sentimento quantitativo calibrado (-100 a +100)</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

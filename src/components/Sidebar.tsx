import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Radar,
  LineChart,
  Filter,
  BellRing,
  Newspaper,
  Calendar,
  Wallet,
  History,
  Sliders,
  Users,
  ShieldCheck,
  Upload,
  Power,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeSignalsCount: number;
  floatingAlertsEnabled?: boolean;
  onToggleFloatingAlerts?: () => void;
}

const SidebarComponent: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  activeSignalsCount,
  floatingAlertsEnabled = true,
  onToggleFloatingAlerts,
}) => {
  const [logoSrc, setLogoSrc] = useState<string>('/logo_vsual.jpg');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal para autorizar a alteração do logo com a senha Fpjqt@10
  const [isLogoAuthModalOpen, setIsLogoAuthModalOpen] = useState(false);
  const [logoPassword, setLogoPassword] = useState('');
  const [logoPasswordError, setLogoPasswordError] = useState<string | null>(null);
  const [showLogoPassword, setShowLogoPassword] = useState(false);

  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem('marketai_custom_logo');
      if (savedLogo && savedLogo !== '/logo.jpg') {
        setLogoSrc(savedLogo);
      } else {
        setLogoSrc('/logo_vsual.jpg');
      }
    } catch {
      setLogoSrc('/logo_vsual.jpg');
    }
  }, []);

  const handleOpenLogoAuth = () => {
    setLogoPassword('');
    setLogoPasswordError(null);
    setIsLogoAuthModalOpen(true);
  };

  const handleVerifyLogoPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (logoPassword === 'Fpjqt@10') {
      setIsLogoAuthModalOpen(false);
      setLogoPassword('');
      setLogoPasswordError(null);
      // Dispara o seletor de arquivo de imagem
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    } else {
      setLogoPasswordError('Senha incorreta! Digite a senha "Fpjqt@10" para autorizar a alteração.');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLogoSrc(result);
        try {
          localStorage.setItem('marketai_custom_logo', result);
        } catch {}
      };
      reader.readAsDataURL(file);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'radar', label: 'Radar de Oportunidades', icon: Radar, badge: activeSignalsCount },
    { id: 'chart', label: 'Gráfico & Análise', icon: LineChart },
    { id: 'scanner', label: 'Scanner de Mercado', icon: Filter },
    { id: 'signals', label: 'Feed & Histórico', icon: BellRing },
    { id: 'news', label: 'Notícias & Inteligência', icon: Newspaper },
    { id: 'calendar', label: 'Calendário Econômico', icon: Calendar },
    { id: 'paper', label: 'Paper Trading', icon: Wallet },
    { id: 'backtest', label: 'Backtest de Estratégias', icon: History },
    { id: 'admin', label: 'Administração & APIs', icon: Sliders },
    { id: 'users', label: 'Usuários', icon: Users },
  ];

  return (
    <aside className="w-16 md:w-60 shrink-0 border-r border-[#1f293d] bg-[#090d15] flex flex-col justify-between select-none overflow-y-auto">
      <div className="py-4">
        <div className="px-4 pb-3 hidden md:block">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Módulos da Plataforma
          </span>
        </div>

        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : 'text-slate-400 hover:bg-[#121826] hover:text-slate-200 border border-transparent'
                }`}
                title={item.label}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto hidden md:inline-flex items-center justify-center rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/40">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* BOTÃO ATIVAR/DESATIVAR JANELAS FLUTUANTES DE REVERSÃO */}
        {onToggleFloatingAlerts && (
          <div className="mt-3 px-2">
            <button
              onClick={onToggleFloatingAlerts}
              className={`w-full flex items-center justify-between gap-2 rounded-lg p-2.5 text-xs font-mono font-bold transition-all border ${
                floatingAlertsEnabled
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:bg-emerald-900/40'
                  : 'border-slate-800 bg-[#101522] text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
              title="Ativar ou Desativar as janelas flutuantes de reversão de tendência em tempo real"
            >
              <div className="flex items-center gap-2 truncate">
                <BellRing className={`h-4 w-4 shrink-0 ${floatingAlertsEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="hidden md:inline truncate">Janelas Flutuantes</span>
              </div>
              <span
                className={`hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  floatingAlertsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {floatingAlertsEnabled ? 'ATIVADO' : 'DESATIVADO'}
              </span>
            </button>
          </div>
        )}

        {/* LOGO ANEXADO ABAIXO DO BOTÃO DE USUÁRIOS NO MENU LATERAL (APENAS O LOGOTIPO) */}
        <div className="mt-4 px-2 hidden md:block">
          <div className="relative group overflow-hidden rounded-xl border border-orange-500/30 bg-gradient-to-b from-[#120e0a]/90 via-[#0c0f18] to-[#060a14] p-2.5 text-center shadow-xl hover:border-orange-500/60 transition-all">
            {/* Logo Image */}
            <div className="relative mx-auto flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-orange-500/20 bg-black/80 shadow-[0_0_20px_rgba(249,115,22,0.15)] p-1.5">
              <img
                src={logoSrc}
                alt="Logotipo"
                className="h-full w-full object-contain rounded-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_vsual.jpg';
                }}
              />
              {/* Overlay hover to change logo */}
              <div
                onClick={handleOpenLogoAuth}
                className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-orange-400 text-[10px] font-mono font-bold p-1"
                title="Clique para alterar o logotipo (Requer senha de administrador)"
              >
                <Upload className="h-4 w-4 mb-1" />
                <span>Trocar Logotipo</span>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* MODAL PARA SOLICITAR SENHA "Fpjqt@10" AO ALTERAR O LOGOTIPO */}
        {isLogoAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm rounded-xl border border-orange-500/40 bg-[#0d121c] p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-mono font-bold text-xs">
                  <Lock className="h-4 w-4 text-orange-400" />
                  <span>Autorização: Alterar Logotipo</span>
                </div>
                <button
                  onClick={() => setIsLogoAuthModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleVerifyLogoPassword} className="mt-4 space-y-3 font-mono text-xs">
                <p className="text-[11px] text-slate-300">
                  Digite a senha de segurança para autorizar o upload de um novo logotipo da Vsual Consultoria:
                </p>

                {logoPasswordError && (
                  <div className="p-2.5 rounded bg-rose-950/70 border border-rose-500/50 text-rose-300 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{logoPasswordError}</span>
                  </div>
                )}

                <div className="relative">
                  <input
                    type={showLogoPassword ? 'text' : 'password'}
                    value={logoPassword}
                    onChange={(e) => setLogoPassword(e.target.value)}
                    placeholder="Digite a senha de acesso"
                    autoFocus
                    required
                    className="w-full rounded-lg border border-[#1f293d] bg-[#070b14] pl-8 pr-10 py-2 text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <button
                    type="button"
                    onClick={() => setShowLogoPassword(!showLogoPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showLogoPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogoAuthModalOpen(false)}
                    className="flex-1 py-2 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Confirmar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Bottom User status & Compliance */}
      <div className="border-t border-[#1f293d] p-3 hidden md:block text-[11px] text-slate-400">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-mono text-[10px] font-bold">
            PRO
          </div>
          <div>
            <div className="font-medium text-slate-200">Terminal Quant B3</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Licenciado & Seguro
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          SaaS multi-mercado com confirmação estrita por múltiplos fatores.
        </p>
      </div>
    </aside>
  );
};

export const Sidebar = React.memo(SidebarComponent);

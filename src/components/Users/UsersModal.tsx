import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  X,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
  LogOut,
} from 'lucide-react';
import { UsersView } from './UsersView.js';

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose }) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check initial session storage
  useEffect(() => {
    try {
      const auth = sessionStorage.getItem('marketai_users_session_auth') === 'true';
      setIsAuthenticated(auth);
    } catch {
      setIsAuthenticated(false);
    }
  }, [isOpen]);

  // Reset inputs and error on modal open if not authenticated
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput;

    // Acesso estrito: usuário "administrador" e senha "Fpjqt@10"
    if (cleanUser.toLowerCase() === 'administrador' && cleanPass === 'Fpjqt@10') {
      setIsAuthenticated(true);
      try {
        sessionStorage.setItem('marketai_users_session_auth', 'true');
      } catch {}
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setErrorMessage('Usuário ou senha incorretos! Somente quem possui as credenciais de administrador pode acessar esta janela.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('marketai_users_session_auth');
    } catch {}
    setUsernameInput('');
    setPasswordInput('');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Container da Janela Flutuante */}
      <div
        className={`relative w-full ${
          isAuthenticated ? 'max-w-6xl max-h-[92vh]' : 'max-w-md'
        } bg-[#0b0f19] border border-[#1f293d] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transition-all duration-300`}
      >
        {/* Barra de Título da Janela Flutuante */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f293d] bg-gradient-to-r from-[#0d1322] via-[#090d16] to-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center border shadow-sm ${
                isAuthenticated
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-orange-500/10 border-orange-500/40 text-orange-400'
              }`}
            >
              {isAuthenticated ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                <span>Janela de Usuários</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isAuthenticated
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isAuthenticated ? 'ACESSO AUTORIZADO' : 'PROTEGIDO POR SENHA'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isAuthenticated
                  ? 'Sessão ativa: administrador (Acesso total concedido)'
                  : 'Acesso restrito: autentique-se para abrir a janela de usuários'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors"
                title="Bloquear a janela de usuários e sair"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span className="hidden sm:inline">Bloquear / Sair</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Fechar janela"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo: Formulário de Autenticação OU Gerenciamento Completo */}
        {!isAuthenticated ? (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="font-mono text-base font-bold text-white tracking-wide">
                Autenticação de Administrador
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Somente usuários autorizados com credenciais de administrador têm permissão para acessar esta janela.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Usuário de Acesso <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Digite o usuário (ex: administrador)"
                    autoFocus
                    required
                    className="w-full rounded-lg border border-[#1f293d] bg-[#070b14] pl-9 pr-3 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Senha de Acesso <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha de acesso"
                    required
                    className="w-full rounded-lg border border-[#1f293d] bg-[#070b14] pl-9 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors text-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Unlock className="h-4 w-4" />
                  <span>Acessar Janela</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[calc(92vh-60px)]">
            <UsersView isEmbedded={true} />
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  Lock,
  UserCheck,
  UserX,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { UserAccount } from '../../types/market.js';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../services/api.js';

export const UsersView: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded = false }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (isEmbedded) return true;
    try {
      return sessionStorage.getItem('marketai_users_session_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Direct login form states if not embedded
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'TRADER' | 'ANALISTA'>('TRADER');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');

  const [showPassword, setShowPassword] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load users from API with fallback to localStorage
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
        localStorage.setItem('marketai_users_cache', JSON.stringify(data));
      } else {
        fallbackToLocalStorage();
      }
    } catch {
      fallbackToLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const fallbackToLocalStorage = () => {
    try {
      const cached = localStorage.getItem('marketai_users_cache');
      if (cached) {
        setUsers(JSON.parse(cached));
      } else {
        const defaultUsers: UserAccount[] = [
          {
            id: 'usr-1',
            username: 'admin',
            password: 'admin123',
            name: 'Administrador Master',
            role: 'ADMIN',
            status: 'ATIVO',
            createdAt: Date.now() - 30 * 86400000,
          },
          {
            id: 'usr-2',
            username: 'trader_pro',
            password: 'pro2026',
            name: 'Operador Quant B3',
            role: 'TRADER',
            status: 'ATIVO',
            createdAt: Date.now() - 15 * 86400000,
          },
        ];
        setUsers(defaultUsers);
        localStorage.setItem('marketai_users_cache', JSON.stringify(defaultUsers));
      }
    } catch {}
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setFormError('Por favor, informe o campo Usuário.');
      return;
    }
    if (!password || password.length < 4) {
      setFormError('A Senha deve ter no mínimo 4 caracteres.');
      return;
    }

    // Check duplicate
    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      setFormError(`O usuário "${cleanUsername}" já está cadastrado.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await createUser({
        username: cleanUsername,
        password,
        name: name.trim() || cleanUsername,
        role,
        status,
      });

      setUsers((prev) => {
        const updated = [newUser, ...prev];
        localStorage.setItem('marketai_users_cache', JSON.stringify(updated));
        return updated;
      });

      setFormSuccess(`Usuário "${cleanUsername}" cadastrado com sucesso!`);
      setUsername('');
      setPassword('');
      setName('');
      setRole('TRADER');
      setStatus('ATIVO');
      setShowPassword(false);

      setTimeout(() => setFormSuccess(null), 5000);
    } catch (err: any) {
      // Local fallback creation
      const localUser: UserAccount = {
        id: `usr-${Date.now()}`,
        username: cleanUsername,
        password,
        name: name.trim() || cleanUsername,
        role,
        status,
        createdAt: Date.now(),
      };
      setUsers((prev) => {
        const updated = [localUser, ...prev];
        localStorage.setItem('marketai_users_cache', JSON.stringify(updated));
        return updated;
      });
      setFormSuccess(`Usuário "${cleanUsername}" cadastrado com sucesso!`);
      setUsername('');
      setPassword('');
      setName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    const nextStatus: 'ATIVO' | 'INATIVO' = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    try {
      await updateUser(user.id, { status: nextStatus });
    } catch {}

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u));
      localStorage.setItem('marketai_users_cache', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDelete = async (id: string, userLogin: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userLogin}"?`)) {
      return;
    }
    try {
      await deleteUser(id);
    } catch {}

    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      localStorage.setItem('marketai_users_cache', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyCredentials = (user: UserAccount) => {
    const text = `Usuário: ${user.username}\nSenha: ${user.password}\nPlataforma: MarketAI Radar`;
    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isAuthenticated) {
    const handleDirectLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      if (authUsername.trim().toLowerCase() === 'administrador' && authPassword === 'Fpjqt@10') {
        setIsAuthenticated(true);
        try {
          sessionStorage.setItem('marketai_users_session_auth', 'true');
        } catch {}
      } else {
        setAuthError('Usuário ou senha incorretos! Somente o administrador autorizado pode acessar esta janela.');
      }
    };

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="w-full max-w-md bg-[#0c111c] border border-[#1f293d] rounded-2xl p-6 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-mono font-bold text-white mb-1">Janela de Usuários - Acesso Restrito</h2>
          <p className="text-xs text-slate-400 mb-6">
            Informe as credenciais de acesso de administrador para abrir o gerenciamento de usuários.
          </p>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2 text-left">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleDirectLogin} className="space-y-4 font-mono text-xs text-left">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Usuário <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Digite o usuário (ex: administrador)"
                autoFocus
                required
                className="w-full rounded-lg border border-[#1f293d] bg-[#070b14] px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Senha de Acesso <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Digite a senha de acesso"
                  required
                  className="w-full rounded-lg border border-[#1f293d] bg-[#070b14] pl-3 pr-10 py-2 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showAuthPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              <span>Acessar Janela de Usuários</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="rounded-xl border border-[#1f293d] bg-gradient-to-r from-[#0c1220] via-[#09101c] to-[#0d1627] p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-mono font-bold text-white flex items-center gap-2">
                Controle de Usuários
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  {users.filter((u) => u.status === 'ATIVO').length} Ativos
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre e gerencie os usuários e senhas autorizados a acessar o sistema MarketAI Radar.
              </p>
            </div>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1f293d] bg-[#121826] hover:bg-[#182235] text-xs font-mono text-slate-300 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Atualizar Lista</span>
          </button>
        </div>
      </div>

      {/* Grid: Cadastro Form + User List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form de Cadastro */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-[#1f293d] bg-[#0c111c] p-5 shadow-xl">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#1f293d]">
              <UserPlus className="h-5 w-5 text-emerald-400" />
              <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                Cadastrar Novo Usuário
              </h2>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {/* Campo Usuário */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Usuário <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: trader_joao ou analista_b3"
                    className="w-full rounded-lg border border-[#1f293d] bg-[#070b12] px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Identificador de login do operador no programa.</p>
              </div>

              {/* Campo Senha */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Senha <span className="text-emerald-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    Gerar Senha Forte
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha de acesso"
                    className="w-full rounded-lg border border-[#1f293d] bg-[#070b12] pl-3 pr-10 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Nome Completo (Opcional) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome do Operador / Descrição
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva - Mesa B3"
                  className="w-full rounded-lg border border-[#1f293d] bg-[#070b12] px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {/* Perfil & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Perfil de Acesso</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full rounded-lg border border-[#1f293d] bg-[#070b12] px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="TRADER">Trader Operador</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="ANALISTA">Analista (Leitura)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Inicial</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-[#1f293d] bg-[#070b12] px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="ATIVO">Ativo (Permitido)</option>
                    <option value="INATIVO">Inativo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário no Programa'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Tabela de Usuários Cadastrados */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-[#1f293d] bg-[#0c111c] p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#1f293d]">
              <div>
                <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Usuários Autorizados ({users.length})
                </h2>
                <p className="text-[11px] text-slate-400">
                  Gerencie credenciais, permissões e bloqueios de acesso.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar usuário..."
                  className="w-full rounded-lg border border-[#1f293d] bg-[#070b12] pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
                <div>Carregando usuários cadastrados...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-mono">
                <Lock className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <div>Nenhum usuário encontrado com o filtro "{searchTerm}".</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const isRevealed = !!revealedPasswords[user.id];
                  const isCopied = copiedId === user.id;

                  return (
                    <div
                      key={user.id}
                      className="rounded-lg border border-[#1f293d] bg-[#080d17] p-3.5 hover:border-slate-700 transition-all font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{user.username}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              user.status === 'ATIVO'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                            }`}
                          >
                            {user.status}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {user.role}
                          </span>
                        </div>

                        {user.name && user.name !== user.username && (
                          <div className="text-slate-400 text-[11px]">{user.name}</div>
                        )}

                        {/* Senha com Reveal / Copy */}
                        <div className="flex items-center gap-2 pt-1 text-[11px]">
                          <span className="text-slate-500">Senha:</span>
                          <span className="text-slate-200 font-bold bg-black/40 px-2 py-0.5 rounded border border-slate-800 font-mono">
                            {isRevealed ? user.password : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => toggleRevealPassword(user.id)}
                            className="text-slate-400 hover:text-slate-200 p-1"
                            title={isRevealed ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={() => handleCopyCredentials(user)}
                            className="text-slate-400 hover:text-emerald-400 p-1 flex items-center gap-1"
                            title="Copiar credenciais"
                          >
                            {isCopied ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                            user.status === 'ATIVO'
                              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
                              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                          }`}
                          title={user.status === 'ATIVO' ? 'Bloquear acesso' : 'Liberar acesso'}
                        >
                          {user.status === 'ATIVO' ? (
                            <>
                              <UserX className="h-3 w-3" />
                              <span>Bloquear</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3" />
                              <span>Ativar</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors border border-transparent hover:border-rose-900"
                          title="Excluir usuário"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

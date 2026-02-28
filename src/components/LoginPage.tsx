import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { LogIn, ShieldCheck, User as UserIcon, UserPlus, Phone, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: username,
          password: password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            throw new Error('Erro ao carregar perfil do usuário.');
          }

          const user: User = {
            id: authData.user.id,
            name: profileData.name || authData.user.user_metadata.name,
            login: authData.user.email || '',
            phone: profileData.phone || authData.user.user_metadata.phone || '',
            role: profileData.role as UserRole,
          };

          login(user);
        }
      } else {
        const role = (showAdminCode && adminCode === 'admin123') ? UserRole.ADMIN : UserRole.COLLECTOR;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: username,
          password: password,
          options: {
            data: { name, phone, role },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          const { error: profileInsertError } = await supabase
            .from('profiles')
            .insert([{ id: signUpData.user.id, name, phone, role, login: username }]);

          if (profileInsertError) {
            console.error('Error creating profile:', profileInsertError);
          }

          setIsLogin(true);
          setError(`Conta ${role === UserRole.ADMIN ? 'ADMIN' : ''} criada com sucesso! Verifique seu e-mail para confirmar.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `
    w-full pl-12 pr-4 py-4 bg-black/50 border border-white/[0.08] rounded-2xl
    outline-none transition-all duration-300 font-medium text-white
    placeholder:text-slate-600 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]
    focus:border-fin-blue/40 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),0_0_0_3px_rgba(239,68,68,0.07)]
  `;

  return (
    <div className="min-h-screen bg-fin-dark flex items-center justify-center p-6 relative overflow-hidden">

      {/* Background — gradiente direcional + textura, sem os blobs genéricos */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(220,38,38,0.07),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo + identidade */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, delay: 0.1 }}
            className="relative w-20 h-20 mx-auto mb-6"
          >
            {/* Anel de glow vermelho em vez de azul */}
            <div className="absolute inset-0 rounded-2xl bg-fin-blue/10 blur-xl" />
            <div
              className="relative w-20 h-20 glass-panel rounded-2xl flex items-center justify-center overflow-hidden p-3"
              style={{ boxShadow: '0 0 28px rgba(239,68,68,0.2), 0 1px 0 rgba(255,255,255,0.08) inset' }}
            >
              <img
                src="https://i.postimg.cc/G3JkMH6z/image-removebg-preview.png"
                alt="Logo"
                className="w-full h-full object-contain"
                style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Kevin</h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide">
              Gestão de Empréstimos Privados
            </p>
          </motion.div>
        </div>

        {/* Card do formulário */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        >
          <form
            onSubmit={handleSubmit}
            className="glass-panel-modal p-8 space-y-5"
          >
            {/* Header do form */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isLogin ? 'Acessar sistema' : 'Criar nova conta'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {isLogin
                  ? 'Entre com suas credenciais de acesso'
                  : 'Preencha os dados para criar seu acesso'}
              </p>
            </div>

            <div className="space-y-3">
              {/* Campos de cadastro */}
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-fin-blue transition-colors" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="Nome Completo"
                        required={!isLogin}
                      />
                    </div>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-fin-blue transition-colors" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                        placeholder="Telefone"
                        required={!isLogin}
                      />
                    </div>

                    {/* Toggle admin */}
                    <label className="flex items-center gap-3 cursor-pointer group py-1">
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="adminMode"
                          checked={showAdminCode}
                          onChange={(e) => setShowAdminCode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-fin-blue/50 transition-colors border border-white/10 peer-checked:border-fin-blue/30" />
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-slate-400 peer-checked:bg-white rounded-full transition-all peer-checked:translate-x-4" />
                      </div>
                      <span className="text-xs text-slate-400 font-medium group-hover:text-slate-300 transition-colors select-none">
                        Criar conta como Administrador
                      </span>
                    </label>

                    {showAdminCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="relative group overflow-hidden"
                      >
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-fin-amber w-4 h-4" />
                        <input
                          type="password"
                          value={adminCode}
                          onChange={(e) => setAdminCode(e.target.value)}
                          className={`${inputClass} border-fin-amber/20 focus:border-fin-amber/40 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),0_0_0_3px_rgba(245,158,11,0.07)]`}
                          placeholder="Código Secreto de Admin"
                        />
                      </motion.div>
                    )}

                    {/* Divisor */}
                    <div className="divider my-2" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* E-mail */}
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-fin-blue transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder="E-mail"
                  required
                />
              </div>

              {/* Senha com toggle de visibilidade */}
              <div className="relative group">
                <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-fin-blue transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder="Senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mensagem de erro / sucesso */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border ${
                    error.includes('sucesso')
                      ? 'bg-fin-emerald/8 text-fin-emerald border-fin-emerald/20'
                      : 'bg-fin-rose/8 text-fin-rose border-fin-rose/20'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão submit */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.975 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 glow-button text-base disabled:opacity-50 disabled:grayscale"
            >
              {loading
                ? (isLogin ? 'Autenticando...' : 'Criando conta...')
                : (isLogin ? 'Entrar' : 'Criar Conta')}
            </motion.button>

            {/* Toggle login/cadastro */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-xs font-semibold text-slate-500 hover:text-fin-blue transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                {isLogin ? (
                  <><UserPlus className="w-3.5 h-3.5" /> Não tem uma conta? Criar agora</>
                ) : (
                  <><LogIn className="w-3.5 h-3.5" /> Já tem uma conta? Fazer login</>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Rodapé — nome real do produto em vez de "SecureFlow Engine" */}
        <p className="mt-8 text-center text-[10px] font-bold text-slate-700 uppercase tracking-[0.22em]">
          Kevin · Gestão Financeira Privada
        </p>
      </motion.div>
    </div>
  );
};
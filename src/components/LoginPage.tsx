import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { LogIn, ShieldCheck, User as UserIcon, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: username, password });
        if (authError) throw authError;
        if (authData.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles').select('*').eq('id', authData.user.id).single();
          if (profileError) throw new Error('Erro ao carregar perfil.');
          login({
            id: authData.user.id,
            name: profileData.name || authData.user.user_metadata.name,
            login: authData.user.email || '',
            phone: profileData.phone || '',
            role: profileData.role as UserRole,
          });
        }
      } else {
        const role = showAdminCode && adminCode === 'admin123' ? UserRole.ADMIN : UserRole.COLLECTOR;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: username, password, options: { data: { name, phone, role } },
        });
        if (signUpError) throw signUpError;
        if (signUpData.user) {
          await supabase.from('profiles').insert([{ id: signUpData.user.id, name, phone, role, login: username }]);
          setIsLogin(true);
          setError('Conta criada! Verifique seu e-mail para confirmar.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const input = `w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm font-medium placeholder:text-slate-700 outline-none transition-all duration-300 focus:bg-white/[0.06] focus:border-red-500/40 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.07)]`;

  return (
    <div className="min-h-screen bg-[#080809] flex items-center justify-center p-5 relative overflow-hidden">
      {/* Atmosphere */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-red-600/[0.06] blur-[180px] rounded-full pointer-events-none -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-red-900/[0.04] blur-[140px] rounded-full pointer-events-none" />
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.018] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 12 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(239,68,68,0.04) 100%)',
              border: '1px solid rgba(239,68,68,0.18)',
              boxShadow: '0 0 50px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <img src="https://i.postimg.cc/G3JkMH6z/image-removebg-preview.png" alt="Kevin"
              className="w-9 h-9 object-contain"
              style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.5))' }} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-2xl font-black text-white tracking-tight">Kevin<span className="text-red-500">.</span></h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] mt-1">Gestão Financeira Privada</p>
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-3xl border border-white/[0.07] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)',
            backdropFilter: 'blur(30px)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.055)',
          }}
        >
          {/* Tab bar */}
          <div className="flex border-b border-white/[0.06]">
            {[{ v: true, label: 'Entrar' }, { v: false, label: 'Criar conta' }].map(tab => (
              <button key={String(tab.v)} type="button"
                onClick={() => { setIsLogin(tab.v); setError(''); }}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-200 relative"
                style={{ color: isLogin === tab.v ? '#fff' : 'rgba(100,116,139,0.7)' }}
              >
                {tab.label}
                {isLogin === tab.v && (
                  <motion.div layoutId="tab-line"
                    className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full bg-red-500"
                    style={{ boxShadow: '0 0 10px rgba(239,68,68,0.7)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Fields */}
          <form onSubmit={handleSubmit} className="p-6 space-y-3">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div key="reg"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="space-y-3 overflow-hidden"
                >
                  {/* Nome */}
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-700 pointer-events-none" />
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      className={`${input} pl-10 pr-4 py-3.5`} placeholder="Nome completo"
                      required={!isLogin} autoComplete="name" />
                  </div>
                  {/* Telefone */}
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-700 pointer-events-none" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className={`${input} pl-10 pr-4 py-3.5`} placeholder="Telefone" required={!isLogin} />
                  </div>
                  {/* Toggle admin */}
                  <label className="flex items-center gap-3 cursor-pointer group px-0.5">
                    <div onClick={() => setShowAdminCode(p => !p)}
                      className={`w-9 h-5 rounded-full border relative flex-shrink-0 transition-all duration-300 ${showAdminCode ? 'bg-red-500/15 border-red-500/35' : 'bg-white/[0.04] border-white/[0.08]'}`}>
                      <motion.div animate={{ x: showAdminCode ? 16 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`absolute top-[3px] w-3 h-3 rounded-full transition-colors ${showAdminCode ? 'bg-red-400' : 'bg-slate-600'}`} />
                    </div>
                    <span className="text-xs text-slate-600 font-semibold group-hover:text-slate-400 transition-colors select-none">
                      Conta Administrador
                    </span>
                  </label>
                  <AnimatePresence>
                    {showAdminCode && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="relative">
                          <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-500/50 pointer-events-none" />
                          <input type="password" value={adminCode} onChange={e => setAdminCode(e.target.value)}
                            className={`${input} pl-10 pr-4 py-3.5 border-red-500/15 focus:border-red-500/45`}
                            placeholder="Código de administrador" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* E-mail */}
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-700 pointer-events-none" />
              <input type="email" value={username} onChange={e => setUsername(e.target.value)}
                className={`${input} pl-10 pr-4 py-3.5`} placeholder="E-mail" required autoComplete="email" />
            </div>

            {/* Senha */}
            <div className="relative">
              <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-700 pointer-events-none" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className={`${input} pl-10 pr-11 py-3.5`} placeholder="Senha" required
                autoComplete={isLogin ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-400 transition-colors">
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`text-xs font-bold text-center py-2.5 px-3 rounded-xl border ${error.includes('criada') || error.includes('sucesso')
                    ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20'
                    : 'text-red-400 bg-red-500/8 border-red-500/20'}`}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
              type="submit" disabled={loading}
              className="w-full py-4 mt-1 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:grayscale"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                boxShadow: loading ? 'none' : '0 0 35px rgba(239,68,68,0.28), 0 4px 20px rgba(185,28,28,0.2)',
              }}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Autenticando...' : 'Criando conta...'}</>
              ) : (
                <>{isLogin ? 'Acessar sistema' : 'Criar conta'} <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-6 text-center text-[9px] font-bold text-slate-700 uppercase tracking-[0.25em]">
          Kevin · Plataforma Financeira
        </motion.p>
      </motion.div>
    </div>
  );
};
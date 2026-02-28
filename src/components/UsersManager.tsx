import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, ShieldCheck, Shield, Phone, Key, XCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

const inputClass = `
  w-full px-5 py-4 bg-black/40 border border-white/[0.08] rounded-2xl outline-none
  focus:border-fin-blue/40 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.07)]
  text-white font-semibold placeholder:text-slate-700
  transition-all duration-300 shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]
`;

export const UsersManager: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '', phone: '', login: '', password: '', role: UserRole.COLLECTOR,
  });

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, phone, login, role')
        .order('name');
      if (error) throw error;
      setUsers(data as User[]);
    } catch (err) {
      console.error('Erro ao buscar membros da equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const email = `${newUser.login}@sistema.com`;
      const { data, error } = await supabase.rpc('create_new_collector', {
        p_email: email,
        p_password: newUser.password,
        p_name: newUser.name,
        p_phone: newUser.phone,
      });
      if (error) throw error;
      const isSuccess = data && (typeof data === 'string' || (data as any).success === true);
      if (isSuccess || !error) {
        setShowModal(false);
        setNewUser({ name: '', phone: '', login: '', password: '', role: UserRole.COLLECTOR });
        await fetchTeam();
      }
    } catch (err: any) {
      alert('Erro ao criar usuário: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: string | number) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      alert('Erro ao remover usuário: ' + err.message);
    }
  };

  const admins = users.filter(u => u.role === UserRole.ADMIN);
  const collectors = users.filter(u => u.role === UserRole.COLLECTOR);

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-slate-500 font-medium">
      <div className="w-5 h-5 border-2 border-fin-blue/30 border-t-fin-blue rounded-full animate-spin mr-3" />
      Carregando equipe...
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Gestão de Equipe</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {admins.length} admin{admins.length !== 1 ? 's' : ''} · {collectors.length} cobrador{collectors.length !== 1 ? 'es' : ''}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="px-6 py-3.5 glow-button text-sm">
            <UserPlus className="w-4 h-4" />
            <span>Novo Cobrador</span>
          </button>
        )}
      </header>

      {/* Estado vazio */}
      {users.length === 0 && (
        <div className="glass-panel p-16 text-center">
          <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/10">
            <Users className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Nenhum membro encontrado</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Adicione cobradores para que possam acessar o sistema em campo.
          </p>
        </div>
      )}

      {/* Seção Administradores */}
      {admins.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-fin-blue rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Administradores
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {admins.map((u, i) => (
              <UserCard
                key={u.id}
                user={u}
                index={i}
                currentUserId={currentUser?.id}
                onDelete={handleDeleteUser}
              />
            ))}
          </div>
        </section>
      )}

      {/* Seção Cobradores */}
      {collectors.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-slate-600 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Cobradores
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {collectors.map((u, i) => (
              <UserCard
                key={u.id}
                user={u}
                index={i}
                currentUserId={currentUser?.id}
                onDelete={handleDeleteUser}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modal: Novo Cobrador */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="glass-panel-modal w-full max-w-md flex flex-col max-h-[90vh]"
            >
              <form onSubmit={handleAddUser} className="flex flex-col h-full">
                {/* Header */}
                <div className="px-7 py-6 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center border border-white/10">
                      <UserPlus className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">Novo Cobrador</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Defina credenciais de acesso ao sistema</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Campos */}
                <div className="px-7 py-6 space-y-5 overflow-y-auto custom-scrollbar">
                  <div>
                    <label className="block metric-title mb-2">Nome Completo</label>
                    <input
                      required type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className={inputClass} placeholder="Ex: João Silva"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block metric-title mb-2">Login</label>
                      <input
                        required type="text"
                        value={newUser.login}
                        onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
                        className={inputClass} placeholder="joao.silva"
                      />
                    </div>
                    <div>
                      <label className="block metric-title mb-2">Senha</label>
                      <input
                        required type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className={inputClass} placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block metric-title mb-2">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      className={inputClass} placeholder="(00) 00000-0000"
                    />
                  </div>

                  {/* Info do nível de acesso */}
                  <div className="flex items-start gap-3 bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                    <Shield className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      O cobrador terá acesso às cobranças do dia e à gestão de clientes,
                      sem visibilidade sobre relatórios ou empréstimos.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-white/[0.06] flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3.5 glass-button text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-3.5 glow-button text-sm disabled:opacity-50 disabled:grayscale"
                  >
                    {creating ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Criando...</>
                    ) : 'Criar Acesso'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Card de usuário ─────────────────────────────────────── */
const UserCard: React.FC<{
  user: User;
  index: number;
  currentUserId?: string | number;
  onDelete: (id: string | number) => void;
}> = ({ user, index, currentUserId, onDelete }) => {
  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={cn(
        'glass-panel p-6 flex flex-col group relative overflow-hidden',
        isAdmin ? 'shadow-glow-blue' : 'shadow-[0_0_40px_-14px_rgba(0,0,0,0.4)]'
      )}
    >
      {/* Glow de fundo — diferente por role */}
      <div className={cn(
        'absolute top-0 right-0 w-28 h-28 blur-[60px] rounded-full pointer-events-none transition-opacity duration-700',
        isAdmin ? 'bg-fin-blue/8 group-hover:opacity-150' : 'bg-white/[0.02]'
      )} />

      {/* Topo: ícone + badge de role */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        {/*
          ADMIN: ícone vermelho com borda colorida — visualmente distinto
          COLLECTOR: ícone neutro/cinza — hierarquia clara
        */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500',
          isAdmin
            ? 'bg-fin-blue/12 text-fin-blue border-fin-blue/25 group-hover:border-fin-blue/40 group-hover:shadow-glow-blue'
            : 'bg-white/[0.04] text-slate-400 border-white/10 group-hover:border-white/20'
        )}>
          {isAdmin
            ? <ShieldCheck className="w-6 h-6" />
            : <Shield className="w-6 h-6" />
          }
        </div>

        <span className={cn(
          'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border',
          isAdmin
            ? 'text-fin-blue bg-fin-blue/8 border-fin-blue/20'
            : 'text-slate-500 bg-white/[0.03] border-white/[0.08]'
        )}>
          {isAdmin ? 'Admin' : 'Cobrador'}
        </span>
      </div>

      {/* Nome e telefone */}
      <div className="relative z-10 flex-1">
        <h3 className={cn(
          'text-lg font-black tracking-tight transition-colors duration-400',
          isAdmin
            ? 'text-white group-hover:text-fin-blue'
            : 'text-slate-200 group-hover:text-white'
        )}>
          {user.name}
        </h3>
        <p className="text-xs text-slate-500 flex items-center gap-2 mt-1.5 font-medium">
          <Phone className="w-3.5 h-3.5 text-slate-600" />
          {user.phone || 'Sem telefone'}
        </p>
      </div>

      {/* Rodapé: login + ação de excluir */}
      <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center border',
            isAdmin
              ? 'bg-fin-blue/8 border-fin-blue/15'
              : 'bg-white/[0.03] border-white/[0.08]'
          )}>
            <Key className={cn('w-3.5 h-3.5', isAdmin ? 'text-fin-blue/60' : 'text-slate-600')} />
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 truncate max-w-[120px]">
            {user.login}
          </span>
        </div>

        {user.role === UserRole.COLLECTOR && String(currentUserId) !== String(user.id) && (
          <button
            onClick={() => onDelete(user.id)}
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-fin-rose hover:bg-fin-rose/10 rounded-xl transition-all border border-transparent hover:border-fin-rose/20"
            title="Remover cobrador"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
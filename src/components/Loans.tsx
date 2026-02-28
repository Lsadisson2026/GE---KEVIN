import React, { useEffect, useState } from 'react';
import { Client, PaymentType } from '../types';
import { formatCurrency } from '../utils';
import { HandCoins, ChevronDown, Calculator, Calendar, Percent, Landmark, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

const inputClass = `
  w-full bg-black/40 border border-white/[0.08] rounded-2xl outline-none
  focus:border-fin-blue/40 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.07)]
  text-white font-bold placeholder:text-slate-700
  transition-all duration-300 shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]
  py-4 px-5
`;

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY:   'Diário',
  WEEKLY:  'Semanal',
  MONTHLY: 'Mensal',
};

export const Loans: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newLoan, setNewLoan] = useState({
    client_id: '',
    capital: '',
    interest_rate: '10',
    payment_type: PaymentType.DAILY,
    installments_count: '24',
    start_date: new Date().toISOString().split('T')[0],
    late_fee_enabled: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('clients_summary')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('name');
        if (error) throw error;
        setClients(data as Client[]);
      } catch (err) {
        console.error('Error fetching clients:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoan.client_id || !user?.id) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('loans').insert([{
        client_id: newLoan.client_id,
        capital: parseFloat(newLoan.capital),
        interest_rate: parseFloat(newLoan.interest_rate),
        payment_type: newLoan.payment_type,
        installments_count: parseInt(newLoan.installments_count),
        start_date: newLoan.start_date,
        late_fee_enabled: newLoan.late_fee_enabled,
        status: 'ACTIVE',
        created_by: user.id,
      }]);
      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setNewLoan({
        client_id: '',
        capital: '',
        interest_rate: '10',
        payment_type: PaymentType.DAILY,
        installments_count: '24',
        start_date: new Date().toISOString().split('T')[0],
        late_fee_enabled: true,
      });
    } catch (err: any) {
      alert('Erro ao criar empréstimo: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  /* Projeção financeira — recalcula em tempo real */
  const capital    = parseFloat(newLoan.capital) || 0;
  const rate       = parseFloat(newLoan.interest_rate) || 0;
  const count      = parseInt(newLoan.installments_count) || 1;
  const totalInterest   = capital * (rate / 100);
  const totalAmount     = capital + totalInterest;
  const installmentValue = totalAmount / count;

  /* Cliente selecionado para exibir score */
  const selectedClient = clients.find(c => String(c.id) === String(newLoan.client_id));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="section-title">Novo Empréstimo</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Configure as condições e gere as parcelas automaticamente.
        </p>
      </header>

      {/* Feedback de sucesso */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-4 bg-fin-emerald/8 border border-fin-emerald/20 rounded-2xl text-fin-emerald font-bold text-sm"
          >
            <div className="w-2 h-2 rounded-full bg-fin-emerald animate-pulse" />
            Contrato gerado com sucesso! Parcelas criadas automaticamente.
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-500 font-medium">
          <div className="w-5 h-5 border-2 border-fin-blue/30 border-t-fin-blue rounded-full animate-spin mr-3" />
          Carregando clientes...
        </div>
      ) : clients.length === 0 ? (
        <div className="glass-panel p-10 text-center border-fin-amber/20">
          <div className="w-14 h-14 bg-fin-amber/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-fin-amber/20">
            <AlertCircle className="w-7 h-7 text-fin-amber" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Nenhum cliente ativo</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Verifique se há cadastros pendentes de aprovação na tela de Clientes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Formulário ──────────────────────────────── */}
          <div className="lg:col-span-2 glass-panel p-8 shadow-glow-blue">
            <form onSubmit={handleCreateLoan} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Cliente */}
                <div className="md:col-span-2">
                  <label className="block metric-title mb-2">Cliente Ativo</label>
                  <div className="relative">
                    <select
                      required
                      value={newLoan.client_id}
                      onChange={(e) => setNewLoan({ ...newLoan, client_id: e.target.value })}
                      className={cn(inputClass, 'pr-12 appearance-none')}
                    >
                      <option value="" className="bg-[#09090b]">Selecione um cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#09090b]">
                          {c.name} — Score {c.score}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                  {/* Score do cliente selecionado */}
                  {selectedClient && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 mt-2 px-3 py-2 bg-white/[0.02] rounded-xl border border-white/[0.06]"
                    >
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        selectedClient.score >= 70 ? 'bg-fin-emerald' : selectedClient.score >= 40 ? 'bg-fin-amber' : 'bg-fin-rose'
                      )} />
                      <span className="text-xs text-slate-400 font-medium">
                        Score de crédito:
                        <span className={cn(
                          'ml-1 font-bold',
                          selectedClient.score >= 70 ? 'text-fin-emerald' : selectedClient.score >= 40 ? 'text-fin-amber' : 'text-fin-rose'
                        )}>
                          {selectedClient.score}/100
                        </span>
                        {selectedClient.score >= 70 && <span className="text-slate-500 ml-1">· Perfil favorável</span>}
                        {selectedClient.score < 40  && <span className="text-fin-rose/70 ml-1">· Risco elevado</span>}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Capital */}
                <div>
                  <label className="block metric-title mb-2">Capital Emprestado</label>
                  <div className="relative group">
                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-fin-blue transition-colors" />
                    <input
                      required type="number" min="0" step="0.01"
                      value={newLoan.capital}
                      onChange={(e) => setNewLoan({ ...newLoan, capital: e.target.value })}
                      className={cn(inputClass, 'pl-11')}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Taxa de juros */}
                <div>
                  <label className="block metric-title mb-2">Taxa de Juros (%)</label>
                  <div className="relative group">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-fin-blue transition-colors" />
                    <input
                      required type="number" min="0" step="0.1"
                      value={newLoan.interest_rate}
                      onChange={(e) => setNewLoan({ ...newLoan, interest_rate: e.target.value })}
                      className={cn(inputClass, 'pl-11')}
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* Frequência */}
                <div>
                  <label className="block metric-title mb-2">Frequência de Pagamento</label>
                  <div className="relative">
                    <select
                      value={newLoan.payment_type}
                      onChange={(e) => setNewLoan({ ...newLoan, payment_type: e.target.value as PaymentType })}
                      className={cn(inputClass, 'pr-12 appearance-none')}
                    >
                      <option value={PaymentType.DAILY}   className="bg-[#09090b]">Diário (Seg a Sáb)</option>
                      <option value={PaymentType.WEEKLY}  className="bg-[#09090b]">Semanal</option>
                      <option value={PaymentType.MONTHLY} className="bg-[#09090b]">Mensal</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Parcelas */}
                <div>
                  <label className="block metric-title mb-2">Nº de Parcelas</label>
                  <div className="relative group">
                    <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-fin-blue transition-colors" />
                    <input
                      required type="number" min="1"
                      value={newLoan.installments_count}
                      onChange={(e) => setNewLoan({ ...newLoan, installments_count: e.target.value })}
                      className={cn(inputClass, 'pl-11')}
                      placeholder="24"
                    />
                  </div>
                </div>

                {/* Data */}
                <div className="md:col-span-2">
                  <label className="block metric-title mb-2">Data do Primeiro Vencimento</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-fin-blue transition-colors" />
                    <input
                      required type="date"
                      value={newLoan.start_date}
                      onChange={(e) => setNewLoan({ ...newLoan, start_date: e.target.value })}
                      className={cn(inputClass, 'pl-11')}
                    />
                  </div>
                </div>

                {/* Toggle multa */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        id="late_fee"
                        checked={newLoan.late_fee_enabled}
                        onChange={(e) => setNewLoan({ ...newLoan, late_fee_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-fin-blue/50 transition-colors border border-white/10 peer-checked:border-fin-blue/30" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-slate-400 peer-checked:bg-white rounded-full transition-all peer-checked:translate-x-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors uppercase tracking-[0.12em] select-none">
                      Multa por atraso · 1% ao dia
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-5 glow-button text-base disabled:opacity-50 disabled:grayscale"
              >
                {creating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando Contrato...</>
                ) : (
                  <><HandCoins className="w-5 h-5" /> Gerar Contrato de Empréstimo</>
                )}
              </button>
            </form>
          </div>

          {/* ── Painel lateral ──────────────────────────── */}
          <div className="space-y-5">

            {/* Projeção financeira */}
            {/*
              blur contido com overflow-hidden no card pai —
              o decorativo w-64 h-64 não vaza mais para fora.
            */}
            <div className="glass-panel p-7 shadow-glow-purple overflow-hidden relative">
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-fin-blue/8 blur-[60px] rounded-full pointer-events-none" />

              <div className="flex items-center gap-3 mb-7 relative z-10">
                <div className="w-9 h-9 bg-fin-blue/10 rounded-xl flex items-center justify-center border border-fin-blue/20 flex-shrink-0">
                  <Calculator className="w-4 h-4 text-fin-blue" />
                </div>
                <h3 className="font-black text-lg text-white tracking-tight">Projeção Financeira</h3>
              </div>

              <div className="space-y-0 relative z-10">
                {[
                  { label: 'Capital base',          value: formatCurrency(capital),        color: 'text-white' },
                  { label: `Juros (${rate}%)`,       value: `+${formatCurrency(totalInterest)}`, color: 'text-fin-blue' },
                  { label: 'Montante final',         value: formatCurrency(totalAmount),    color: 'text-white' },
                ].map(({ label, value, color }, i) => (
                  <div key={i} className={cn(
                    'flex items-center justify-between py-4',
                    i < 2 ? 'border-b border-white/[0.05]' : ''
                  )}>
                    <span className="metric-title">{label}</span>
                    <span className={cn('font-mono font-bold text-base', color)}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Parcela estimada — destaque visual */}
              <div className="mt-5 relative z-10">
                <p className="metric-title mb-3">Parcela Estimada</p>
                <div className="bg-black/40 rounded-2xl border border-white/[0.07] p-5 text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]">
                  <p className="font-mono text-4xl font-black text-white tracking-tighter leading-none mb-2">
                    {formatCurrency(installmentValue)}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-fin-blue uppercase tracking-[0.15em]">
                    <span>{count}x</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{FREQUENCY_LABELS[newLoan.payment_type] || newLoan.payment_type}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card de lucratividade — substitui a "Dica de Especialista" placeholder */}
            {capital > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-fin-emerald" />
                  <h4 className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Análise do Contrato
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Retorno sobre capital</span>
                    <span className="font-bold text-fin-emerald font-mono">{rate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Lucro estimado</span>
                    <span className="font-bold text-fin-emerald font-mono">+{formatCurrency(totalInterest)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Duração do contrato</span>
                    <span className="font-bold text-white font-mono">
                      {count} {FREQUENCY_LABELS[newLoan.payment_type]?.toLowerCase() || ''}s
                    </span>
                  </div>
                  {selectedClient && (
                    <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Score do cliente</span>
                      <span className={cn(
                        'font-bold font-mono',
                        selectedClient.score >= 70 ? 'text-fin-emerald' : selectedClient.score >= 40 ? 'text-fin-amber' : 'text-fin-rose'
                      )}>
                        {selectedClient.score}/100
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
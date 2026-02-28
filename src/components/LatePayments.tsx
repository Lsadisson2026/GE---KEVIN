import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '../utils';
import { Phone, MessageCircle, CheckCircle2, Clock, TrendingUp, AlertTriangle, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../supabaseClient';
import { RenegotiateModal } from './RenegotiateModal';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

interface LatePayment {
  clientId: number;
  clientName: string;
  clientPhone: string;
  totalPending: number;
  oldestDueDate: string;
  lastPaymentDate: string | null;
}

const FILTERS = [
  { value: 0,  label: 'Todos' },
  { value: 3,  label: '+3 dias' },
  { value: 7,  label: '+7 dias' },
  { value: 30, label: '+30 dias' },
];

/* Guard: retorna 0 para datas futuras (não há atraso negativo) */
const getDaysLate = (date: string): number => {
  const diff = new Date().getTime() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const getRiskLevel = (days: number): 'critical' | 'warning' | 'normal' => {
  if (days >= 30) return 'critical';
  if (days >= 7)  return 'warning';
  return 'normal';
};

export const LatePayments: React.FC = () => {
  const [latePayments, setLatePayments] = useState<LatePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<number>(0);
  const [renegotiateClient, setRenegotiateClient] = useState<any>(null);

  const fetchLate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('late_payments_summary').select('*');
      if (error) throw error;
      setLatePayments(data as LatePayment[]);
    } catch (err) {
      console.error('Error fetching late payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLate(); }, []);

  const handleRenegotiateClick = async (lp: LatePayment) => {
    try {
      const { data: loans, error } = await supabase
        .from('loans')
        .select(`id, capital, installments (amount, paid_amount, status, due_date)`)
        .eq('client_id', lp.clientId)
        .eq('status', 'ACTIVE');
      if (error) throw error;
      const pendingLoans = loans.map((loan: any) => ({
        id: loan.id,
        capital: loan.capital,
        pending: loan.installments
          .filter((i: any) => i.status !== 'PAID')
          .reduce((sum: number, i: any) => sum + (i.amount - i.paid_amount), 0),
      })).filter((l: any) => l.pending > 0);
      setRenegotiateClient({ client: { id: lp.clientId, name: lp.clientName }, pendingLoans });
    } catch (err) {
      alert('Erro ao carregar detalhes do empréstimo.');
    }
  };

  const sendWhatsApp = (lp: LatePayment) => {
    const days = getDaysLate(lp.oldestDueDate);
    const msg = `Olá ${lp.clientName}, notamos que seu pagamento está pendente há ${days} dias. Por favor, entre em contato para regularizar sua situação.`;
    window.open(`https://wa.me/${lp.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredLate = latePayments.filter(lp => {
    const days = getDaysLate(lp.oldestDueDate);
    return days >= filter;
  });

  /* Contadores para o header */
  const criticalCount = latePayments.filter(lp => getDaysLate(lp.oldestDueDate) >= 30).length;
  const warningCount  = latePayments.filter(lp => {
    const d = getDaysLate(lp.oldestDueDate);
    return d >= 7 && d < 30;
  }).length;

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-slate-500 font-medium">
      <div className="w-5 h-5 border-2 border-fin-blue/30 border-t-fin-blue rounded-full animate-spin mr-3" />
      Carregando inadimplentes...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Inadimplentes</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Gestão de risco e recuperação de crédito em atraso.
          </p>
        </div>

        {/* Indicadores de risco rápidos */}
        {latePayments.length > 0 && (
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-fin-rose/8 border border-fin-rose/20 rounded-xl">
                <Flame className="w-3.5 h-3.5 text-fin-rose" />
                <span className="text-xs font-bold text-fin-rose">{criticalCount} crítico{criticalCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-fin-amber/8 border border-fin-amber/20 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-fin-amber" />
                <span className="text-xs font-bold text-fin-amber">{warningCount} alerta{warningCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Filtros */}
      <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/[0.07] gap-1 w-fit">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300',
              filter === value
                ? 'bg-fin-blue/15 text-white border border-fin-blue/30 shadow-glow-blue'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {filteredLate.length === 0 ? (
          <div className="glass-panel p-16 text-center">
            <div className="w-16 h-16 bg-fin-emerald/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-fin-emerald/20">
              <CheckCircle2 className="w-8 h-8 text-fin-emerald" />
            </div>
            <h3 className="text-xl font-bold text-white">Carteira Saudável!</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
              Não há inadimplentes para o filtro selecionado.
            </p>
          </div>
        ) : (
          filteredLate.map((lp, i) => {
            const days = getDaysLate(lp.oldestDueDate);
            const risk = getRiskLevel(days);

            const riskConfig = {
              critical: {
                avatar: 'bg-fin-rose/15 text-fin-rose border-fin-rose/30',
                value:  'text-fin-rose',
                clock:  'text-fin-rose',
                card:   'shadow-glow-rose',
                accent: 'bg-fin-rose',
                icon:   <Flame className="w-3.5 h-3.5" />,
                label:  'Crítico',
                badge:  'bg-fin-rose/10 text-fin-rose border-fin-rose/20',
              },
              warning: {
                avatar: 'bg-fin-amber/15 text-fin-amber border-fin-amber/30',
                value:  'text-fin-amber',
                clock:  'text-fin-amber',
                card:   'shadow-glow-amber',
                accent: 'bg-fin-amber',
                icon:   <AlertTriangle className="w-3.5 h-3.5" />,
                label:  'Alerta',
                badge:  'bg-fin-amber/10 text-fin-amber border-fin-amber/20',
              },
              normal: {
                avatar: 'bg-white/[0.04] text-slate-300 border-white/10',
                value:  'text-white',
                clock:  'text-fin-blue',
                card:   'shadow-glow-blue',
                accent: 'bg-slate-600',
                icon:   <TrendingUp className="w-3.5 h-3.5" />,
                label:  'Leve',
                badge:  'bg-white/5 text-slate-400 border-white/10',
              },
            }[risk];

            return (
              <motion.div
                key={lp.clientId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                /* Removido scale — causa efeito travado em cards largos */
                whileHover={{ y: -3 }}
                className={cn(
                  'glass-panel p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6',
                  riskConfig.card
                )}
              >
                {/* Cliente */}
                <div className="flex items-center gap-4 lg:w-1/4 min-w-0">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border flex-shrink-0 transition-all duration-500',
                    riskConfig.avatar
                  )}>
                    {lp.clientName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold text-white tracking-tight truncate">{lp.clientName}</h4>
                      {/* Badge de risco inline — visível sem precisar ler os números */}
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border flex-shrink-0',
                        riskConfig.badge
                      )}>
                        {riskConfig.icon}
                        {riskConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <Phone className="w-3 h-3 text-fin-blue/40" /> {lp.clientPhone}
                    </p>
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-6 flex-1 lg:px-8 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/[0.06]">
                  <div>
                    <p className="metric-title mb-1">Dívida Total</p>
                    <p className={cn('font-mono text-xl font-black tracking-tighter', riskConfig.value)}>
                      {formatCurrency(lp.totalPending)}
                    </p>
                  </div>
                  <div>
                    <p className="metric-title mb-1">Dias em Atraso</p>
                    <div className="flex items-center gap-2">
                      <Clock className={cn('w-4 h-4', riskConfig.clock)} />
                      <p className="font-mono text-xl font-black text-white tracking-tighter">{days}</p>
                      <span className="text-xs text-slate-600 font-medium">dias</span>
                    </div>
                  </div>
                  <div>
                    <p className="metric-title mb-1">Última Atividade</p>
                    <p className="text-sm font-semibold text-slate-400">
                      {lp.lastPaymentDate ? formatDate(lp.lastPaymentDate) : 'Sem histórico'}
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleRenegotiateClick(lp)}
                    className="px-5 py-3.5 glow-button text-sm flex-1 lg:flex-none"
                  >
                    Renegociar
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => sendWhatsApp(lp)}
                    className="p-3.5 text-fin-blue bg-fin-blue/8 hover:bg-fin-blue/15 border border-fin-blue/20 rounded-xl transition-all"
                    title="Cobrar via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {renegotiateClient && (
        <RenegotiateModal
          client={renegotiateClient.client}
          pendingLoans={renegotiateClient.pendingLoans}
          onClose={() => setRenegotiateClient(null)}
          onSuccess={() => { setRenegotiateClient(null); fetchLate(); }}
        />
      )}
    </div>
  );
};
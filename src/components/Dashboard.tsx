import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardData } from '../types';
import { formatCurrency } from '../utils';
import {
  TrendingDown,
  Wallet,
  Users as UsersIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../supabaseClient';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

/* ── Tooltip customizado ── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0c]/95 border border-white/10 rounded-2xl px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className="text-lg font-black text-white">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

/* ── Stat Card ── */
const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
  delay?: number;
}> = ({ label, value, icon: Icon, accent, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0d0d10] p-6 flex flex-col gap-4 hover:border-white/[0.13] transition-all duration-500"
  >
    {/* Glow blob */}
    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-35 transition-opacity duration-700 ${accent}`} />

    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.04] relative z-10`}>
      <Icon className="w-4.5 h-4.5 text-slate-400 group-hover:text-white transition-colors" />
    </div>

    <div className="relative z-10">
      <p className="text-[10px] text-slate-500 uppercase tracking-[0.15em] font-bold mb-1.5">{label}</p>
      <p className="text-2xl font-black text-white tracking-tight leading-none">{value}</p>
    </div>

    {/* Bottom accent line */}
    <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700 ${accent} opacity-60`} />
  </motion.div>
);

export const Dashboard: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'1D' | '7D' | '30D'>('7D');

  const fetchChartData = async (days: number) => {
    try {
      const { data: flowData, error } = await supabase.rpc('get_cash_flow', { days });
      if (error) throw error;
      setChartData(
        flowData.map((d: any) => {
          const date = new Date(d.date);
          date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
          return {
            name: date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
            valor: d.received,
          };
        }).reverse()
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const daysMap = { '1D': 1, '7D': 7, '30D': 30 };
    fetchChartData(daysMap[timeRange]);
  }, [timeRange]);

  useEffect(() => {
    (async () => {
      try {
        const { data: s, error } = await supabase.from('dashboard_summary').select('*').single();
        if (error) throw error;
        setData({
          today: {
            expected: s.today_expected || 0,
            paid: s.today_paid || 0,
            late: s.total_late_amount || 0,
          },
          overview: {
            totalEmprestado: s.total_emprestado || 0,
            totalRecebido: s.total_recebido || 0,
            totalEmAberto: s.total_em_aberto || 0,
            lucroProjetado: s.lucro_projetado || 0,
            activeClients: s.active_clients || 0,
            lateClients: s.late_clients || 0,
            loanCount: s.loan_count || 0,
          },
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-slate-500">
      <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      <span className="text-sm font-medium tracking-wide">Carregando painel...</span>
    </div>
  );
  if (!data) return <div className="p-8 text-center text-red-400 text-sm">Erro ao carregar dados.</div>;

  const stats = [
    { label: 'Esperado Hoje',  value: formatCurrency(data.today.expected),           icon: Clock,         accent: 'bg-sky-400',     show: true     },
    { label: 'Recebido Hoje',  value: formatCurrency(data.today.paid),               icon: CheckCircle2,  accent: 'bg-emerald-400', show: true     },
    { label: 'Atrasado Hoje',  value: formatCurrency(data.today.late),               icon: AlertTriangle, accent: 'bg-red-500',     show: true     },
    { label: 'Capital na Rua', value: formatCurrency(data.overview.totalEmprestado), icon: Wallet,        accent: 'bg-amber-400',   show: isAdmin  },
  ].filter(s => s.show);

  const firstName = user?.name.split(' ')[0] ?? '';
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6 lg:space-y-8">

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <p className="text-[11px] text-slate-600 uppercase tracking-[0.2em] font-bold mb-1">{greeting}</p>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-none">
            {firstName}
            <span className="text-red-500">.</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Online</span>
          </div>

          {/* Date pill */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <Activity className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
      </motion.header>

      {/* ── Hero Card + Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">

        {/* Hero — Lucro Projetado */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-7 relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0d0d10] p-8 lg:p-10 min-h-[280px] flex flex-col justify-between"
        >
          {/* Atmospheric glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/[0.12] blur-[100px] -mr-20 -mt-20 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-40 bg-red-900/[0.08] blur-[80px] rounded-full pointer-events-none" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07]">
                <Zap className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lucro Projetado</span>
              </div>
              <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-black text-emerald-400">+12.5%</span>
              </div>
            </div>

            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                className="text-4xl lg:text-6xl font-black text-white tracking-tighter leading-none"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatCurrency(data.overview.lucroProjetado)}
              </motion.h2>
            </div>

            <p className="text-xs text-slate-600 font-medium mt-3 max-w-xs leading-relaxed">
              Baseado em contratos ativos e juros acumulados
            </p>
          </div>

          {/* Footer metrics */}
          <div className="relative z-10 flex flex-wrap items-center gap-6 pt-6 mt-6 border-t border-white/[0.05]">
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Clientes</p>
              <p className="text-xl font-black text-white">{data.overview.activeClients}</p>
            </div>
            <div className="w-px h-8 bg-white/[0.07]" />
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Contratos</p>
              <p className="text-xl font-black text-white">{data.overview.loanCount}</p>
            </div>
            <div className="w-px h-8 bg-white/[0.07]" />
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Em Aberto</p>
              <p className="text-xl font-black text-white">{formatCurrency(data.overview.totalEmAberto)}</p>
            </div>

            {/* Avatar stack */}
            <div className="ml-auto flex -space-x-2.5">
              {Array.from({ length: Math.min(4, data.overview.activeClients) }, (_, i) => (
                <div key={i}
                  className="w-8 h-8 rounded-full border-2 border-[#0d0d10] flex items-center justify-center text-[10px] font-black text-white"
                  style={{ background: `hsl(${i * 40 + 0}, 70%, 40%)` }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              {data.overview.activeClients > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-[#0d0d10] bg-red-500/20 flex items-center justify-center text-[9px] font-black text-red-400">
                  +{data.overview.activeClients - 4}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stat Cards grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4 lg:gap-5">
          {stats.map((s, i) => (
            <StatCard key={s.label} {...s} delay={0.1 + i * 0.08} />
          ))}
        </div>
      </div>

      {/* ── Chart + Health (admin only) ── */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

          {/* Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-2 rounded-3xl border border-white/[0.07] bg-[#0d0d10] p-7"
          >
            <div className="flex items-center justify-between mb-7">
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">Fluxo de Caixa</h3>
                <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-widest font-bold">
                  {timeRange === '1D' ? 'Últimas 24h' : timeRange === '7D' ? 'Últimos 7 dias' : 'Últimos 30 dias'}
                </p>
              </div>
              <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {(['1D', '7D', '30D'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={cn(
                      'px-3.5 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all duration-200',
                      timeRange === r
                        ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                        : 'text-slate-600 hover:text-slate-400'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#334155', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fill="url(#redGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#ef4444', stroke: '#0d0d10', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Portfolio Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-3xl border border-white/[0.07] bg-[#0d0d10] p-7 flex flex-col"
          >
            <h3 className="text-sm font-black text-white tracking-tight mb-6">Saúde da Carteira</h3>

            <div className="space-y-3 flex-1">
              {[
                {
                  label: 'Inadimplência',
                  value: `${data.overview.lateClients} clientes`,
                  icon: TrendingDown,
                  color: 'text-red-400',
                  bg: 'bg-red-500/8',
                  border: 'border-red-500/15',
                  hoverColor: 'group-hover:text-red-400',
                },
                {
                  label: 'Base Ativa',
                  value: `${data.overview.activeClients} clientes`,
                  icon: UsersIcon,
                  color: 'text-sky-400',
                  bg: 'bg-sky-500/8',
                  border: 'border-sky-500/15',
                  hoverColor: 'group-hover:text-sky-400',
                },
              ].map(item => (
                <motion.div
                  key={item.label}
                  whileHover={{ x: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'group flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-300',
                    item.bg, item.border,
                    'hover:brightness-110'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center bg-black/30')}>
                      <item.icon className={cn('w-4 h-4', item.color)} />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{item.label}</p>
                      <p className="text-sm font-black text-white mt-0.5">{item.value}</p>
                    </div>
                  </div>
                  <ArrowUpRight className={cn('w-4 h-4 text-slate-700 transition-all', item.hoverColor, 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5')} />
                </motion.div>
              ))}
            </div>

            {/* Taxa de inadimplência */}
            <div className="mt-5 pt-5 border-t border-white/[0.05]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Taxa de Inadimplência</span>
                <span className="text-xs font-black text-white">
                  {data.overview.activeClients > 0
                    ? ((data.overview.lateClients / data.overview.activeClients) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: data.overview.activeClients > 0
                      ? `${(data.overview.lateClients / data.overview.activeClients) * 100}%`
                      : '0%'
                  }}
                  transition={{ delay: 0.6, duration: 1, ease: [0.23, 1, 0.32, 1] }}
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
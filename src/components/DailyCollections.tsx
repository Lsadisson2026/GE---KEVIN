import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '../utils';
import { Phone, MessageCircle, CheckCircle, XCircle, DollarSign, FileDown, CalendarClock, MapPin, Wallet, Landmark, Banknote, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCollectionsPDF } from '../services/pdfService';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

interface Collection {
  installmentId: number;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  pending_value: number;
  paid_amount: number;
  due_date: string;
  installmentStatus: string;
  payment_method: string;
  loanCapital: number;
  loanDebt: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const DailyCollections: React.FC = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CASH'>('PIX');
  const [exporting, setExporting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [clientDetails, setClientDetails] = useState<{ totalLoaned: number; totalDebt: number } | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_collection_list')
        .select('*')
        .neq('status', 'PAID');
      if (error) throw error;
      setCollections((data || []).map((item: any) => ({
        installmentId: item.installment_id,
        clientName: item.client_name,
        clientPhone: item.client_phone,
        clientAddress: item.client_address,
        pending_value: item.pending_value,
        paid_amount: item.paid_amount || 0,
        due_date: item.due_date,
        installmentStatus: item.status,
        payment_method: item.payment_method,
        loanCapital: item.loan_capital || 0,
        loanDebt: item.loan_debt || 0,
      })));
    } catch (err) {
      console.error('Erro ao buscar cobranças:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  useEffect(() => {
    if (!selectedCollection) { setClientDetails(null); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('clients_summary')
          .select('totalLoaned, totalDebt')
          .eq('name', selectedCollection.clientName)
          .single();
        if (error) throw error;
        setClientDetails({ totalLoaned: data.totalLoaned, totalDebt: data.totalDebt });
      } catch {
        setClientDetails({ totalLoaned: selectedCollection.loanCapital, totalDebt: selectedCollection.loanDebt });
      }
    })();
  }, [selectedCollection]);

  const handlePayment = async (type: 'FULL' | 'PARTIAL' | 'INTEREST') => {
    if (!selectedCollection || !user) return;
    const amount = type === 'FULL' ? selectedCollection.pending_value : parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    setPaying(true);
    try {
      const { error } = await supabase.rpc('register_payment_final', {
        payload: {
          p_installment_id: selectedCollection.installmentId,
          p_amount: amount,
          p_type: type,
          p_method: paymentMethod,
          p_created_by: user.id,
        },
      });
      if (error) throw error;
      setSelectedCollection(null);
      setPaymentAmount('');
      try { await fetchCollections(); } catch { /* ignora erros secundários */ }
    } catch (err: any) {
      alert('Erro ao registrar pagamento: ' + (err.message || 'Erro de conexão'));
    } finally {
      setPaying(false);
    }
  };

  const sendWhatsApp = (c: Collection) => {
    const msg = `Olá ${c.clientName}, passando para lembrar do seu pagamento de hoje. Qualquer dúvida estou à disposição!`;
    window.open(`https://wa.me/${c.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleExportPDF = async () => {
    if (!collections.length) return;
    setExporting(true);
    try { await generateCollectionsPDF(collections); }
    catch { alert('Erro ao gerar o PDF de cobranças.'); }
    finally { setExporting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-slate-500 font-medium">
      <div className="w-5 h-5 border-2 border-fin-blue/30 border-t-fin-blue rounded-full animate-spin mr-3" />
      Carregando cobranças...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Cobranças do Dia</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Vencimentos para hoje, {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={exporting || collections.length === 0}
            className="px-5 py-3 glass-button text-sm disabled:opacity-40"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'Gerando...' : 'Exportar PDF'}
          </button>
          <div className="bg-fin-blue/10 text-fin-blue px-4 py-2.5 rounded-xl font-bold text-sm border border-fin-blue/20">
            {collections.length} pendente{collections.length !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      {/* Lista */}
      <div className="space-y-4">
        {collections.length === 0 ? (
          <div className="glass-panel p-16 text-center">
            <div className="w-16 h-16 bg-fin-emerald/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-fin-emerald/20">
              <CheckCircle className="w-8 h-8 text-fin-emerald" />
            </div>
            <h3 className="text-xl font-bold text-white">Tudo em dia!</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
              Não há cobranças pendentes para hoje. Excelente trabalho!
            </p>
          </div>
        ) : (
          collections.map((item, i) => (
            <motion.div
              key={item.installmentId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              /* 
                Removido scale no hover — em cards grandes causa efeito "travado".
                Só y: -3 é suficiente e mais suave em mobile.
              */
              whileHover={{ y: -3 }}
              className="glass-panel p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-glow-blue"
            >
              {/* Info do cliente */}
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-fin-blue/10 border border-fin-blue/20 flex items-center justify-center font-black text-fin-blue text-lg flex-shrink-0">
                  {item.clientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h4 className="font-bold text-white tracking-tight truncate">{item.clientName}</h4>
                    <span className="badge badge-info text-[9px]">{item.payment_method}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-fin-blue/50" /> {item.clientPhone}
                    </span>
                    {item.clientAddress && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-600" /> {item.clientAddress}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-fin-blue/50" /> Vence hoje
                    </span>
                  </div>
                </div>
              </div>

              {/* 
                Valor pendente — no mobile fica acima das ações (sem border-l que sumia).
                No desktop mantém o separador lateral.
              */}
              <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center
                              pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/[0.06]
                              lg:px-8 gap-2">
                <p className="metric-title">Valor Pendente</p>
                <p className="font-mono text-2xl font-bold text-white tracking-tighter">
                  {formatBRL(item.pending_value)}
                </p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => sendWhatsApp(item)}
                  className="p-3.5 text-fin-blue bg-fin-blue/8 hover:bg-fin-blue/15 border border-fin-blue/20 rounded-xl transition-all"
                  title="Enviar WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedCollection(item)}
                  className="px-6 py-3.5 glow-button text-sm"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Receber</span>
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ── Modal de pagamento ───────────────────────────── */}
      <AnimatePresence>
        {selectedCollection && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
            onClick={(e) => e.target === e.currentTarget && setSelectedCollection(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="glass-panel-modal w-full max-w-md flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="px-7 py-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-fin-blue/10 border border-fin-blue/20 flex items-center justify-center font-black text-fin-blue text-sm">
                    {selectedCollection.clientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Registrar Recebimento</h3>
                    <p className="text-xs text-slate-500">{selectedCollection.clientName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="px-7 py-6 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Resumo financeiro */}
                <div className="bg-white/[0.025] rounded-2xl border border-white/[0.06] p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="metric-title mb-1">Capital Emprestado</p>
                      <p className="text-sm font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                        <Wallet className="w-3.5 h-3.5 text-fin-emerald/50 flex-shrink-0" />
                        {formatBRL(clientDetails?.totalLoaned || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="metric-title mb-1">Dívida Total</p>
                      <p className="text-sm font-bold text-slate-300 flex items-center justify-end gap-1.5 font-mono">
                        <Landmark className="w-3.5 h-3.5 text-fin-rose/50 flex-shrink-0" />
                        {formatBRL(clientDetails?.totalDebt || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="divider" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="metric-title mb-1">Valor do Contrato</p>
                      <p className="text-sm font-semibold text-slate-400 font-mono">
                        {formatBRL(selectedCollection.pending_value + selectedCollection.paid_amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="metric-title mb-1">Saldo Devedor</p>
                      <p className="text-xl font-black text-fin-blue font-mono tracking-tighter"
                        style={{ textShadow: '0 0 12px rgba(239,68,68,0.3)' }}>
                        {formatBRL(selectedCollection.pending_value)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Método de pagamento */}
                <div>
                  <label className="block metric-title mb-3">Método de Pagamento</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['PIX', 'CASH'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={cn(
                          'py-3.5 rounded-xl font-bold text-sm border transition-all duration-300 flex items-center justify-center gap-2',
                          paymentMethod === m
                            ? 'border-fin-blue/40 bg-fin-blue/15 text-white shadow-glow-blue'
                            : 'border-white/[0.06] text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                        )}
                      >
                        {m === 'PIX'
                          ? <><Smartphone className="w-4 h-4" /> PIX</>
                          : <><Banknote className="w-4 h-4" /> Espécie</>
                        }
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valor personalizado */}
                <div>
                  <label className="block metric-title mb-3">Valor Personalizado</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-fin-blue transition-colors" />
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-black/40 border border-white/[0.08] rounded-xl outline-none
                        focus:border-fin-blue/40 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.07)]
                        text-white font-mono font-bold text-lg placeholder:text-slate-700
                        transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Ações de pagamento */}
              <div className="px-7 py-5 border-t border-white/[0.06] space-y-3 shrink-0">
                <button
                  onClick={() => handlePayment('FULL')}
                  disabled={paying}
                  className="w-full py-4 glow-button disabled:opacity-50"
                >
                  {paying ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processando...</>
                  ) : (
                    <><DollarSign className="w-4 h-4" /> Quitação Integral — {formatBRL(selectedCollection.pending_value)}</>
                  )}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePayment('PARTIAL')}
                    disabled={paying}
                    className="py-3.5 glass-button text-xs uppercase tracking-widest font-bold disabled:opacity-40"
                  >
                    Parcial
                  </button>
                  <button
                    onClick={() => handlePayment('INTEREST')}
                    disabled={paying}
                    className="py-3.5 glass-button text-xs uppercase tracking-widest font-bold disabled:opacity-40"
                  >
                    Só Juros
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
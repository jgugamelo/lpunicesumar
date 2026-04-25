import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, MessageCircle, Headphones, Loader2, ArrowRight, GraduationCap, MapPin, ArrowLeft } from 'lucide-react';
import { processLeadSubmission, getWhatsAppLink } from '../lib/leadUtils';
import { supabase } from '../lib/supabase';

interface SecondaryEnrollmentCTAProps {
  selectedCourse: any;
  pricingData: any;
  leadData: any;
  setLeadData: (data: any) => void;
  onLeadSuccess?: () => void;
}

export function SecondaryEnrollmentCTA({ 
  selectedCourse, 
  pricingData, 
  leadData, 
  setLeadData,
  onLeadSuccess 
}: SecondaryEnrollmentCTAProps) {
  const [step, setStep] = useState(1); // 1: CTA, 2: Form, 3: Success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbLeadId, setDbLeadId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [onlineConsultants, setOnlineConsultants] = useState(0);

  // Sync online consultants
  useEffect(() => {
    const channel = supabase.channel('online-consultants-secondary');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let count = 0;
        for (const key in state) {
          if (key !== 'lead') {
            const presences = state[key] as any[];
            count += presences.length;
          }
        }
        setOnlineConsultants(count);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!selectedCourse || !pricingData || pricingData.loading) return null;

  const preco = pricingData.preco;
  if (!preco || preco._fallback) return null;

  const nmCurso = selectedCourse.nmCurso;
  const isStep2Valid = leadData.nome.length > 2 && leadData.whatsapp.replace(/\D/g, '').length >= 10 && /\S+@\S+\.\S+/.test(leadData.email);

  const maskPhone = (v: string) => {
    let r = v.replace(/\D/g, '').slice(0, 11);
    if (r.length > 10) return r.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (r.length > 6) return r.replace(/^(\d{2})(\d{4})(\d*)$/, '($1) $2-$3');
    if (r.length > 2) return r.replace(/^(\d{2})(\d*)$/, '($1) $2');
    if (r.length > 0) return '(' + r;
    return r;
  };

  const handleCTAConfirm = () => {
    setStep(2);
    // Smooth scroll partially if needed, but the user said "na própria seção"
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const leadId = await processLeadSubmission({
        lead: leadData,
        idCurso: selectedCourse.idCurso,
        nmCurso: nmCurso,
        idPolo: pricingData.idPolo,
        nmPolo: pricingData.polo?.nmPolo,
        tipoCurso: pricingData.tipo,
        preco: { vlPrimeira: preco.vlPrimeira, vlDemais: preco.vlDemais }
      });

      if (leadId) {
        setDbLeadId(leadId);
        const { data: previousChat } = await supabase.from('chats').select('id').eq('lead_id', leadId).single();
        if (previousChat) setActiveChatId(previousChat.id);
      }

      setStep(3);
      if (onLeadSuccess) onLeadSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppClick = () => {
    const origin = new URLSearchParams(window.location.search).get('utm_source') || 'direto';
    const link = getWhatsAppLink({
      lead: leadData,
      idCurso: selectedCourse.idCurso,
      nmCurso: nmCurso,
      preco: preco,
      origin
    });
    window.open(link, '_blank');
  };

  const formatBRL = (val: number) => 'R$ ' + parseFloat(String(val)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="w-full max-w-[1000px] mx-auto px-4 md:px-8 mb-24">
      <div className="bg-white rounded-[32px] shadow-[0_20px_50px_-15px_rgba(0,59,92,0.1)] border border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#fdb913]/5 rounded-full blur-3xl -z-10"></div>
        
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-16"
            >
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-[#003B5C] px-4 py-2 rounded-full font-bold text-[12px] uppercase tracking-wider mb-6">
                  <span className="text-amber-500">🔥</span> Vagas Limitadas no RJ
                </div>
                <h2 className="text-[32px] md:text-[42px] font-black text-[#003B5C] leading-[1.1] mb-4 tracking-tight">
                  Garanta sua vaga em <br className="hidden md:block" />
                  <span className="text-[#fdb913]">{nmCurso}</span>
                </h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-8">
                  <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                    <CheckCircle2 size={18} className="text-green-500" /> Nota 5 MEC
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                    <CheckCircle2 size={18} className="text-green-500" /> Material Incluso
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                    <MapPin size={18} className="text-blue-500" /> RJ
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[380px] bg-[#F8FAFC] rounded-[24px] p-8 border border-gray-100 shadow-inner">
                <div className="flex flex-col gap-6 mb-8">
                   <div className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">A partir de</span>
                     <span className="text-[#003B5C] font-black text-[32px] tracking-tighter">{formatBRL(preco.vlPrimeira)}</span>
                   </div>
                   <div className="h-[1px] bg-gray-200"></div>
                   <div className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Demais mensalidades</span>
                     <span className="text-[#003B5C] font-black text-[24px] tracking-tighter">{formatBRL(preco.vlDemais)}</span>
                   </div>
                </div>
                
                <button 
                  onClick={handleCTAConfirm}
                  className="w-full bg-[#fdb913] text-[#003B5C] font-black text-[18px] uppercase tracking-widest py-5 rounded-2xl hover:bg-yellow-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  EU QUERO!
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 md:p-12"
            >
              <div className="max-w-2xl mx-auto text-center mb-10">
                <button onClick={() => setStep(1)} className="text-gray-400 hover:text-[#003B5C] font-bold text-sm flex items-center gap-2 mb-4 mx-auto transition-colors">
                  <ArrowLeft size={16} /> Voltar para a oferta
                </button>
                <h2 className="text-[28px] md:text-[36px] font-black text-[#003B5C] mb-2">Quase lá! Nome e WhatsApp</h2>
                <p className="text-gray-500 font-medium">Preencha abaixo para garantir a condição exclusiva no RJ.</p>
              </div>

              <div className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5 text-left">
                  <label className="block text-[11px] font-bold text-[#004b8d] uppercase tracking-wider ml-1">Nome completo</label>
                  <input
                    type="text" value={leadData.nome} onChange={e => setLeadData({ ...leadData, nome: e.target.value })}
                    placeholder="Seu nome"
                    className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#fdb913] focus:ring-4 focus:ring-[#fdb913]/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="block text-[11px] font-bold text-[#004b8d] uppercase tracking-wider ml-1">WhatsApp</label>
                  <input
                    type="tel" value={leadData.whatsapp} onChange={e => setLeadData({ ...leadData, whatsapp: maskPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#fdb913] focus:ring-4 focus:ring-[#fdb913]/10 transition-all"
                  />
                </div>
              </div>
              
              <div className="max-w-xl mx-auto space-y-1.5 text-left mb-8">
                <label className="block text-[11px] font-bold text-[#004b8d] uppercase tracking-wider ml-1">E-mail</label>
                <input
                  type="email" value={leadData.email} onChange={e => setLeadData({ ...leadData, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#fdb913] focus:ring-4 focus:ring-[#fdb913]/10 transition-all"
                />
              </div>

              <div className="max-w-xl mx-auto">
                <button
                  disabled={!isStep2Valid || isSubmitting}
                  onClick={handleSubmit}
                  className="w-full bg-[#fdb913] text-[#003B5C] font-black text-[18px] uppercase tracking-widest py-5 rounded-2xl hover:bg-yellow-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0 shadow-sm"
                >
                  {isSubmitting ? <><Loader2 size={24} className="animate-spin" /> Processando...</> : 'Confirmar Interesse'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={44} />
              </div>
              <h2 className="text-[32px] font-black text-[#003B5C] mb-4">Inscrição Garantida!</h2>
              <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10">
                O {nmCurso} é o seu próximo passo para o sucesso. Nosso time de consultores entrará em contato em breve.
              </p>

              <div className="max-w-sm mx-auto flex flex-col gap-3">
                <button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-green-500 text-white font-black py-5 rounded-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
                >
                  <MessageCircle size={24} />
                  FALAR VIA WHATSAPP
                </button>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-2">{onlineConsultants > 0 ? 'Consultores Online Agora' : 'Atendimento por ordem de chegada'}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

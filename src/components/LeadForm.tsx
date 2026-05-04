import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fetchCursos, fetchEstados, fetchPolos, fetchPreco } from '../lib/api';
import { ArrowRight, CheckCircle2, MessageCircle, AlertCircle, Loader2, ArrowLeft, Headphones, MapPin, Paperclip, Mic, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { processLeadSubmission, getWhatsAppLink } from '../lib/leadUtils';

// ==========================================
// CONFIGURAÇÕES INTERNAS DO SISTEMA
// ==========================================
const CONFIG = {
  // Preencha com o nome/sigla do Estado e Polo para pré-selecionar
  // Para deixar livre, deixe em branco: ''
  ESTADO_PADRAO: 'RJ',
  POLO_PADRAO: 'DUQUE DE CAXIAS - 25 DE AGOSTO',

  // Ocultar esses campos da interface para o usuário? (Comportamento de "trava" total)
  // Se false, ele preenche sozinho mas o usuário ainda vê e pode tentar trocar
  OCULTAR_SELECAO_POLO: true
};
// ==========================================

interface LeadFormProps {
  onCourseSelect: (course: any) => void;
  onLeadSuccess: () => void;
  onPricingUpdate: (data: any) => void;
  leadData: any;
  setLeadData: (data: any) => void;
}

export function LeadForm({ onCourseSelect, onLeadSuccess, onPricingUpdate, leadData, setLeadData }: LeadFormProps) {
  const [step, setStep] = useState(1);

  // Cache and data
  const [cursosCache, setCursosCache] = useState<any[]>([]);
  const [filteredCursos, setFilteredCursos] = useState<any[]>([]);
  const [estados, setEstados] = useState<any[]>([]);
  const [polos, setPolos] = useState<any[]>([]);
  const [preco, setPreco] = useState<any | null>(null);
  const [loadingPreco, setLoadingPreco] = useState(false);

  // Form State
  const [tipoCurso, setTipoCurso] = useState('');
  const [searchPos, setSearchPos] = useState('');    // Busca por texto (só Pós)
  const [idCurso, setIdCurso] = useState('');
  const [idEstado, setIdEstado] = useState('');
  const [idPolo, setIdPolo] = useState('');

  const lead = leadData;
  const setLead = setLeadData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onlineConsultants, setOnlineConsultants] = useState(0);
  const [showChatModal, setShowChatModal] = useState(false);
  const [dbLeadId, setDbLeadId] = useState<string | null>(null);
  
  // Realtime Chat internal states
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>('Consultor');
  
  // Prompt de E-mail Recuperação
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [promptEmail, setPromptEmail] = useState('');
  const [promptError, setPromptError] = useState('');
  
  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<any>(null);

  // Recupera Lead ID do localStorage se houver (persiste em refresh)
  useEffect(() => {
    const saved = localStorage.getItem('unicesumar_lead_id');
    if (saved) setDbLeadId(saved);
  }, []);

  // Quando o Lead ID é setado, salvar
  useEffect(() => {
    if (dbLeadId) {
      localStorage.setItem('unicesumar_lead_id', dbLeadId);
    }
  }, [dbLeadId]);

  // Recupera Chat ID do localStorage
  useEffect(() => {
    const savedChat = localStorage.getItem('unicesumar_active_chat_id');
    if (savedChat) setActiveChatId(savedChat);
  }, []);

  // Quando o Chat ID muda, salvar e buscar mensagens
  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('unicesumar_active_chat_id', activeChatId);
      supabase.from('messages').select('*').eq('chat_id', activeChatId).order('created_at', { ascending: true })
        .then(({data}) => {
          if (data && data.length > 0) setChatMessages(data);
        });
      // Busca nome do consultor se já estiver no chat
      supabase.from('chats').select('consultants(nome)').eq('id', activeChatId).single()
        .then(({data}: any) => {
          if (data?.consultants?.nome) setAgentName(data.consultants.nome);
        });
    }
  }, [activeChatId]);

  // Auto-scroll das mensagens do chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, showChatModal]);

  // Listener Realtime para Novas Mensagens do Chat Ativo
  useEffect(() => {
    if (!activeChatId) return;
    const ch = supabase.channel(`public:messages:chat_id=eq.${activeChatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}` }, payload => {
        setChatMessages(prev => {
          // Evitar inserção duplicada por conta da nossa inserção Otimista
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();
      
    return () => { supabase.removeChannel(ch); };
  }, [activeChatId]);

  // Listener para saber quando o Consultor entra no Chat (update na tabela chats)
  useEffect(() => {
    if (!activeChatId) return;
    const chStatus = supabase.channel(`chat_status_${activeChatId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${activeChatId}` }, payload => {
        if (payload.new.consultant_id) {
          supabase.from('consultants').select('nome').eq('id', payload.new.consultant_id).single()
            .then(({data}) => {
              if (data?.nome) setAgentName(data.nome);
            });
        }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(chStatus); };
  }, [activeChatId]);

  const handleStartChat = async (overrideId?: string, overrideLead?: any) => {
    const currentLeadId = overrideId || dbLeadId;
    const currentLeadData = overrideLead || lead;

    if (!currentLeadId) {
      setChatError("Falha ao recuperar seu cadastro. Por favor, tente enviar os dados novamente.");
      setShowChatModal(true);
      return;
    }

    setShowChatModal(true);
    setChatError(null);

    // Salva preferência no banco
    supabase.from('leads').update({ contato_preferencia: 'chat' }).eq('id', currentLeadId).then();
    
    // Inicia Sessão Múltipla com prevenção
    try {
      const { data: existingChat } = await supabase.from('chats').select('id, consultants(nome)').eq('lead_id', currentLeadId).single();
      
      if (existingChat) {
         setActiveChatId(existingChat.id);
         return; 
      }

      const { data, error } = await supabase.from('chats').insert([{ lead_id: currentLeadId }]).select('*, consultants(nome)').single();
      
      if (error) {
        console.error('Chat error:', error);
        setChatError("Erro de servidor ao conectar. Verifique as permissões de banco.");
        return;
      }

      if (data) {
        setActiveChatId(data.id);
        const agentName = data.consultants?.nome || 'Consultor';
        
        let nmCursoSelecionado = 'curso';
        if (!overrideLead) {
           nmCursoSelecionado = filteredCursos.find(c => String(c.idCurso) === String(idCurso))?.nmCurso || 'curso';
        } else {
           nmCursoSelecionado = cursosCache.find(c => String(c.idCurso) === String(overrideLead.id_curso))?.nmCurso || 'curso do seu interesse';
        }
        
        const welcomeContent = `Olá ${currentLeadData.nome.split(' ')[0] || 'Aluno'}! Eu sou o ${agentName}. Vi que você tem interesse no curso de ${nmCursoSelecionado}. Como posso te ajudar a garantir essa bolsa hoje?`;
        
        setChatMessages([{ id: 'system-1', sender_type: 'consultant', content: welcomeContent }]);
        supabase.from('messages').insert([{ chat_id: data.id, sender_type: 'consultant', content: welcomeContent }]).then();
      }
    } catch (err) {
      setChatError("Falha na conexão.");
    }
  };

  const onAcessarAtendimentoClick = () => {
    if (activeChatId) {
       setShowChatModal(true);
    } else {
       setShowEmailPrompt(true);
    }
  };

  const handleRecoverChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromptError('');
    setIsSubmitting(true);
    try {
      const { data } = await supabase.from('leads').select('*').ilike('email', promptEmail);
      if (data && data.length > 0) {
         const recoveredLead = data[0];
         setDbLeadId(recoveredLead.id);
         setLead(prev => ({ ...prev, nome: recoveredLead.nome, email: recoveredLead.email, whatsapp: recoveredLead.whatsapp }));
         setIdCurso(recoveredLead.id_curso || '');
         
         setShowEmailPrompt(false);
         await handleStartChat(recoveredLead.id, recoveredLead);
      } else {
         setPromptError("E-mail não encontrado. Por favor, preencha o formulário à esquerda para iniciar seu atendimento.");
      }
    } catch(err) {
       console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (dbLeadId) {
      supabase.from('leads').update({ contato_preferencia: 'whatsapp' }).eq('id', dbLeadId).then();
    }
    
    const nmCurso = filteredCursos.find(c => String(c.idCurso) === String(idCurso))?.nmCurso || 'um de seus cursos';
    const origin = new URLSearchParams(window.location.search).get('utm_source') || 'direto';

    const link = getWhatsAppLink({
      lead,
      idCurso,
      nmCurso,
      preco: preco || undefined,
      origin
    });

    window.open(link, '_blank');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && audioChunksRef.current !== null) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (!audioChunksRef.current || audioChunksRef.current.length === 0) return; // cancelled

        const type = mediaRecorder.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        
        const audioBlob = new Blob(audioChunksRef.current, { type });
        const file = new File([audioBlob], `audio_${Date.now()}.${ext}`, { type });
        
        const mockEvent = { target: { files: [file] } } as any;
        await handleMediaUpload(mockEvent);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Permissão de microfone negada ou não suportada no seu navegador.');
    }
  };

  const stopRecording = (discard = false) => {
    if (mediaRecorderRef.current && isRecording) {
      if (discard) audioChunksRef.current = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !activeChatId) return;
    
    const content = chatInput.trim();
    setChatInput(''); // limpa UI rápido
    
    const optId = `temp-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: optId, chat_id: activeChatId, sender_type: 'lead', content, created_at: new Date().toISOString() }]);
    
    const { data } = await supabase.from('messages').insert([{ chat_id: activeChatId, sender_type: 'lead', content }]).select('id').single();
    
    // Atualiza o ID fake pelo de verdade
    if (data) {
       setChatMessages(prev => prev.map(m => m.id === optId ? { ...m, id: data.id } : m));
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${activeChatId}/${fileName}`;
    
    // Placeholder pendente
    const optId = `temp-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: optId, chat_id: activeChatId, sender_type: 'lead', content: 'Enviando arquivo...', created_at: new Date().toISOString() }]);

    const { data, error } = await supabase.storage.from('chat_media').upload(filePath, file);
    if (!error) {
      const { data: publicData } = supabase.storage.from('chat_media').getPublicUrl(filePath);
      let mediaType = file.type.startsWith('image/') ? 'image' : 'audio';
      if (file.type.startsWith('video/')) mediaType = 'video';

      const { data: newMsg } = await supabase.from('messages').insert({
        chat_id: activeChatId,
        sender_type: 'lead',
        content: `Arquivo: ${file.name}`,
        media_url: publicData.publicUrl,
        media_type: mediaType
      }).select().single();

      if (newMsg) {
         setChatMessages(prev => prev.map(m => m.id === optId ? newMsg : m));
      }
    } else {
      setChatMessages(prev => prev.filter(m => m.id !== optId));
      alert('Erro ao enviar arquivo: ' + error.message);
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (step === 3) {
      const channel = supabase.channel('consultants_status', {
        config: { presence: { key: 'lead' } },
      });
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          let count = 0;
          for (const key in state) {
            if (key !== 'lead') count += state[key].length; // Ignora outros leads
          }
          setOnlineConsultants(count);
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [step]);

  // Load Initial Courses
  useEffect(() => {
    fetchCursos().then(data => {
      setCursosCache(data || []);
    }).catch(err => console.error(err));
  }, []);

  // Handle Tipo change
  useEffect(() => {
    setIdCurso('');
    setIdEstado('');
    setIdPolo('');
    setSearchPos('');
    if (tipoCurso && cursosCache.length > 0) {
      const all = cursosCache.filter(c => c.idCurso && c.idCurso.startsWith(tipoCurso + '_'));
      const filtered = all.sort((a, b) => a.nmCurso.localeCompare(b.nmCurso, 'pt-BR'));
      setFilteredCursos(filtered);
    } else {
      setFilteredCursos([]);
    }
  }, [tipoCurso, cursosCache]);

  // Busca por texto nos cursos de Pós-Graduação
  useEffect(() => {
    if (tipoCurso !== 'EPOS') return;
    setIdCurso('');
    let pool = cursosCache.filter(c => c.idCurso && c.idCurso.startsWith('EPOS_'));
    if (searchPos.trim()) {
      const q = searchPos.toLowerCase().trim();
      pool = pool.filter(c => c.nmCurso?.toLowerCase().includes(q));
    }
    setFilteredCursos(pool.sort((a, b) => a.nmCurso.localeCompare(b.nmCurso, 'pt-BR')));
  }, [searchPos]);

  // Handle Curso change
  useEffect(() => {
    setIdEstado('');
    setIdPolo('');
    if (idCurso) {
      const course = cursosCache.find(c => c.idCurso === idCurso);
      onCourseSelect(course); // Pass up to App to show details
      fetchEstados(idCurso).then(data => {
        const estadosRes = data || [];
        setEstados(estadosRes);
        // Autoselect State
        if (CONFIG.ESTADO_PADRAO) {
          const est = estadosRes.find((e: any) =>
            e.nmEstado.toUpperCase() === CONFIG.ESTADO_PADRAO.toUpperCase() ||
            (e.sgEstado && e.sgEstado.toUpperCase() === CONFIG.ESTADO_PADRAO.toUpperCase())
          );
          if (est) setIdEstado(String(est.idEstado));
        }
      }).catch(console.error);
    } else {
      onCourseSelect(null);
      setEstados([]);
    }
  }, [idCurso]);

  // Handle Estado change
  useEffect(() => {
    setIdPolo('');
    if (idCurso && idEstado) {
      fetchPolos(idCurso, idEstado).then(data => {
        const polosRes = data || [];
        setPolos(polosRes);
        console.log(`[LeadForm] ${polosRes.length} polos encontrados no estado.`);
        
        // Autoselect Polo - Busca mais flexível (parcial ou exata)
        if (CONFIG.POLO_PADRAO) {
          const searchName = CONFIG.POLO_PADRAO.toUpperCase();
          const pol = polosRes.find((p: any) => {
            const poloName = (p.nmPolo || '').toUpperCase();
            return poloName === searchName || poloName.includes('25 DE AGOSTO') || poloName.includes('DUQUE DE CAXIAS');
          });
          
          if (pol) {
            console.log(`[LeadForm] Polo auto-selecionado: ${pol.nmPolo} (ID: ${pol.idPolo})`);
            setIdPolo(String(pol.idPolo));
          } else {
            console.warn(`[LeadForm] Polo padrão "${CONFIG.POLO_PADRAO}" não encontrado na lista da API.`);
          }
        }
      }).catch(err => console.error('[LeadForm] Erro ao buscar polos:', err));
    } else {
      setPolos([]);
    }
  }, [idEstado]);

  // Handle Polo change
  useEffect(() => {
    setPreco(null);
    if (idCurso && idPolo) {
      setLoadingPreco(true);

      const timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000));
      Promise.race([fetchPreco(idCurso, idPolo), timeout])
        .then((data: any) => {
          // API pode retornar vlPrimeira como string ou número
          const vl = data?.vlPrimeira;
          if (data && vl !== undefined && vl !== null && vl !== '') {
            setPreco(data);
          } else {
            setPreco({ _fallback: true });
          }
        })
        .catch(() => {
          setPreco({ _fallback: true });
        })
        .finally(() => setLoadingPreco(false));
    }
  }, [idPolo, idCurso]);

  // Update pricing state to parent
  useEffect(() => {
    if (onPricingUpdate) {
      onPricingUpdate({
        loading: loadingPreco,
        preco: preco,
        curso: cursosCache.find(c => String(c.idCurso) === String(idCurso)),
        polo: polos.find(p => String(p.idPolo) === String(idPolo)),
        tipo: tipoCurso,
        idPolo: idPolo,
        ocultarPolo: CONFIG.OCULTAR_SELECAO_POLO,
        estadoPadrao: CONFIG.ESTADO_PADRAO
      });
    }
  }, [loadingPreco, preco, idCurso, idPolo, tipoCurso, cursosCache, polos, onPricingUpdate]);

  const maskPhone = (v: string) => {
    let r = v.replace(/\D/g, '').slice(0, 11);
    if (r.length > 10) return r.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (r.length > 6) return r.replace(/^(\d{2})(\d{4})(\d*)$/, '($1) $2-$3');
    if (r.length > 2) return r.replace(/^(\d{2})(\d*)$/, '($1) $2');
    if (r.length > 0) return '(' + r;
    return r;
  };

  const isStep2Valid = lead.nome.length > 2 && lead.whatsapp.replace(/\D/g, '').length >= 10;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const nmCursoSelecionado = filteredCursos.find(c => String(c.idCurso) === String(idCurso))?.nmCurso || '';
      const nmPoloSelecionado = polos.find(p => String(p.idPolo) === String(idPolo))?.nmPolo || '';

      const leadIdStr = await processLeadSubmission({
        lead,
        idCurso,
        nmCurso: nmCursoSelecionado,
        idPolo: idPolo || undefined,
        nmPolo: nmPoloSelecionado,
        tipoCurso: tipoCurso,
        preco: (preco && !preco._fallback) ? { vlPrimeira: preco.vlPrimeira, vlDemais: preco.vlDemais } : undefined
      });

      if (leadIdStr) {
        setDbLeadId(leadIdStr);
        // Recuperar o chat se houver
        const { data: previousChat } = await supabase.from('chats').select('id').eq('lead_id', leadIdStr).single();
        if (previousChat) {
          setActiveChatId(previousChat.id);
        }
      }

      setStep(3);
      if (onLeadSuccess) onLeadSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBRL = (val: number) => 'R$ ' + parseFloat(String(val)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-transparent text-gray-800 flex flex-col p-8 md:p-10 w-full h-fit relative z-20">
      <div className="mb-8">
        <h2 className="text-[26px] font-black text-[#003B5C] mb-2 tracking-tight">Comece sua Jornada</h2>
        <p className="text-[15px] text-gray-500 font-medium">Preencha as informações para ver as informações do curso e receber a proposta de bolsa exclusiva.</p>
      </div>

      <div className="w-full">
        {/* Steps Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= 1 ? 'bg-[#003B5C] text-white shadow-md' : 'bg-gray-100 text-[#666666]'}`}>1</div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${step >= 1 ? 'text-[#003B5C]' : 'text-gray-400'}`}>Curso</span>
          </div>
          <div className={`h-[2px] w-12 md:w-20 mx-2 mb-6 transition-colors duration-300 ${step >= 2 ? 'bg-[#003B5C]' : 'bg-gray-200'}`}></div>
          <div className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= 2 ? 'bg-[#003B5C] text-white shadow-md' : 'bg-gray-100 text-[#666666]'}`}>2</div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${step >= 2 ? 'text-[#003B5C]' : 'text-gray-400'}`}>Contato</span>
          </div>
          <div className={`h-[2px] w-12 md:w-20 mx-2 mb-6 ${step >= 3 ? 'bg-[#004b8d]' : 'bg-[#d1d9e0]'}`}></div>
          <div className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-100 text-[#666666]'}`}>
              <CheckCircle2 size={16} />
            </div>
            <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">Pronto!</span>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Tipo de Curso */}
              <div className="space-y-1.5 mb-4">
                <label className="block text-[12px] font-[600] text-[#004b8d] uppercase mb-1.5">Tipo de Curso <span className="text-red-500">*</span></label>
                <select
                  value={tipoCurso}
                  onChange={e => setTipoCurso(e.target.value)}
                  className="w-full p-[12px] bg-[#fafbfc] border border-[#d1d9e0] rounded-[6px] text-[14px] outline-none focus:border-[#004b8d] transition-colors disabled:opacity-50"
                >
                  <option value="">Selecione...</option>
                  <option value="EGRAD">Graduação</option>
                  <option value="EPOS">Pós-Graduação</option>
                </select>
              </div>

              {/* Curso */}
              <div className={`space-y-1.5 mb-4 ${tipoCurso === 'EPOS' ? 'md:col-span-2' : ''}`}>
                <label className="block text-[12px] font-[600] text-[#004b8d] uppercase mb-1.5">Curso <span className="text-red-500">*</span></label>
                <select
                  disabled={!tipoCurso || cursosCache.length === 0}
                  value={idCurso}
                  onChange={e => setIdCurso(e.target.value)}
                  className="w-full p-[12px] bg-[#fafbfc] border border-[#d1d9e0] rounded-[6px] text-[14px] outline-none focus:border-[#004b8d] transition-colors disabled:opacity-50"
                >
                  <option value="">{tipoCurso ? (cursosCache.length ? 'Selecione o curso' : 'Carregando...') : 'Selecione o tipo primeiro'}</option>
                  {filteredCursos.map(c => (
                    <option key={c.idCurso} value={c.idCurso}>{c.nmCurso}</option>
                  ))}
                </select>
              </div>

              {!CONFIG.OCULTAR_SELECAO_POLO && (
                <>
                  <div className="space-y-1.5 mb-4">
                    <label className="block text-[12px] font-[600] text-[#004b8d] uppercase mb-1.5">Estado <span className="text-red-500">*</span></label>
                    <select
                      disabled={!idCurso || estados.length === 0 || !!CONFIG.ESTADO_PADRAO}
                      value={idEstado}
                      onChange={e => setIdEstado(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#003B5C] focus:ring-4 focus:ring-[#003B5C]/10 transition-all disabled:opacity-50"
                    >
                      <option value="">{idCurso ? (estados.length ? 'Selecione o estado' : 'Buscando...') : 'Selecione o curso primeiro'}</option>
                      {estados.map((e: any) => (
                        <option key={e.idEstado} value={e.idEstado}>{e.nmEstado}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <label className="block text-[12px] font-[600] text-[#004b8d] uppercase mb-1.5">Polo / Cidade <span className="text-red-500">*</span></label>
                    <select
                      disabled={!idEstado || polos.length === 0 || !!CONFIG.POLO_PADRAO}
                      value={idPolo}
                      onChange={e => setIdPolo(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#003B5C] focus:ring-4 focus:ring-[#003B5C]/10 transition-all disabled:opacity-50"
                    >
                      <option value="">{idEstado ? (polos.length ? 'Selecione o polo' : 'Buscando...') : 'Selecione o estado primeiro'}</option>
                      {polos.map((p: any) => (
                        <option key={p.idPolo} value={p.idPolo}>{p.nmPolo}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {idPolo && (
              <div className="mt-4 pt-4 border-t border-[#d1d9e0]">
                <div className="bg-[#f4f7f9] border border-[#d1d9e0] rounded-[6px] p-4 flex items-start gap-3">
                  <MapPin className="text-[#004b8d] shrink-0 mt-0.5" size={18} />
                  <div>
                    <strong className="block text-[#1a1a1a] text-[14px]">
                      {CONFIG.OCULTAR_SELECAO_POLO
                        ? `Estado selecionado: ${CONFIG.ESTADO_PADRAO}`
                        : `Polo selecionado: ${polos.find(p => String(p.idPolo) === String(idPolo))?.nmPolo}`
                      }
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {idPolo && preco && !preco._fallback && !loadingPreco && (
              <div className="mt-6 border border-[#fdb913]/40 bg-[#FAFAFA] rounded-[24px] p-6 mb-2 shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#fdb913]/10 rounded-full blur-2xl -z-10"></div>

                <div className="flex items-center gap-2 mb-4 flex-wrap relative z-10">
                  <div className="inline-flex self-start bg-blue-50/80 text-[#003B5C] px-3 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider border border-[#003B5C]/10">
                    <span className="mr-1">🔥</span> Oferta Exclusiva Ativada
                  </div>
                  <div className="inline-flex self-start bg-slate-100 text-[#003B5C] px-3 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider border border-gray-200 shadow-sm">
                    <GraduationCap size={14} className="mr-1 inline text-gray-500" />
                    {(() => {
                      const nm = filteredCursos.find(c => String(c.idCurso) === String(idCurso))?.nmCurso?.toLowerCase() || '';
                      const isSemi = preco?._isSemipresencial || ['semipresencial', 'hibrido', 'híbrido', 'biomedicina', 'enfermagem', 'farmácia', 'fisioterapia', 'nutrição', 'odontologia', 'arquitetura', 'estética'].some(k => nm.includes(k));
                      return isSemi ? 'EAD Semipresencial' : '100% Online (EAD)';
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">1ª Mensalidade</span>
                    <span className="text-[#003B5C] font-black text-[30px] leading-none tracking-tighter">
                      {formatBRL(preco.vlPrimeira)}
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Demais Meses</span>
                    <div className="flex flex-col gap-0">
                      {parseFloat(preco.vlDemaisBruto || preco.vlBruto || preco.vlDemais * 2) > parseFloat(preco.vlDemais) && (
                        <span className="text-gray-400 text-[11px] font-bold line-through decoration-gray-300">
                          De {formatBRL(preco.vlDemaisBruto || preco.vlBruto || preco.vlDemais * 2)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-gray-500 font-bold text-[13px]">Por</span>
                        <span className="text-[#003B5C] font-black text-[24px] tracking-tighter leading-none">
                          {formatBRL(preco.vlDemais)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-5 text-center shadow-sm">
                  <p className="text-red-700 font-black text-[14px] leading-tight">
                    🔥 Temos algumas bolsas com +10% de desconto extra!
                  </p>
                  <p className="text-red-600 font-medium text-[11px] mt-1">Fale com o consultor agora mesmo para garantir.</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-[#fdb913] border-2 border-[#fdb913] text-[#003B5C] font-[900] text-[16px] uppercase tracking-widest py-4 rounded-xl hover:bg-yellow-400 hover:border-yellow-400 hover:shadow-[0_10px_20px_-10px_rgba(253,185,19,0.5)] hover:-translate-y-0.5 transition-all flex justify-center items-center"
                >
                  Eu quero!
                </button>

                <div className="mt-5 text-center">
                  <a href="#course-details" onClick={(e) => { e.preventDefault(); document.getElementById('course-details')?.scrollIntoView({ behavior: 'smooth' }); }} className="inline-flex items-center gap-1.5 text-[#003B5C] hover:text-[#004b8d] text-[13px] font-bold group">
                    Ler tudo sobre este curso <ArrowRight size={14} className="group-hover:translate-y-1 rotate-90 transition-transform" />
                  </a>
                </div>
              </div>
            )}

            {idPolo && preco && preco._fallback && !loadingPreco && (
              <div className="mt-6 p-6 border border-amber-200 bg-amber-50 rounded-[24px] flex items-start gap-4">
                 <AlertCircle className="text-amber-500 shrink-0" size={24} />
                 <div>
                    <h4 className="font-bold text-amber-900 text-sm">Consulta de valores indisponível</h4>
                    <p className="text-amber-800 text-xs mt-1">Não conseguimos recuperar a bolsa exata agora, mas finalize seu interesse que um consultor te passará a melhor condição pelo WhatsApp.</p>
                 </div>
              </div>
            )}

            {(!idPolo || loadingPreco || (preco && preco._fallback)) && (
              <button
                disabled={!idPolo}
                onClick={() => setStep(2)}
                className="w-full mt-6 bg-[#fdb913] border-2 border-[#fdb913] text-[#003B5C] font-[900] text-[16px] uppercase tracking-wider py-4 rounded-xl hover:bg-yellow-400 hover:shadow-lg hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
              >
                {idPolo && loadingPreco ? (
                  <><Loader2 size={20} className="animate-spin" /> Calculando...</>
                ) : idPolo ? 'Avançar para contato' : 'Preencha para ver os valores'}
              </button>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center mb-2">
               <h4 className="font-black text-[#003B5C] text-[16px]">Falta pouco!</h4>
               <p className="text-gray-500 text-[13px] font-medium mt-1">Preencha os campos abaixo para liberar seu atendimento imediato no WhatsApp.</p>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-[600] text-[#004b8d] uppercase mb-1.5">Como podemos te chamar? <span className="text-red-500">*</span></label>
                <input
                  type="text" value={lead.nome} onChange={e => setLead({ ...lead, nome: e.target.value })}
                  placeholder="Seu nome"
                  className="w-full p-[14px] bg-[#fafbfc] border border-[#d1d9e0] rounded-[10px] text-[15px] outline-none focus:border-[#004b8d] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12px] font-[600] text-[#004b8d] uppercase mb-1.5">Seu WhatsApp (com DDD) <span className="text-red-500">*</span></label>
                <input
                  type="tel" value={lead.whatsapp} onChange={e => setLead({ ...lead, whatsapp: maskPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="w-full p-[14px] bg-[#fafbfc] border border-[#d1d9e0] rounded-[10px] text-[15px] outline-none focus:border-[#004b8d] transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 mt-6">
              <button
                disabled={!isStep2Valid || isSubmitting}
                onClick={handleSubmit}
                className="w-full bg-[#25D366] text-white font-[900] text-[16px] uppercase tracking-wider py-4 rounded-xl hover:bg-[#20bd5a] hover:shadow-lg hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
              >
                {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Conectando...</> : <><MessageCircle size={22} /> Falar no WhatsApp Agora</>}
              </button>
              <button onClick={() => setStep(1)} className="text-[#666666] hover:text-[#004b8d] text-[13px] font-bold mt-2">
                Voltar e mudar curso
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="text-center py-8 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100/50">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-blue-900 mb-3">Interesse registrado!</h2>
            <p className="text-gray-600 mb-8 max-w-sm mx-auto font-medium">
              Um consultor especializado entrará em contato em até <strong className="text-gray-800">1 hora útil</strong> via WhatsApp.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleWhatsAppClick}
                className="w-full bg-green-500 text-white font-[900] text-[15px] uppercase tracking-wider py-4 px-6 rounded-xl hover:bg-green-400 hover:shadow-lg hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3"
              >
                <MessageCircle size={24} />
                Falar pelo WhatsApp
              </button>
              
              <button 
                disabled={onlineConsultants === 0}
                onClick={handleStartChat}
                className="w-full bg-[#003B5C] text-white font-[900] text-[15px] uppercase tracking-wider py-4 px-6 rounded-xl hover:bg-[#004b8d] hover:shadow-lg hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:translate-y-0 disabled:shadow-none"
              >
                <Headphones size={24} />
                {onlineConsultants > 0 ? `Chat ao Vivo (${onlineConsultants} Online)` : 'Chat Indisponível'}
              </button>
            </div>
            
          </div>
        )}
      </div>
      
      {showChatModal && createPortal(
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col h-[600px] max-h-[90vh]">
            <div className="bg-[#003B5C] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <Headphones size={20} />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#003B5C] rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-none mb-1">{agentName}</h3>
                  <p className="text-[11px] text-blue-200">
                     {chatError ? (
                       <span className="text-red-300">Falha na conexão</span>
                     ) : (
                       `Em andamento ${activeChatId ? '' : '(Conectando...)'}`
                     )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                     if(window.confirm('Deseja encerrar este atendimento e limpar sua sessão?')) {
                        localStorage.removeItem('unicesumar_active_chat_id');
                        localStorage.removeItem('unicesumar_lead_id');
                        window.location.reload();
                     }
                  }} 
                  className="px-2 py-1 flex items-center text-[10px] uppercase font-bold text-red-300 hover:text-red-100 hover:bg-white/10 rounded-lg transition-colors mr-1"
                  title="Sair e limpar dados"
                >
                  Sair
                </button>
                <button onClick={() => setShowChatModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors" title="Minimizar">
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-50 p-4 overflow-y-auto flex flex-col gap-3 relative" ref={chatScrollRef}>
              {chatError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex gap-2 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{chatError}</p>
                </div>
              )}
              
              {chatMessages.map(msg => (
                <div key={msg.id} className={`max-w-[85%] rounded-2xl p-3 text-sm flex flex-col ${
                  msg.sender_type === 'consultant' 
                    ? 'bg-white border border-gray-100 text-gray-800 self-start rounded-tl-sm shadow-sm' 
                    : 'bg-[#003B5C] text-white self-end rounded-tr-sm shadow-sm'
                }`}>
                   {msg.media_url ? (
                     msg.media_type === 'image' ? (
                       <img src={msg.media_url} alt="Midia enviada" className="max-w-[220px] rounded-lg mb-2 object-contain bg-black/10" />
                     ) : msg.media_type === 'audio' ? (
                       <audio controls src={msg.media_url} className="mb-2 max-w-[220px] h-10 [&::-webkit-media-controls-panel]:bg-white/90" />
                     ) : (
                       <a href={msg.media_url} target="_blank" rel="noreferrer" className="underline mb-2 block font-bold truncate tracking-tighter text-xs">📎 Ver Arquivo</a>
                     )
                   ) : msg.content.startsWith('FILE:') ? (
                     <div className="flex flex-col gap-1">
                        <span className="font-bold opacity-80 text-xs">Arquivo Anexo</span>
                        <a href={msg.content.replace('FILE:', '')} target="_blank" rel="noopener noreferrer" className="underline break-all tracking-tighter text-xs">
                          {msg.content.split('/').pop()}
                        </a>
                     </div>
                   ) : msg.content.startsWith('AUDIO:') ? (
                     <div className="flex flex-col gap-1 items-start min-w-[200px]">
                        <audio src={msg.content.replace('AUDIO:', '')} controls className="h-8 max-w-full [&::-webkit-media-controls-panel]:bg-white" />
                     </div>
                   ) : null}
                   <div className="mt-1 flex flex-col justify-end">
                     <div className="flex-1 text-sm">{msg.media_url ? '' : msg.content}</div>
                     <span className="text-[10px] opacity-70 whitespace-nowrap self-end mt-1 flex items-center gap-1">
                       {new Date(msg.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                       {msg.sender_type === 'lead' && (
                         <span className={`font-bold tracking-tighter ${msg.read_at ? 'text-blue-500' : 'text-gray-400'}`}>✓✓</span>
                       )}
                     </span>
                   </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <label className="w-10 h-10 shrink-0 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors" title="Anexar arquivo">
                   <Paperclip size={18} />
                   <input type="file" className="hidden" accept="image/*,audio/*,video/*" onChange={handleMediaUpload} />
                </label>
                {isRecording ? (
                  <div className="flex-1 bg-red-50 border border-red-200 text-red-600 font-bold rounded-full px-4 flex items-center justify-between overflow-hidden">
                    <span className="flex items-center gap-2 hidden sm:flex"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> Gravando Áudio...</span>
                    <span className="flex items-center gap-2 sm:hidden"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div></span>
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                       <span>00:{(recordingTime < 10 ? '0' : '') + recordingTime}</span>
                       <button type="button" onClick={() => stopRecording(true)} className="text-red-800 text-[10px] md:text-xs hover:underline uppercase font-black tracking-tighter">X Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Digite sua mensagem..." 
                    className="flex-1 bg-slate-50 border border-gray-200 rounded-full px-4 text-sm font-medium outline-none focus:border-[#003B5C] focus:ring-2 focus:ring-[#003B5C]/10 w-0" 
                  />
                )}
                
                {!isRecording && chatInput.trim() ? (
                  <button type="submit" disabled={!activeChatId} className="w-10 h-10 shrink-0 rounded-full bg-[#fdb913] text-[#003B5C] flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100">
                    <ArrowRight size={18} />
                  </button>
                ) : isRecording ? (
                  <button type="button" onClick={() => stopRecording(false)} className="w-10 h-10 shrink-0 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors animate-pulse">
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button 
                    type="button" 
                    disabled={!activeChatId}
                    onClick={startRecording} 
                    className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50"
                  >
                    <Mic size={18} />
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showEmailPrompt && createPortal(
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="font-black text-[#003B5C] text-xl mb-2">Recuperar Atendimento</h3>
            <p className="text-gray-500 text-xs mb-6 font-medium">Informe o mesmo e-mail que você utilizou ao iniciar a sua solicitação.</p>
            
            <form onSubmit={handleRecoverChat} className="flex flex-col gap-4">
              {promptError && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold">{promptError}</div>}
              <div>
                 <input 
                   type="email"
                   required
                   value={promptEmail}
                   onChange={e => setPromptEmail(e.target.value)}
                   className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#003B5C] focus:ring-2 focus:ring-[#003B5C]/10 transition-all font-medium text-sm"
                   placeholder="seu@email.com"
                 />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                 <button type="button" onClick={() => setShowEmailPrompt(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-slate-100 transition-colors">Voltar</button>
                 <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl text-sm font-bold bg-[#fdb913] text-[#003B5C] hover:scale-105 transition-transform flex items-center gap-2">
                   {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} 
                   Acessar
                 </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Botão Flutuante de Retomar Chat (Sempre visível para o caso da pessoa abrir ou querer perguntar) */}
      {createPortal(
        <button 
          onClick={onAcessarAtendimentoClick}
          className="fixed bottom-6 right-6 z-[4000] bg-[#fdb913] text-[#003B5C] w-16 h-16 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group flex items-center justify-center border-4 border-[#003B5C]"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle size={28} />
            {onlineConsultants > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#fdb913] rounded-full animate-pulse"></div>}
          </div>
          <span className="absolute right-full mr-4 bg-white text-[#003B5C] text-[13px] font-bold px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Acessar Atendimento
          </span>
        </button>,
        document.body
      )}
    </div>
  );
}

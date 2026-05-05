import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Users, Eye, MessageCircle, LogOut, ArrowRight, Headphones, BookOpen, Phone, Mail, Clock, Paperclip, Mic, FileDown, Pin, Tag, Plus, X, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'consultor' | null>(null);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);
  const [onlineConsultantNames, setOnlineConsultantNames] = useState<Set<string>>(new Set());
  const [isAdminOnline, setIsAdminOnline] = useState(() => {
    return localStorage.getItem('admin_online_status') === 'true';
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const formatWaitTime = (startDate: string, endDate?: string | null) => {
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    const diffMin = Math.floor((end - start) / 60000);
    
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Admin Chat States
  const [adminChats, setAdminChats] = useState<any[]>([]);
  const [selectedAdminChat, setSelectedAdminChat] = useState<any>(null);
  const activeChatRef = useRef<any>(null);
  
  useEffect(() => {
    activeChatRef.current = selectedAdminChat;
  }, [selectedAdminChat]);

  const [adminChatMessages, setAdminChatMessages] = useState<any[]>([]);

  // Garantir permissão de notificação e ouvir mensagens globais para alertas
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const globalNotifChannel = supabase.channel('global_messages_notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new;
        if (msg.sender_type === 'lead' && activeChatRef.current?.id !== msg.chat_id) {
          // Play sound
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
          
          if (Notification.permission === 'granted') {
            new Notification('Mensagem de Lead!', {
              body: 'Você recebeu um novo contato em um chat aguardando.',
              icon: '/favicon.ico'
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(globalNotifChannel); };
  }, []);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [chatStatusTab, setChatStatusTab] = useState<'active' | 'transferred_whatsapp' | 'closed' | 'all'>('active');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  
  // Stats & Tables
  const [stats, setStats] = useState({ visits: 0, leads: 0 });
  const [metrics, setMetrics] = useState({ chats: 0, wpp: 0, wppDireto: 0 });
  const [perfConsultor, setPerfConsultor] = useState<{nome: string, count: number}[]>([]);
  const [analyticsLeads, setAnalyticsLeads] = useState<any[]>([]);
  const [analyticsVisits, setAnalyticsVisits] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [availablePolos, setAvailablePolos] = useState<string[]>([]);
  
  // Date filters
  const [dateFilter, setDateFilter] = useState<'hoje' | 'mes' | 'ano' | 'tudo' | 'personalizado'>('tudo');
  const [dashboardStartDate, setDashboardStartDate] = useState('');
  const [dashboardEndDate, setDashboardEndDate] = useState('');
  
  // Chat Filters for Admin
  const [chatOriginFilter, setChatOriginFilter] = useState('');
  const [chatConsultantFilter, setChatConsultantFilter] = useState('');
  const [chatDateStart, setChatDateStart] = useState('');
  const [chatDateEnd, setChatDateEnd] = useState('');

  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Novas Funcionalidades: Tags, Quick Messages
  const [systemTags, setSystemTags] = useState<any[]>([]);
  const [leadTags, setLeadTags] = useState<any[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const [quickMessages, setQuickMessages] = useState<any[]>([]);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [quickMessageFilter, setQuickMessageFilter] = useState('');
  const [showQuickMessagesModal, setShowQuickMessagesModal] = useState(false);
  const [newQmShortcut, setNewQmShortcut] = useState('');
  const [newQmContent, setNewQmContent] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase.from('consultants').select('id, role, nome, avatar_url').eq('user_id', userId).single();
    if (!error && data) {
      setConsultantId(data.id);
      setUserRole(data.role as any);
      setUserName(data.nome || '');
      setUserAvatar(data.avatar_url || null);
      if (data.role === 'consultor') setActiveTab('chat');
    }
    setLoading(false);
  };

  // Dedicated Presence tracking with cleanup
  useEffect(() => {
    const channel = supabase.channel('consultants_status', {
      config: { presence: { key: consultantId || 'viewer' } },
    });
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const names = new Set<string>();
      for (const key in state) {
        (state[key] as any[]).forEach(p => {
          if (p.nome) names.add(p.nome);
        });
      }
      setOnlineConsultantNames(names);
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && userRole && userName) {
        const shouldBeOnline = userRole === 'consultor' || (userRole === 'admin' && isAdminOnline);
        if (shouldBeOnline) {
          await channel.track({ online: true, role: userRole, nome: userName, avatar_url: userAvatar });
        } else {
          await channel.untrack();
        }
      }
    });
    
    setPresenceChannel(channel);
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, consultantId, userName, userAvatar, isAdminOnline]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !consultantId) return;

    setIsUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${consultantId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    
    if (!uploadError) {
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const url = publicData.publicUrl;
      
      await supabase.from('consultants').update({ avatar_url: url }).eq('id', consultantId);
      setUserAvatar(url);
      alert('Foto de perfil atualizada com sucesso! A imagem já foi atualizada no site.');
    } else {
      alert('Erro ao enviar imagem. Verifique se o bucket "avatars" foi criado e se tem permissões públicas.');
    }
    setIsUploadingAvatar(false);
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
      if (discard) audioChunksRef.current = null; // empty to cancel upload
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const sendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim() || !selectedAdminChat) return;
    
    // Se o chat ainda não tem consultor ao enviar mensagem (ex: Admin respondeu sem assumir), assume agora
    if (!selectedAdminChat.consultant_id && consultantId) {
      handleAssignChat(selectedAdminChat.id, consultantId);
    }

    const content = adminChatInput.trim();
    setAdminChatInput('');
    const optId = `temp-${Date.now()}`;
    setAdminChatMessages(prev => [...prev, { id: optId, chat_id: selectedAdminChat.id, sender_type: 'consultant', content, created_at: new Date().toISOString() }]);
    
    // Atualiza o first_response_at se for a primeira resposta do consultor
    if (!selectedAdminChat.first_response_at) {
       const now = new Date().toISOString();
       await supabase.from('chats').update({ first_response_at: now }).eq('id', selectedAdminChat.id);
       setSelectedAdminChat({ ...selectedAdminChat, first_response_at: now });
    }

    const { data } = await supabase.from('messages').insert([{ chat_id: selectedAdminChat.id, sender_type: 'consultant', content }]).select('id').single();
    if (data) {
      setAdminChatMessages(prev => prev.map(m => m.id === optId ? { ...m, id: data.id } : m));
    }
  };

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim() || !selectedAdminChat) return;
    const name = tagName.trim().toUpperCase();
    let tag = systemTags.find(t => t.name === name);
    if (!tag) {
      const { data } = await supabase.from('tags').insert([{ name, created_by: consultantId }]).select().single();
      if (data) {
        tag = data;
        setSystemTags(prev => [...prev, data]);
      }
    }
    if (tag) {
      const { error } = await supabase.from('lead_tags').insert([{ lead_id: selectedAdminChat.lead_id, tag_id: tag.id, assigned_by: consultantId }]);
      if (!error) {
        setLeadTags(prev => [...prev, { tag_id: tag.id, tags: { name: tag.name }, assigned_by: consultantId }]);
      } else {
        alert("Erro ao adicionar tag (Máximo 5 tags ou erro de permissão).");
      }
    }
    setNewTagInput('');
    setShowTagMenu(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!selectedAdminChat) return;
    await supabase.from('lead_tags').delete().match({ lead_id: selectedAdminChat.lead_id, tag_id: tagId });
    setLeadTags(prev => prev.filter(t => t.tag_id !== tagId));
  };

  const handleAssignChat = async (chatId: string, cId: string | null) => {
    const { error } = await supabase.from('chats').update({ consultant_id: cId }).eq('id', chatId);
    if (!error) {
      if (selectedAdminChat?.id === chatId) {
        setSelectedAdminChat({ ...selectedAdminChat, consultant_id: cId });
      }
      setAdminChats(prev => prev.map(c => c.id === chatId ? { ...c, consultant_id: cId } : c));
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAdminChat) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${selectedAdminChat.id}/${fileName}`;
    
    // Mostrando placeholder temporário 
    const optId = `temp-${Date.now()}`;
    setAdminChatMessages(prev => [...prev, { id: optId, chat_id: selectedAdminChat.id, sender_type: 'consultant', content: 'Enviando arquivo...', created_at: new Date().toISOString() }]);

    const { data, error } = await supabase.storage.from('chat_media').upload(filePath, file);
    if (!error) {
      const { data: publicData } = supabase.storage.from('chat_media').getPublicUrl(filePath);
      let mediaType = file.type.startsWith('image/') ? 'image' : 'audio';
      if (file.type.startsWith('video/')) mediaType = 'video';

      const { data: newMsg } = await supabase.from('messages').insert({
        chat_id: selectedAdminChat.id,
        sender_type: 'consultant',
        content: `Arquivo: ${file.name}`,
        media_url: publicData.publicUrl,
        media_type: mediaType
      }).select().single();

      if (newMsg) {
         setAdminChatMessages(prev => prev.map(m => m.id === optId ? newMsg : m));
      }
    } else {
      setAdminChatMessages(prev => prev.filter(m => m.id !== optId));
      alert('Erro ao enviar arquivo: ' + error.message);
    }
    // limpa o input
    e.target.value = '';
  };

  // Carregar lista de chats quando estiver na tab
  useEffect(() => {
    if (activeTab === 'chat') {
       // Busca abrangente incluindo encerrados
       let q = supabase.from('chats').select('*, leads(nome, nm_curso, nm_polo, utm_source), consultants(nome)').in('status', ['active', 'transferred_whatsapp', 'closed']);
       
       if (userRole === 'consultor') {
         q = q.or(`consultant_id.is.null,consultant_id.eq.${consultantId}`);
       } else if (userRole !== 'admin') {
         // Se não for admin nem consultor identificado, não busca chats por segurança
         setAdminChats([]);
         return;
       }
       
       q.order('started_at', { ascending: false }).then(({data}) => {
         if (data) setAdminChats(data);
       });

       const chChats = supabase.channel('admin_chats')
         .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, payload => {
            // Som de ALERTA (Novo Lead)
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 1.0; audio.play().catch(() => {});
            
            // Mostrar notificação Web (se não negada)
            if (Notification.permission === 'granted') {
              new Notification('🚨 NOVO LEAD CHEGOU!', { body: 'Um novo lead entrou na mesa de atendimento.' });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then(p => {
                if (p === 'granted') new Notification('Novo Lead! O chat está habilitado.');
              });
            }

            supabase.from('chats').select('*, leads(nome, nm_curso, nm_polo, utm_source), consultants(nome)').eq('id', payload.new.id).single()
              .then(({data}) => {
                 if (data) {
                    if (userRole === 'consultor' && data.consultant_id && data.consultant_id !== consultantId) return;
                    setAdminChats(prev => [data, ...prev]);
                 }
              });
         })
         .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats' }, payload => {
            supabase.from('chats').select('*, leads(nome, nm_curso, nm_polo, utm_source), consultants(nome)').eq('id', payload.new.id).single()
              .then(({data}) => {
                 if (data) {
                    // Update global list regardless of status now, tabs will filter
                    if (userRole === 'consultor' && data.consultant_id && data.consultant_id !== consultantId) {
                       setAdminChats(prev => prev.filter(c => c.id !== data.id));
                    } else {
                       setAdminChats(prev => {
                          const exists = prev.find(c => c.id === data.id);
                          if (exists) return prev.map(c => c.id === data.id ? data : c);
                          return [data, ...prev];
                       });
                    }
                 }
              });
         })
         .subscribe();
         
       return () => { supabase.removeChannel(chChats) }
    }
  }, [activeTab, userRole, consultantId]);

  // Carregar mensagens e ouvir o chat ativo selecionado
  useEffect(() => {
    if (selectedAdminChat && consultantId) {
       // Carrega as tags do lead
       supabase.from('lead_tags').select('*, tags(name)').eq('lead_id', selectedAdminChat.lead_id).then(({data}) => setLeadTags(data || []));

       // Removido auto-atribuição (consultant_id) para cumprir requisito de botão explícito
       supabase.from('messages').select('*').eq('chat_id', selectedAdminChat.id).order('created_at').then(({data}) => setAdminChatMessages(data || []));

       const chMsgs = supabase.channel(`admin_chat_msgs_${selectedAdminChat.id}`)
         .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedAdminChat.id}` }, payload => {
            setAdminChatMessages(prev => {
              if (prev.find(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
         }).subscribe();
         
       return () => { supabase.removeChannel(chMsgs) }
    }
  }, [selectedAdminChat]);

  // Carregar Métricas da Dashboard
  useEffect(() => {
    if (activeTab === 'overview') {
      const fetchStats = async () => {
        let dateQueryStart = '';
        let dateQueryEnd = '';

        if (dateFilter === 'hoje') {
          const startOfDay = new Date();
          startOfDay.setHours(0,0,0,0);
          dateQueryStart = startOfDay.toISOString();
        } else if (dateFilter === 'mes') {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0,0,0,0);
          dateQueryStart = startOfMonth.toISOString();
        } else if (dateFilter === 'ano') {
          const startOfYear = new Date();
          startOfYear.setMonth(0, 1);
          startOfYear.setHours(0,0,0,0);
          dateQueryStart = startOfYear.toISOString();
        } else if (dateFilter === 'personalizado') {
          if (dashboardStartDate) {
            const start = new Date(dashboardStartDate);
            start.setHours(0,0,0,0);
            dateQueryStart = start.toISOString();
          }
          if (dashboardEndDate) {
            const end = new Date(dashboardEndDate);
            end.setHours(23,59,59,999);
            dateQueryEnd = end.toISOString();
          }
        }

        let qVisits = supabase.from('page_visits').select('*', { count: 'exact', head: true });
        let qLeads = supabase.from('leads').select('*', { count: 'exact', head: true });
        let qVisitsData = supabase.from('page_visits').select('*').order('created_at', { ascending: false }).limit(10);
        let qChats = supabase.from('chats').select('consultants(nome)');
        let qLeadsAll = supabase.from('leads').select('contato_preferencia, utm_source, utm_medium, utm_campaign, utm_content');
        let qGroupedVisits = supabase.from('page_visits').select('utm_source, utm_medium, utm_campaign');

        if (dateQueryStart) {
          qVisits = qVisits.gte('created_at', dateQueryStart);
          qLeads = qLeads.gte('created_at', dateQueryStart);
          qVisitsData = qVisitsData.gte('created_at', dateQueryStart);
          qChats = qChats.gte('started_at', dateQueryStart);
          qLeadsAll = qLeadsAll.gte('created_at', dateQueryStart);
          qGroupedVisits = qGroupedVisits.gte('created_at', dateQueryStart);
        }
        
        if (dateQueryEnd) {
          qVisits = qVisits.lte('created_at', dateQueryEnd);
          qLeads = qLeads.lte('created_at', dateQueryEnd);
          qVisitsData = qVisitsData.lte('created_at', dateQueryEnd);
          qChats = qChats.lte('started_at', dateQueryEnd);
          qLeadsAll = qLeadsAll.lte('created_at', dateQueryEnd);
          qGroupedVisits = qGroupedVisits.lte('created_at', dateQueryEnd);
        }

        const [{ count: vCount }, { count: lCount }, { data: vData }, { data: chatData }, { data: lData }, { data: allVData }] = await Promise.all([
           qVisits, qLeads, qVisitsData, qChats, qLeadsAll, qGroupedVisits
        ]);
        
        setStats({ visits: vCount || 0, leads: lCount || 0 });
        setRecentVisits(vData || []);
        setAnalyticsLeads(lData || []);
        setAnalyticsVisits(allVData || []);

        let chatsC = 0, wppC = 0, wppDiretoC = 0;
        lData?.forEach(l => {
          if (l.contato_preferencia === 'chat') chatsC++;
          if (l.contato_preferencia === 'whatsapp') wppC++;
          if (l.contato_preferencia === 'whatsapp_direto') wppDiretoC++;
        });
        setMetrics({ chats: chatsC, wpp: wppC, wppDireto: wppDiretoC });

        // Calc consultores
        const counts: Record<string, number> = {};
        chatData?.forEach(c => {
           if (c.consultants && c.consultants.nome) {
             counts[c.consultants.nome] = (counts[c.consultants.nome] || 0) + 1;
           }
        });
        setPerfConsultor(Object.entries(counts).map(([nome, count]) => ({nome, count})).sort((a,b)=>b.count - a.count));
      };
      fetchStats();
    }
  }, [activeTab, userRole, dateFilter, dashboardStartDate, dashboardEndDate]);

  // Carregar Polos Disponíveis
  useEffect(() => {
    supabase.from('available_polos').select('nome').order('nome')
      .then(({data}) => setAvailablePolos(data?.map(p => p.nome) || []));
  }, []);

  // Carregar Base de Leads
  useEffect(() => {
    if (activeTab === 'leads') {
      supabase.from('leads')
        .select('*, consultants:assigned_consultant_id(nome)')
        .order('created_at', { ascending: false })
        .then(({data}) => setLeads(data || []));
    }
  }, [activeTab]);

  useEffect(() => {
    if ((activeTab === 'team' || activeTab === 'chat') && userRole === 'admin') {
      supabase.from('consultants').select('*').then(({data}) => setTeam(data || []));
    }
  }, [activeTab, userRole]);

  // Carregar Tags e Mensagens Rápidas
  useEffect(() => {
    if (activeTab === 'chat') {
      supabase.from('tags').select('*').then(({data}) => setSystemTags(data || []));
      if (consultantId) {
        supabase.from('quick_messages').select('*')
          .or(`consultant_id.is.null,consultant_id.eq.${consultantId}`)
          .then(({data}) => setQuickMessages(data || []));
      }
    }
  }, [activeTab, consultantId]);

  const toggleUserRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'consultor' : 'admin';
    await supabase.from('consultants').update({ role: newRole }).eq('id', id);
    setTeam(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
  };

  const updateUserName = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    await supabase.from('consultants').update({ nome: newName }).eq('id', id);
    setTeam(prev => prev.map(u => u.id === id ? { ...u, nome: newName } : u));
    // Se for o próprio usuário, atualiza o state global de nome também
    if (team.find(u => u.id === id)?.user_id === session.user.id) {
       setUserName(newName);
    }
  };

  const formatBRL = (val: number) => 'R$ ' + parseFloat(String(val)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleUpdateLeadPolo = async (leadId: string, newPolo: string) => {
    if (!leadId) return;
    try {
      const { error } = await supabase.from('leads').update({ nm_polo: newPolo }).eq('id', leadId);
      
      if (error) {
        console.error('Erro ao atualizar polo:', error);
        alert('Erro ao atualizar no banco: ' + error.message);
        return;
      }
      
      setAdminChats(prev => prev.map(chat => {
        if (chat.lead_id !== leadId) return chat;
        const currentLeads = Array.isArray(chat.leads) ? chat.leads : [chat.leads];
        return { ...chat, leads: currentLeads.map((l: any) => ({ ...l, nm_polo: newPolo })) };
      }));
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, nm_polo: newPolo } : l));
      
      if (selectedAdminChat?.lead_id === leadId) {
        const currentLeads = Array.isArray(selectedAdminChat.leads) ? selectedAdminChat.leads : [selectedAdminChat.leads];
        setSelectedAdminChat({ ...selectedAdminChat, leads: currentLeads.map((l: any) => ({ ...l, nm_polo: newPolo })) });
      }
    } catch (err) {
      console.error('Critical update error:', err);
    }
  };

  const handleClaimLead = async (leadId: string) => {
    if (!consultantId) return;
    const { error } = await supabase.from('leads').update({
      assigned_consultant_id: consultantId,
      assigned_at: new Date().toISOString(),
      lead_status: 'contato inicial'
    }).eq('id', leadId);

    if (error) {
      alert('Erro ao assumir lead: ' + error.message);
    } else {
      setLeads(prev => prev.map(l => l.id === leadId ? { 
        ...l, 
        assigned_consultant_id: consultantId, 
        assigned_at: new Date().toISOString(),
        lead_status: 'contato inicial',
        consultants: { nome: userName } 
      } : l));
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    const { error } = await supabase.from('leads').update({
      lead_status: newStatus
    }).eq('id', leadId);

    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
    } else {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, lead_status: newStatus } : l));
    }
  };

  const getFilteredLeadsForExport = () => {
    let filteredLeads = [...leads];
    if (exportStartDate) {
      const s = new Date(exportStartDate);
      s.setHours(0,0,0,0);
      filteredLeads = filteredLeads.filter(l => new Date(l.created_at) >= s);
    }
    if (exportEndDate) {
      const e = new Date(exportEndDate);
      e.setHours(23,59,59,999);
      filteredLeads = filteredLeads.filter(l => new Date(l.created_at) <= e);
    }
    return filteredLeads;
  };

  const handleExportCSV = () => {
    const filteredLeads = getFilteredLeadsForExport();
    if (filteredLeads.length === 0) {
      alert("Nenhum lead encontrado neste período.");
      return;
    }

    const headers = ["Data", "Hora", "Nome", "WhatsApp", "Email", "Curso", "Polo", "Origem", "Conteudo", "Preferencia_Contato", "Observacao"];
    const rows = filteredLeads.map(l => [
       new Date(l.created_at).toLocaleDateString('pt-BR'),
       new Date(l.created_at).toLocaleTimeString('pt-BR'),
       `"${l.nome || ''}"`,
       `"${l.whatsapp || ''}"`,
       `"${l.email || ''}"`,
       `"${l.nm_curso || ''}"`,
       `"${l.nm_polo || ''}"`,
       `"${l.utm_source || ''}"`,
       `"${l.utm_content || ''}"`,
       `"${l.contato_preferencia || ''}"`,
       `"${(l.observacao || '').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Leads_UniCesumar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    const filteredLeads = getFilteredLeadsForExport();
    if (filteredLeads.length === 0) {
      alert("Nenhum lead encontrado neste período.");
      return;
    }

    const data = filteredLeads.map(l => ({
      "Data": new Date(l.created_at).toLocaleDateString('pt-BR'),
      "Hora": new Date(l.created_at).toLocaleTimeString('pt-BR'),
      "Nome": l.nome || '',
      "WhatsApp": l.whatsapp || '',
      "Email": l.email || '',
      "Curso": l.nm_curso || '',
      "Polo": l.nm_polo || '',
      "Origem": l.utm_source || '',
      "Preferencia": l.contato_preferencia || '',
      "Observacao": (l.observacao || '').replace(/\n/g, ' ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, `Leads_UniCesumar_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const filteredLeads = getFilteredLeadsForExport();
    if (filteredLeads.length === 0) {
      alert("Nenhum lead encontrado neste período.");
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Relatorio de Leads - UniCesumar", 14, 10);
    
    const tableHeaders = [["Data", "Nome", "WhatsApp", "Curso", "Polo", "Origem"]];
    const tableData = filteredLeads.map(l => [
      new Date(l.created_at).toLocaleDateString('pt-BR'),
      l.nome || '',
      l.whatsapp || '',
      l.nm_curso || '',
      l.nm_polo || '',
      l.utm_source || ''
    ]);

    (doc as any).autoTable({
      head: tableHeaders,
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 59, 92] }
    });

    doc.save(`Leads_UniCesumar_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [adminChatMessages]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    if (presenceChannel) {
      await supabase.removeChannel(presenceChannel);
      setPresenceChannel(null);
    }
    await supabase.auth.signOut();
    setConsultantId(null);
    setUserRole(null);
    setUserName('');
    setUserAvatar(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001D2D] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#fdb913]" size={48} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#001D2D] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[24px] shadow-2xl w-full max-w-md border border-white/10">
          <div className="flex justify-center mb-6">
            <img src="/imagens/logo_fundobranco.png" alt="UniCesumar" className="h-12 object-contain" />
          </div>
          <h1 className="text-[24px] font-black text-[#003B5C] text-center mb-2">Acesso Corporativo</h1>
          <p className="text-gray-500 text-center text-sm mb-8">Faça login para acessar o painel de consultores.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-[600] text-[#004b8d] uppercase mb-1.5">E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#003B5C]" />
            </div>
            <div>
              <label className="block text-[12px] font-[600] text-[#004b8d] uppercase mb-1.5">Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#003B5C]" />
            </div>
            
            {authError && <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-lg">{authError}</div>}
            
            <button type="submit" disabled={loading} className="w-full bg-[#fdb913] text-[#003B5C] font-black uppercase text-sm py-4 rounded-xl mt-4 hover:bg-yellow-400 transition-colors">
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F4F5F8] text-gray-800 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-[280px] bg-[#001D2D] text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10 flex justify-center pb-8">
          <img src="/imagens/logo_fundobranco.png" alt="Logotipo" className="h-[72px] w-auto brightness-0 invert opacity-90" />
        </div>
        <div className="p-4 flex-1 flex flex-col gap-2">
            <>
              <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'overview' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'}`}>
                <Eye size={20} /> Visão Geral
              </button>
              <button onClick={() => setActiveTab('leads')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'leads' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'}`}>
                <Users size={20} /> Base de Leads
              </button>
              {userRole === 'admin' && (
                <button onClick={() => setActiveTab('team')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'team' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'}`}>
                  <Users size={20} /> Equipe
                </button>
              )}
            </>
          
          <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors relative ${activeTab === 'chat' ? 'bg-[#fdb913]/20 text-[#fdb913]' : 'hover:bg-white/5 text-white/50'}`}>
            <MessageCircle size={20} /> Bate-Papo Local
            {userRole === 'consultor' && <span className="absolute right-4 bg-[#fdb913] text-[#001D2D] text-[10px] px-2 py-0.5 rounded-full font-black">Online</span>}
            {userRole === 'admin' && isAdminOnline && <span className="absolute right-4 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">Visível</span>}
          </button>
          
          {userRole === 'admin' && (
            <div className="px-4 py-3 mx-2 mt-1 flex items-center justify-between bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fdb913]">Atendimento</span>
                <span className="text-[11px] font-bold text-white/60">{isAdminOnline ? 'Disponível no Site' : 'Invisível'}</span>
              </div>
              <button 
                onClick={() => {
                  const newState = !isAdminOnline;
                  setIsAdminOnline(newState);
                  localStorage.setItem('admin_online_status', String(newState));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${isAdminOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isAdminOnline ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
          
          <div className="mt-4 border-t border-white/10 pt-4">
            <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors w-full ${activeTab === 'profile' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'}`}>
              <Settings size={20} /> Meu Perfil
            </button>
          </div>
        </div>
        <div className="p-6 border-t border-white/10 mt-auto bg-[#00141f]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-black text-white truncate">{userName || 'Consultor'}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#fdb913]">{userRole || 'Acesso Restrito'}</span>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-white transition-colors p-2" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className={`flex-1 overflow-auto flex flex-col ${activeTab === 'chat' ? 'p-6 pb-0 md:p-10 md:pb-0' : 'p-6 md:p-10'}`}>
        
        {activeTab === 'profile' && (
           <div className="animate-in fade-in duration-300">
             <h2 className="text-3xl font-black text-[#003B5C] tracking-tight mb-8">Meu Perfil</h2>
             <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-xl">
               <h3 className="font-bold text-gray-800 mb-4">Foto de Perfil (Avatar)</h3>
               <p className="text-sm text-gray-500 mb-6">Esta foto será exibida no widget de chat na página principal quando você estiver online, gerando mais confiança para o visitante.</p>
               
               <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                 <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-4 border-white shadow-lg flex-shrink-0 flex items-center justify-center text-slate-300">
                   {userAvatar ? (
                     <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <Users size={32} />
                   )}
                 </div>
                 
                 <div className="text-center md:text-left flex flex-col items-center md:items-start">
                   <input type="file" accept="image/*" id="avatar-upload" className="hidden" onChange={handleAvatarUpload} />
                   <label htmlFor="avatar-upload" className="bg-[#003B5C] text-white px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-[#002b44] transition-colors inline-flex items-center gap-2 mb-2">
                     {isUploadingAvatar ? <><Loader2 className="animate-spin" size={18} /> Enviando...</> : 'Escolher Nova Foto'}
                   </label>
                   <p className="text-xs text-gray-400 max-w-[250px]">Formato JPG ou PNG. <br/> Tamanho recomendado: 200x200px.</p>
                 </div>
               </div>
             </div>
           </div>
        )}

        {activeTab === 'overview' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-[#003B5C] tracking-tight">Visão Geral Executiva</h2>
              <div className="mt-4 md:mt-0 flex gap-4 items-center">
                {dateFilter === 'personalizado' && (
                  <div className="flex gap-2 animate-in slide-in-from-right-2 duration-300">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">De</span>
                      <input 
                         type="date" 
                         value={dashboardStartDate}
                         onChange={(e) => setDashboardStartDate(e.target.value)}
                         className="bg-white border border-gray-200 text-gray-700 py-1.5 px-3 rounded-lg text-xs shadow-sm outline-none focus:border-[#003B5C]"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Até</span>
                      <input 
                         type="date" 
                         value={dashboardEndDate}
                         onChange={(e) => setDashboardEndDate(e.target.value)}
                         className="bg-white border border-gray-200 text-gray-700 py-1.5 px-3 rounded-lg text-xs shadow-sm outline-none focus:border-[#003B5C]"
                      />
                    </div>
                  </div>
                )}
                <select 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-white border border-gray-200 text-gray-700 py-2.5 px-4 rounded-xl shadow-sm outline-none focus:border-[#003B5C] font-bold text-sm"
                >
                  <option value="tudo">Todo o Período</option>
                  <option value="hoje">Hoje</option>
                  <option value="mes">Este Mês</option>
                  <option value="ano">Este Ano</option>
                  <option value="personalizado">Período Personalizado</option>
                </select>
              </div>
            </div>
            
            {/* KPI Cards */}
            {(() => {
              const activeConvs = metrics.chats + metrics.wpp + metrics.wppDireto;
              
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Visitas no Site</span>
                      <span className="text-4xl font-black text-[#003B5C]">{stats.visits}</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Leads Gerados</span>
                      <span className="text-4xl font-black text-[#003B5C]">{stats.leads}</span>
                    </div>
                    <div className="bg-[#003B5C] p-6 rounded-2xl shadow-xl shadow-blue-900/20 flex flex-col">
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-2">Conversões Ativas</span>
                      <span className="text-4xl font-black text-white">{activeConvs}</span>
                      <span className="text-[10px] text-blue-200 font-bold mt-2 uppercase">Chat ou WhatsApp</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tx de Conversão</span>
                      <span className="text-4xl font-black text-[#003B5C]">{stats.visits > 0 ? ((activeConvs / stats.visits) * 100).toFixed(1) : '0'}%</span>
                    </div>
                  </div>
                  
                  {/* Detailed metrics box for channels and consultants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                       <h3 className="font-black text-[#003B5C] mb-4">Volume por Canal</h3>
                       <div className="flex gap-8">
                         <div className="flex flex-col">
                           <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">WhatsApp (Form)</span>
                           <span className="text-2xl font-black text-green-600">{metrics.wpp}</span>
                         </div>
                         <div className="flex flex-col">
                           <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">WhatsApp Direto</span>
                           <span className="text-2xl font-black text-green-500">{metrics.wppDireto}</span>
                         </div>
                         <div className="flex flex-col">
                           <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Chat Nativo</span>
                           <span className="text-2xl font-black text-blue-600">{metrics.chats}</span>
                         </div>
                       </div>
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                       <h3 className="font-black text-[#003B5C] mb-4">Atendimentos por Consultor (Chat)</h3>
                       {perfConsultor.length === 0 ? (
                         <div className="text-sm text-gray-400 italic">Nenhum atendimento assumido no período.</div>
                       ) : (
                         <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                           {perfConsultor.map((p, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                               <span className="font-bold text-gray-600 text-sm">{p.nome}</span>
                               <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-black">{p.count} chats</span>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>

                </>
              );
            })()}
            
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-10">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
                <div>
                   <h3 className="font-black text-[#003B5C]">Performance por Origem (UTM)</h3>
                   <p className="text-xs text-gray-400 font-bold uppercase mt-1">Ranqueado por maior volume de Leads</p>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-[11px] font-black text-gray-500 uppercase">
                   Total de {Array.from(new Set(recentVisits.map(v => v.utm_source || 'DIRETO'))).length} Fontes
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Origem / Mídia / Campanha</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Visitas</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Leads</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Conversão</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Barra de Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const groups: Record<string, { source: string, medium: string, campaign: string, visits: number, leads: number, conversions: number }> = {};
                      
                      analyticsVisits.forEach(v => {
                        const key = `${v.utm_source || 'DIRETO'}|${v.utm_medium || '-'}|${v.utm_campaign || '-'}`;
                        if (!groups[key]) groups[key] = { source: v.utm_source || 'DIRETO', medium: v.utm_medium || '-', campaign: v.utm_campaign || '-', visits: 0, leads: 0, conversions: 0 };
                        groups[key].visits++;
                      });
                      
                      analyticsLeads.forEach(l => {
                        const key = `${l.utm_source || 'DIRETO'}|${l.utm_medium || '-'}|${l.utm_campaign || '-'}`;
                        if (!groups[key]) {
                          groups[key] = { source: l.utm_source || 'DIRETO', medium: l.utm_medium || '-', campaign: l.utm_campaign || '-', visits: 0, leads: 0, conversions: 0 };
                        }
                        groups[key].leads++;
                        if (l.contato_preferencia) groups[key].conversions++;
                      });

                      const sorted = Object.values(groups).sort((a, b) => b.conversions - a.conversions);

                      return sorted.map((g, idx) => {
                        const convRate = g.visits > 0 ? (g.conversions / g.visits) * 100 : 0;
                        return (
                          <tr key={idx} className="border-t border-gray-50 hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4">
                               <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${g.source === 'DIRETO' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>{g.source}</span>
                                  {g.medium !== '-' && <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-400 text-[10px] font-medium">{g.medium}</span>}
                                  {g.campaign !== '-' && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-bold italic">{g.campaign}</span>}
                               </div>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-gray-500 text-sm">{g.visits}</td>
                            <td className="px-6 py-4 text-center font-medium text-[#003B5C] text-sm">{g.leads}</td>
                            <td className="px-6 py-4 text-center font-black text-[#003B5C] text-sm">
                               {g.conversions}
                               {g.leads > 0 && <span className="text-[10px] text-gray-400 block font-normal">({((g.conversions/g.leads)*100).toFixed(0)}% do lead)</span>}
                            </td>
                            <td className={`px-6 py-4 text-center font-black text-sm ${convRate > 10 ? 'text-green-600' : 'text-blue-500'}`}>{convRate.toFixed(1)}%</td>
                            <td className="px-6 py-4 min-w-[150px]">
                               <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-1000 ${convRate > 10 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(convRate, 100)}%` }}></div>
                               </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-6 border-b border-gray-50">
                  <h3 className="font-black text-[#003B5C]">Últimos Acessos Detalhados</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse text-xs">
                   <thead>
                     <tr className="bg-slate-50/50">
                       <th className="px-6 py-3 font-bold text-gray-400 uppercase">Data</th>
                       <th className="px-6 py-3 font-bold text-gray-400 uppercase">Origem</th>
                       <th className="px-6 py-3 font-bold text-gray-400 uppercase">Mídia</th>
                       <th className="px-6 py-3 font-bold text-gray-400 uppercase">Campanha</th>
                     </tr>
                   </thead>
                   <tbody>
                     {recentVisits.slice(0, 10).map((v, idx) => (
                       <tr key={idx} className="border-t border-gray-50">
                         <td className="px-6 py-3 text-gray-500">{new Date(v.created_at).toLocaleString('pt-BR')}</td>
                         <td className="px-6 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">{v.utm_source || 'DIRETO'}</span></td>
                         <td className="px-6 py-3 text-gray-400">{v.utm_medium || '-'}</td>
                         <td className="px-6 py-3 text-gray-400">{v.utm_campaign || '-'}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="animate-in fade-in duration-300 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <h2 className="text-3xl font-black text-[#003B5C] tracking-tight">Base de Leads</h2>
              
              {userRole === 'admin' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-200 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase">De:</span>
                    <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="text-sm text-gray-600 outline-none" />
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-200 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase">Até:</span>
                    <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="text-sm text-gray-600 outline-none" />
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="bg-[#003B5C] hover:bg-[#002b4d] text-white font-bold text-sm px-6 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 border border-blue-900/20"
                    >
                      <FileDown size={18} /> Exportar Base
                    </button>

                    {showExportMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <button 
                            onClick={() => { handleExportCSV(); setShowExportMenu(false); }}
                            className="w-full text-left px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-2"
                          >
                            <div className="w-2 h-2 rounded-full bg-green-500"></div> Exportar CSV
                          </button>
                          <button 
                            onClick={() => { handleExportXLSX(); setShowExportMenu(false); }}
                            className="w-full text-left px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-2"
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-600"></div> Exportar Excel
                          </button>
                          <button 
                            onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                            className="w-full text-left px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2"
                          >
                            <div className="w-2 h-2 rounded-full bg-red-500"></div> Exportar PDF
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-[#003B5C] text-white">
                   <tr className="text-[11px] uppercase tracking-wider">
                     <th className="px-6 py-4 font-black">Data/Hora</th>
                     <th className="px-6 py-4 font-black">Lead</th>
                     <th className="px-6 py-4 font-black">Curso</th>
                     <th className="px-6 py-4 font-black text-center">Origem / Conteúdo</th>
                     <th className="px-6 py-4 font-black">Atendimento</th>
                     <th className="px-6 py-4 font-black">Mensagem</th>
                   </tr>
                 </thead>
                 <tbody>
                   {leads.map(l => (
                     <tr key={l.id} className="border-b border-gray-100 hover:bg-slate-50/80 transition-colors">
                       <td className="px-6 py-4 text-xs font-bold text-gray-400">
                         {new Date(l.created_at).toLocaleDateString('pt-BR')}<br/>
                         {new Date(l.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                       </td>
                       <td className="px-6 py-4">
                         <div className="font-bold text-[#003B5C]">{l.nome}</div>
                         <div className="text-[11px] text-gray-500 font-medium">{l.whatsapp}</div>
                         <div className="text-[11px] text-gray-400 italic">{l.email}</div>
                       </td>
                       <td className="px-6 py-4">
                         <div className="text-xs font-black text-[#003B5C] uppercase">{l.nm_curso}</div>
                         <div className="text-[10px] text-gray-500 font-bold uppercase">{l.nm_polo}</div>
                       </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded font-black text-[9px] uppercase w-fit">
                              {l.utm_source || 'Direto'}
                            </span>
                            {l.utm_content && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-bold text-[8px] uppercase w-fit border border-blue-100/50">
                                {l.utm_content}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 min-w-[200px]">
                          {!l.assigned_consultant_id ? (
                            <button 
                              onClick={() => handleClaimLead(l.id)}
                              className="w-full bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase py-2 px-3 rounded-lg shadow-sm transition-all"
                            >
                              Assumir Lead
                            </button>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] font-black text-[#003B5C] uppercase">{l.consultants?.nome || 'Consultor'}</span>
                              </div>
                              <select 
                                value={l.lead_status || 'novo'}
                                onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value)}
                                className={`text-[9px] font-bold uppercase p-1.5 rounded border transition-colors outline-none ${
                                  l.lead_status === 'matriculado' ? 'bg-green-50 border-green-200 text-green-700' :
                                  l.lead_status === 'negociando' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-gray-50 border-gray-200 text-gray-600'
                                }`}
                              >
                                <option value="novo">Novo</option>
                                <option value="tentativa de contato">Tentativa de Contato</option>
                                <option value="contato inicial">Contato Inicial</option>
                                <option value="negociando">Negociando</option>
                                <option value="boleto enviado">Boleto Enviado</option>
                                <option value="matriculado">Matriculado</option>
                              </select>
                            </div>
                          )}
                        </td>
                       <td className="px-6 py-4 text-xs text-gray-600 italic">
                         {l.observacao || 'Sem observações'}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}
        
        {activeTab === 'chat' && (
          <div className="animate-in fade-in duration-300 h-full flex flex-col">
            <h2 className="text-3xl font-black text-[#003B5C] tracking-tight mb-8">
              Mesa de Atendimento {userRole === 'admin' ? '(Admin)' : userRole === 'consultor' ? '(Consultor)' : '(Carregando...)'}
            </h2>
            
            <div className="bg-white flex-1 min-h-[500px] md:min-h-0 border border-gray-200 rounded-[24px] shadow-sm flex overflow-hidden mb-6">
              
              {/* Sidebar de Chats */}
              <div className="w-1/3 min-w-[280px] border-r border-gray-100 flex flex-col bg-slate-50">
                <div className="p-2 border-b border-gray-200 bg-white">
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button 
                      onClick={() => setChatStatusTab('active')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black transition-all ${chatStatusTab === 'active' ? 'bg-white text-[#003B5C] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      ATIVOS ({adminChats.filter(c => c.status === 'active' && (userRole === 'admin' || !c.consultant_id || c.consultant_id === consultantId)).length})
                    </button>
                    <button 
                      onClick={() => setChatStatusTab('transferred_whatsapp')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black transition-all ${chatStatusTab === 'transferred_whatsapp' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      WHATSAPP ({adminChats.filter(c => c.status === 'transferred_whatsapp' && (userRole === 'admin' || c.consultant_id === consultantId)).length})
                    </button>
                    <button 
                      onClick={() => setChatStatusTab('closed')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black transition-all ${chatStatusTab === 'closed' ? 'bg-white text-gray-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      FINALIZADOS ({adminChats.filter(c => c.status === 'closed' && (userRole === 'admin' || c.consultant_id === consultantId)).length})
                    </button>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => setChatStatusTab('all')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black transition-all ${chatStatusTab === 'all' ? 'bg-[#003B5C] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        TODOS
                      </button>
                    )}
                  </div>
                </div>

                {userRole === 'admin' && (
                  <div className="px-3 pb-3 border-b border-gray-100 flex flex-col gap-2 bg-white pt-1">
                    <div className="flex gap-2">
                      <select 
                        value={chatOriginFilter}
                        onChange={(e) => setChatOriginFilter(e.target.value)}
                        className="flex-1 text-[9px] font-bold uppercase bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400 cursor-pointer"
                      >
                        <option value="">Todas Origens</option>
                        <option value="FACEBOOK">Facebook</option>
                        <option value="GOOGLE">Google</option>
                        <option value="TIKTOK">Tiktok</option>
                        <option value="DIRETO">Direto</option>
                      </select>
                      <select 
                        value={chatConsultantFilter}
                        onChange={(e) => setChatConsultantFilter(e.target.value)}
                        className="flex-1 text-[9px] font-bold uppercase bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400 cursor-pointer"
                      >
                        <option value="">Todos Consultores</option>
                        {team.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center">
                       <div className="flex-1 flex flex-col">
                         <span className="text-[7px] font-black text-gray-400 uppercase ml-1.5 mb-0.5">Início do Chat</span>
                         <input 
                           type="date" 
                           value={chatDateStart}
                           onChange={(e) => setChatDateStart(e.target.value)}
                           className="w-full text-[9px] font-bold bg-slate-50 border border-slate-200 rounded p-1 outline-none uppercase"
                         />
                       </div>
                       <div className="flex-1 flex flex-col">
                         <span className="text-[7px] font-black text-gray-400 uppercase ml-1.5 mb-0.5">Fim do Chat</span>
                         <input 
                           type="date" 
                           value={chatDateEnd}
                           onChange={(e) => setChatDateEnd(e.target.value)}
                           className="w-full text-[9px] font-bold bg-slate-50 border border-slate-200 rounded p-1 outline-none uppercase"
                         />
                       </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-auto">
                  {(() => {
                    const filtered = adminChats.filter(chat => {
                      // 1. Primeiro filtra pelo status
                      if (chatStatusTab !== 'all' && chat.status !== chatStatusTab) return false;

                      // 2. Lógica de Privacidade (Consulores)
                      if (userRole === 'consultor') {
                        if (chatStatusTab === 'active') {
                           if (chat.consultant_id && chat.consultant_id !== consultantId) return false;
                        } else {
                           if (chat.consultant_id !== consultantId) return false;
                        }
                      }

                      // 3. Filtros Avançados (Gestor)
                      if (userRole === 'admin') {
                        if (chatOriginFilter) {
                          const l = Array.isArray(chat.leads) ? chat.leads[0] : chat.leads;
                          const source = l?.utm_source?.toUpperCase() || 'DIRETO';
                          if (source !== chatOriginFilter) return false;
                        }
                        if (chatConsultantFilter && chat.consultant_id !== chatConsultantFilter) return false;
                        
                        if (chatDateStart) {
                           const start = new Date(chatDateStart);
                           start.setHours(0,0,0,0);
                           if (new Date(chat.started_at) < start) return false;
                        }
                        if (chatDateEnd) {
                           const end = new Date(chatDateEnd);
                           end.setHours(23,59,59,999);
                           if (new Date(chat.started_at) > end) return false;
                        }
                      }

                      return true;
                    });

                    filtered.sort((a, b) => {
                      if (a.is_pinned && !b.is_pinned) return -1;
                      if (!a.is_pinned && b.is_pinned) return 1;
                      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
                    });

                    if (filtered.length === 0) {
                      return <div className="p-10 text-center text-sm text-gray-400 italic">Nenhum atendimento nesta categoria.</div>;
                    }

                    return filtered.map(chat => {
                      const lData = Array.isArray(chat.leads) ? chat.leads[0] : chat.leads;
                      const statusConfig = {
                        active: { label: 'Ativo', color: 'bg-blue-100 text-blue-700' },
                        transferred_whatsapp: { label: 'WhatsApp', color: 'bg-green-100 text-green-700' },
                        closed: { label: 'Finalizado', color: 'bg-gray-100 text-gray-500' }
                      };
                      const config = statusConfig[chat.status as keyof typeof statusConfig] || { label: chat.status, color: 'bg-slate-100' };

                      return (
                        <button 
                          key={chat.id} 
                          onClick={async () => {
                            const { data: latestLead } = await supabase.from('leads').select('*').eq('id', chat.lead_id).single();
                            setSelectedAdminChat({ ...chat, leads: latestLead ? [latestLead] : [] });
                            setAdminChatMessages([]); 
                          }}
                          className={`w-full flex flex-col relative text-left p-4 border-b border-gray-100 transition-colors ${selectedAdminChat?.id === chat.id ? 'bg-white border-l-4 border-l-[#fdb913]' : 'hover:bg-white border-l-4 border-l-transparent'}`}
                        >
                          <div className="flex justify-between items-start mb-1 gap-2">
                             <div className="flex items-center gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newVal = !chat.is_pinned;
                                    supabase.from('chats').update({ is_pinned: newVal }).eq('id', chat.id).then();
                                    setAdminChats(prev => prev.map(c => c.id === chat.id ? { ...c, is_pinned: newVal } : c));
                                    if(selectedAdminChat?.id === chat.id) setSelectedAdminChat({...selectedAdminChat, is_pinned: newVal});
                                  }}
                                  className={`p-1 rounded transition-colors ${chat.is_pinned ? 'text-[#fdb913] hover:text-yellow-600 bg-yellow-50' : 'text-gray-300 hover:text-gray-500'}`}
                                  title={chat.is_pinned ? "Desfixar conversa" : "Fixar conversa"}
                                >
                                  <Pin size={12} fill={chat.is_pinned ? "currentColor" : "none"} />
                                </button>
                                <h4 className="font-bold text-[#003B5C] text-sm leading-tight">{lData?.nome || 'Lead Anônimo'}</h4>
                             </div>
                             {chatStatusTab === 'all' && (
                               <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${config.color}`}>
                                 {config.label}
                               </span>
                             )}
                          </div>

                          <div className="flex items-center gap-2 mb-1">
                            {chat.consultants && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[9px] font-bold text-blue-500 border border-blue-100">
                                {chat.consultants.nome?.split(' ')[0]}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-bold uppercase truncate">{lData?.nm_curso || 'Sem curso'}</span>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            {lData?.utm_source ? (
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded w-fit uppercase">
                                {lData?.utm_source}
                              </span>
                            ) : <div></div>}
                            
                            <div className={`flex items-center gap-1.5 ${!chat.first_response_at ? 'text-amber-500' : 'text-gray-400'}`}>
                              <Clock size={10} />
                              <span className="text-[9px] font-bold uppercase">
                                {chat.first_response_at 
                                  ? formatWaitTime(chat.started_at, chat.first_response_at) 
                                  : formatWaitTime(chat.started_at)
                                }
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Area de Conversa */}
              <div className="flex-1 flex flex-col bg-white">
                {!selectedAdminChat ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                    <MessageCircle size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-500 mb-2">Selecione um chat</h3>
                    <p className="text-gray-400 text-sm max-w-xs">Clique em um lead na lista ao lado para assumir o atendimento.</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const activeLead = Array.isArray(selectedAdminChat.leads) ? selectedAdminChat.leads[0] : selectedAdminChat.leads;
                      return (
                        <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-sm z-10">
                          <div className="flex flex-col">
                            <h4 className="font-black text-[#003B5C] text-lg">{activeLead?.nome}</h4>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5 mb-1 text-[11px] font-medium text-gray-500">
                              <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-blue-400" /> {activeLead?.nm_curso || 'Sem curso'}</span>
                              <span className="flex items-center gap-1.5"><Phone size={14} className="text-green-500" /> {activeLead?.whatsapp || 'Sem telefone'}</span>
                              <span className="flex items-center gap-1.5"><Mail size={14} className="text-amber-500" /> {activeLead?.email || 'Sem e-mail'}</span>
                              <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400" /> {activeLead?.created_at ? new Date(activeLead.created_at).toLocaleString('pt-BR') : 'Data desconhecida'}</span>
                            </div>

                            {/* Tags Area */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {leadTags.map(lt => (
                                <span key={lt.tag_id} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 uppercase">
                                  <Tag size={10} /> {lt.tags?.name}
                                  {(userRole === 'admin' || lt.assigned_by === consultantId) && (
                                    <button onClick={() => handleRemoveTag(lt.tag_id)} className="hover:text-red-500 ml-1 bg-blue-200/50 rounded-full p-0.5"><X size={8}/></button>
                                  )}
                                </span>
                              ))}
                              {leadTags.length < 5 && (
                                <div className="relative">
                                  <button onClick={() => setShowTagMenu(!showTagMenu)} className="bg-slate-100 text-slate-500 hover:bg-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 uppercase transition-colors">
                                    <Plus size={10} /> Add Tag
                                  </button>
                                  {showTagMenu && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setShowTagMenu(false)}></div>
                                      <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2">
                                         <input 
                                           type="text" 
                                           placeholder="Buscar ou criar tag (Enter)"
                                           value={newTagInput}
                                           onChange={e => setNewTagInput(e.target.value)}
                                           onKeyDown={e => { if(e.key === 'Enter') handleAddTag(newTagInput) }}
                                           className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none mb-2 focus:border-blue-400"
                                         />
                                         <div className="max-h-32 overflow-auto flex flex-col gap-1">
                                           {systemTags.filter(t => t.name.toLowerCase().includes(newTagInput.toLowerCase())).map(t => (
                                             <button key={t.id} onClick={() => handleAddTag(t.name)} className="text-left text-xs p-1.5 hover:bg-slate-50 rounded-md font-medium text-gray-700 uppercase">
                                               {t.name}
                                             </button>
                                           ))}
                                           {newTagInput && !systemTags.some(t => t.name.toLowerCase() === newTagInput.toLowerCase()) && (
                                             <button onClick={() => handleAddTag(newTagInput)} className="text-left text-xs p-1.5 hover:bg-blue-50 text-blue-600 rounded-md font-bold uppercase flex items-center gap-1">
                                               <Plus size={10} /> Criar "{newTagInput}"
                                             </button>
                                           )}
                                         </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                              <select 
                                value={activeLead?.nm_polo || ''} 
                                onChange={(e) => handleUpdateLeadPolo(selectedAdminChat.lead_id, e.target.value)}
                                className="w-fit text-[11px] text-gray-500 font-bold uppercase bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#fdb913] cursor-pointer"
                              >
                                <option value="">Selecione o Polo</option>
                                {availablePolos.map(polo => (
                                  <option key={polo} value={polo}>{polo}</option>
                                ))}
                              </select>

                              {userRole === 'admin' && (
                                <select 
                                  value={selectedAdminChat.consultant_id || ''}
                                  onChange={(e) => handleAssignChat(selectedAdminChat.id, e.target.value || null)}
                                  className="w-fit text-[11px] text-[#003B5C] font-bold uppercase bg-blue-50 border border-blue-200 rounded px-2 py-1 outline-none focus:border-[#fdb913] cursor-pointer"
                                >
                                  <option value="">Atendimento Livre</option>
                                  {team.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 shrink-0">
                               <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Oferta visualizada no Site</div>
                               <div className="text-[14px] font-black text-[#003B5C]">
                                  <span className="text-green-600">1ª {formatBRL(activeLead?.vl_primeira || 0)}</span>
                                  <span className="mx-2 text-gray-300">/</span>
                                  <span className="text-blue-600">Demais {formatBRL(activeLead?.vl_mensalidade || 0)}</span>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Tempo de Resposta */}
                              <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
                                <Clock size={12} className="text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                  {selectedAdminChat.first_response_at 
                                    ? `Respondeu em ${formatWaitTime(selectedAdminChat.started_at, selectedAdminChat.first_response_at)}`
                                    : `Esperando há ${formatWaitTime(selectedAdminChat.started_at)}`
                                  }
                                </span>
                              </div>

                              {/* Botão Assumir Atendimento */}
                              {!selectedAdminChat.consultant_id && consultantId && (
                                <button 
                                  onClick={() => handleAssignChat(selectedAdminChat.id, consultantId)}
                                  className="bg-[#003B5C] text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
                                >
                                  <Users size={12} />
                                  Assumir Atendimento
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div ref={chatScrollRef} className="flex-1 overflow-auto p-4 bg-[#F4F5F8] flex flex-col gap-3">
                      <div className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest my-2">Início do Atendimento</div>
                      {adminChatMessages.map(msg => (
                        <div key={msg.id} className={`max-w-[80%] text-sm rounded-2xl p-3 shadow-sm flex flex-col ${msg.sender_type === 'consultant' ? 'bg-[#fdb913] text-[#003B5C] self-end rounded-tr-sm font-medium' : 'bg-white border border-gray-100 text-gray-700 self-start rounded-tl-sm'}`}>
                           {msg.media_url ? (
                             msg.media_type === 'image' ? (
                               <img src={msg.media_url} alt="Midia enviada" className="max-w-[250px] rounded-lg mb-2 object-contain bg-black/5" />
                             ) : msg.media_type === 'audio' ? (
                               <audio controls src={msg.media_url} className="mb-2 max-w-[250px] h-10" />
                             ) : (
                               <a href={msg.media_url} target="_blank" rel="noreferrer" className="underline mb-2 block font-bold truncate">📎 Ver Arquivo</a>
                             )
                           ) : null}
                           <div className="mt-1 flex flex-col justify-end">
                             <div className="flex-1">{msg.content}</div>
                             <span className="text-[10px] opacity-70 whitespace-nowrap self-end mt-1 flex items-center gap-1">
                               {new Date(msg.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                               {msg.sender_type === 'consultant' && (
                                 <span className={`font-bold tracking-tighter ${msg.read_at ? 'text-blue-500' : 'text-gray-400'}`}>✓✓</span>
                               )}
                             </span>
                           </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-4 bg-white border-t border-gray-100 shrink-0 flex flex-col gap-3">
                      <div className="flex gap-2">
                        {/* Botão WhatsApp: Esconde se já for status WhatsApp */}
                        {selectedAdminChat.status !== 'transferred_whatsapp' && (
                          <button 
                            onClick={async () => {
                               const now = new Date().toISOString();
                               await supabase.from('chats').update({ status: 'transferred_whatsapp', finished_at: now }).eq('id', selectedAdminChat.id);
                               setSelectedAdminChat({ ...selectedAdminChat, status: 'transferred_whatsapp', finished_at: now });
                               setAdminChats(prev => prev.map(c => c.id === selectedAdminChat.id ? { ...c, status: 'transferred_whatsapp', finished_at: now } : c));
                            }}
                            className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-bold uppercase py-1.5 transition-colors"
                          >
                            Transferir para WhatsApp
                          </button>
                        )}

                        {/* Botão Finalizar: Esconde se já estiver fechado */}
                        {selectedAdminChat.status !== 'closed' && (
                          <button 
                            onClick={async () => {
                               const now = new Date().toISOString();
                               await supabase.from('chats').update({ status: 'closed', finished_at: now }).eq('id', selectedAdminChat.id);
                               setSelectedAdminChat({ ...selectedAdminChat, status: 'closed', finished_at: now });
                               setAdminChats(prev => prev.map(c => c.id === selectedAdminChat.id ? { ...c, status: 'closed', finished_at: now } : c));
                            }}
                            className="flex-1 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold uppercase py-1.5 transition-colors"
                          >
                            Finalizar Atendimento
                          </button>
                        )}

                        {/* Botão Reabrir: Só aparece se estiver fechado */}
                        {selectedAdminChat.status === 'closed' && (
                          <button 
                            onClick={async () => {
                               await supabase.from('chats').update({ status: 'active', finished_at: null }).eq('id', selectedAdminChat.id);
                               setSelectedAdminChat({ ...selectedAdminChat, status: 'active', finished_at: null });
                               setAdminChats(prev => prev.map(c => c.id === selectedAdminChat.id ? { ...c, status: 'active', finished_at: null } : c));
                            }}
                            className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold uppercase py-1.5 transition-colors"
                          >
                            Reabrir Atendimento
                          </button>
                        )}
                      </div>
                      <form onSubmit={sendAdminMessage} className="flex gap-2">
                        <label className="w-12 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors" title="Anexar arquivo">
                           <Paperclip size={20} />
                           <input type="file" className="hidden" accept="image/*,audio/*,video/*" onChange={handleMediaUpload} />
                        </label>
                        {isRecording ? (
                          <div className="flex-1 bg-red-50 border border-red-200 text-red-600 font-bold rounded-xl px-4 flex items-center justify-between py-3 overflow-hidden">
                            <span className="flex items-center gap-2 hidden sm:flex"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> Gravando Áudio...</span>
                            <span className="flex items-center gap-2 sm:hidden"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div></span>
                            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                              <span>00:{(recordingTime < 10 ? '0' : '') + recordingTime}</span>
                              <button type="button" onClick={() => stopRecording(true)} className="text-red-800 text-[10px] md:text-xs hover:underline uppercase font-black">X Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative flex-1 flex">
                            {showQuickMessages && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowQuickMessages(false)}></div>
                                <div className="absolute bottom-full left-0 mb-2 w-full md:w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                                  <div className="bg-slate-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase">Mensagens Rápidas</span>
                                    <button type="button" onClick={() => { setShowQuickMessages(false); setShowQuickMessagesModal(true); }} className="text-[10px] font-bold text-[#003B5C] hover:underline flex items-center gap-1">
                                      <Settings size={10} /> Gerenciar
                                    </button>
                                  </div>
                                  <div className="max-h-48 overflow-auto flex flex-col">
                                    {quickMessages.filter(qm => qm.shortcut.toLowerCase().includes(quickMessageFilter)).map(qm => (
                                      <button 
                                        key={qm.id} 
                                        type="button"
                                        onClick={() => {
                                          setAdminChatInput(qm.content);
                                          setShowQuickMessages(false);
                                        }}
                                        className="text-left p-3 border-b border-gray-50 hover:bg-slate-50 transition-colors flex flex-col gap-1"
                                      >
                                        <span className="text-xs font-black text-[#003B5C]">/{qm.shortcut}</span>
                                        <span className="text-[11px] text-gray-500 line-clamp-2">{qm.content}</span>
                                      </button>
                                    ))}
                                    {quickMessages.filter(qm => qm.shortcut.toLowerCase().includes(quickMessageFilter)).length === 0 && (
                                      <div className="p-4 text-center text-xs text-gray-400">Nenhum atalho encontrado.</div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                            <input 
                              type="text" 
                              value={adminChatInput}
                              onChange={e => {
                                const val = e.target.value;
                                setAdminChatInput(val);
                                if (val.startsWith('/')) {
                                  setShowQuickMessages(true);
                                  setQuickMessageFilter(val.slice(1).toLowerCase());
                                } else {
                                  setShowQuickMessages(false);
                                }
                              }}
                              placeholder="Responda o lead... (Digite / para mensagens rápidas)" 
                              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[#003B5C] focus:ring-2 focus:ring-[#003B5C]/10 py-3" 
                            />
                          </div>
                        )}
                        
                        {!isRecording && adminChatInput.trim() ? (
                           <button type="submit" className="w-12 h-12 shrink-0 rounded-xl bg-[#003B5C] text-white flex items-center justify-center hover:bg-[#004b8d] transition-colors">
                             <ArrowRight size={20} />
                           </button>
                        ) : isRecording ? (
                           <button type="button" onClick={() => stopRecording(false)} className="w-12 h-12 shrink-0 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors animate-pulse">
                             <ArrowRight size={20} />
                           </button>
                        ) : (
                           <button type="button" onClick={startRecording} className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                             <Mic size={20} />
                           </button>
                        )}
                      </form>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        )}

        {activeTab === 'team' && userRole === 'admin' && (
          <div className="animate-in fade-in duration-300 h-full flex flex-col">
            <h2 className="text-3xl font-black text-[#003B5C] tracking-tight mb-8">Gestão de Equipe</h2>
            
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-[#003B5C]">Membros da Equipe ({team.length})</h3>
                  <p className="text-[11px] text-gray-400 font-bold uppercase">Crie usuários novos no painel Auth do Supabase</p>
               </div>
               
               <table className="w-full text-left">
                 <thead>
                   <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                     <th className="px-8 py-4 font-black">Nome</th>
                     <th className="px-8 py-4 font-black">Cargo</th>
                     <th className="px-8 py-4 font-black">Status</th>
                     <th className="px-8 py-4 font-black">Ações</th>
                   </tr>
                 </thead>
                 <tbody>
                   {team.map(member => (
                     <tr key={member.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                       <td className="px-8 py-4">
                         <div className="flex items-center gap-2 group">
                            <input 
                              type="text"
                              defaultValue={member.nome}
                              onBlur={(e) => updateUserName(member.id, e.target.value)}
                              className="font-bold text-[#003B5C] bg-transparent border-b border-transparent focus:border-[#fdb913] hover:bg-white/50 px-2 py-1 rounded outline-none transition-all w-full max-w-[200px]"
                            />
                            {member.user_id === session.user.id && <span className="text-[10px] text-gray-400 font-bold">(Você)</span>}
                         </div>
                       </td>
                       <td className="px-8 py-4">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${member.role === 'admin' ? 'bg-blue-100 text-[#003B5C]' : 'bg-green-100 text-green-700'}`}>
                           {member.role}
                         </span>
                       </td>
                       <td className="px-8 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${onlineConsultantNames.has(member.nome) ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            <span className="text-xs text-gray-500 font-medium">{onlineConsultantNames.has(member.nome) ? 'Disponível' : 'Offline'}</span>
                          </div>
                       </td>
                       <td className="px-8 py-4">
                         {member.user_id !== session.user.id && (
                           <button 
                             onClick={() => toggleUserRole(member.id, member.role)}
                             className="text-[11px] font-black text-[#004b8d] hover:underline"
                           >
                             Mudar para {member.role === 'admin' ? 'Consultor' : 'Admin'}
                           </button>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

      </div>

      {/* Modal Mensagens Rápidas */}
      {showQuickMessagesModal && (
        <div className="fixed inset-0 bg-[#001D2D]/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[24px] w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-6 shrink-0">
               <h3 className="text-xl font-black text-[#003B5C]">Mensagens Rápidas</h3>
               <button onClick={() => setShowQuickMessagesModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
             </div>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 shrink-0">
               <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Criar Novo Atalho</h4>
               <div className="flex flex-col gap-3">
                 <input type="text" placeholder="Atalho (ex: ola)" value={newQmShortcut} onChange={e => setNewQmShortcut(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} className="w-full text-sm p-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#003B5C]" />
                 <textarea placeholder="Conteúdo da mensagem..." value={newQmContent} onChange={e => setNewQmContent(e.target.value)} rows={3} className="w-full text-sm p-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#003B5C] resize-none" />
                 <button 
                   onClick={async () => {
                     if (!newQmShortcut || !newQmContent) return;
                     const { data } = await supabase.from('quick_messages').insert([{ shortcut: newQmShortcut.toLowerCase(), content: newQmContent, consultant_id: consultantId }]).select().single();
                     if (data) {
                       setQuickMessages(prev => [...prev, data]);
                       setNewQmShortcut(''); setNewQmContent('');
                     }
                   }}
                   className="bg-[#003B5C] text-white font-bold text-xs uppercase py-2 rounded-lg hover:bg-[#004b8d] transition-colors"
                 >
                   Salvar Atalho
                 </button>
               </div>
             </div>

             <div className="overflow-auto flex flex-col gap-2 flex-1 pr-2">
               {quickMessages.filter(qm => qm.consultant_id === consultantId).map(qm => (
                 <div key={qm.id} className="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-start gap-4 shadow-sm">
                   <div className="flex flex-col">
                     <span className="text-xs font-black text-[#003B5C]">/{qm.shortcut}</span>
                     <span className="text-[11px] text-gray-500 whitespace-pre-wrap">{qm.content}</span>
                   </div>
                   <button 
                     onClick={async () => {
                       await supabase.from('quick_messages').delete().eq('id', qm.id);
                       setQuickMessages(prev => prev.filter(q => q.id !== qm.id));
                     }}
                     className="text-red-400 hover:text-red-600 p-1 shrink-0"
                   >
                     <X size={14} />
                   </button>
                 </div>
               ))}
               {quickMessages.filter(qm => qm.consultant_id === consultantId).length === 0 && (
                 <div className="text-center text-gray-400 text-xs py-4">Você ainda não possui atalhos salvos.</div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

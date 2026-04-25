import React, { useState, useEffect } from 'react';
import { fetchCursoConteudo } from '../lib/api';
import { Calendar, BookOpen, GraduationCap, ChevronDown, ChevronUp, PlayCircle, Briefcase, HelpCircle, School, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CourseDetailsProps {
  course: any;
  pricingData?: any;
}

export function CourseDetails({ course, pricingData }: CourseDetailsProps) {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Accordion states applied only for specific interactive sections
  const [openMatriz, setOpenMatriz] = useState(false);
  const [openFaq, setOpenFaq] = useState(false);
  
  const [openModulo, setOpenModulo] = useState<number>(0);
  const [openFaqItem, setOpenFaqItem] = useState<number | null>(null);
  const [showAllModules, setShowAllModules] = useState<boolean>(false);

  useEffect(() => {
    if (!course) return;
    setLoading(true);
    setOpenMatriz(false);
    setOpenFaq(false);
    setShowAllModules(false);
    
    // Derived values
    const slug = course.cdUrlCurso || undefined;
    const nmClean = course.nmCurso.replace(/\s*\(.*?\)/g, '').trim();

    fetchCursoConteudo(course.idCurso, slug, nmClean)
      .then(data => setContent(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [course]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-[#003B5C] bg-white rounded-[32px] shadow-sm mb-12 border border-gray-100">
         <div className="w-12 h-12 border-4 border-blue-100 border-t-[#003B5C] rounded-full animate-spin mb-4"></div>
         <p className="font-bold tracking-wide">Buscando grade curricular e detalhes do curso...</p>
      </div>
    );
  }

  if (!content) return null;

  const { curso: dCurso, description, faq, videoId, matriz } = content;
  
  // Duração: preferir dsDuracao_real (obtido do /view/info) ou calcular de dsDuracao
  const durRealStr: string | undefined = dCurso?.dsDuracao_real; // ex: "10 meses"
  const durMesesAPI = parseInt(dCurso?.dsDuracao || 0);
  const durMeses = durMesesAPI;
  const formatDuracao = (meses: number, realStr?: string): string => {
    if (realStr) return realStr; // usa o valor real do site (ex: "10 meses")
    if (!meses) return '—';
    if (meses < 12) return `${meses} meses`;
    const anos = Math.floor(meses / 12);
    const resto = meses % 12;
    return resto > 0 ? `${anos} ano${anos > 1 ? 's' : ''} e ${resto} meses` : `${anos} ano${anos > 1 ? 's' : ''}`;
  };
  const durAnos = formatDuracao(durMeses, durRealStr);
  const modRaw   = dCurso?.dsModalidade || dCurso?.cdModalidade || dCurso?.cdGrupoCurso || '';
  const nmLower = course?.nmCurso?.toLowerCase() || '';
  const hardcodedSemiArray = ['semipresencial', 'hibrido', 'híbrido', 'biomedicina', 'enfermagem', 'farmácia', 'fisioterapia', 'nutrição', 'odontologia', 'arquitetura', 'estética'];
  const isSemi = pricingData?._isSemipresencial || dCurso?._isSemipresencial || modRaw.toLowerCase().includes('hibrido') || modRaw.toLowerCase().includes('semipresencial') || hardcodedSemiArray.some(k => nmLower.includes(k));
  const modLabel = isSemi ? 'EAD Semipresencial' : '100% Online (EAD)';
  const grauLabel = dCurso?.dsGrau || modRaw || '—';
  const nichoRaw = dCurso?.nicho?.nmNicho || '';
  const nicho = nichoRaw.replace(/Sade/g, 'Saúde');

  // Mercado/Onde Trabalhar
  let mercadoText = '';
  let mercadoChips: string[] = [];
  const ondefaq = (faq || []).find((f: any) =>
    f.pergunta?.toLowerCase().includes('area') ||
    f.pergunta?.toLowerCase().includes('área') ||
    f.pergunta?.toLowerCase().includes('atuação')
  );
  if (ondefaq) {
    mercadoText = ondefaq.resposta || '';
    const chips = mercadoText.match(/[A-ZÁÉÍÓÚ][^,.;]{5,40}(?= e | ou |,|;)/g) || [];
    mercadoChips = [...new Set(chips)].slice(0, 10) as string[];
  }

  // Gerar descrição padrão quando a API não retorna texto
  const nmCurso = course?.nmCurso || dCurso?.nmCurso || '';
  const isPos = course?.idCurso?.startsWith('EPOS_');
  const isTec = course?.idCurso?.startsWith('ETEC_');
  const areaLabel = nicho || '';
  const durStr = durMeses ? `${durMeses} meses` : '';
  
  const generateFallbackDescription = () => {
    if (isPos) {
      const grauStr = grauLabel && grauLabel !== '—' ? grauLabel.toLowerCase() : 'especialização';
      return `A ${grauStr} em ${nmCurso} da UniCesumar foi desenvolvida para profissionais que desejam aprofundar seus conhecimentos e se destacar no mercado de trabalho${areaLabel ? ` na área de ${areaLabel}` : ''}. O curso combina conteúdo atualizado com metodologia ativa e 100% online, permitindo que você estude no seu ritmo sem abrir mão da qualidade.${durStr ? ` Com duração de ${durStr}, o programa foi estruturado para oferecer uma formação completa e prática.` : ''} A UniCesumar é reconhecida pelo MEC com nota máxima e conta com corpo docente de mestres e doutores experientes no mercado.`;
    }
    if (isTec) {
      return `O curso técnico em ${nmCurso} da UniCesumar prepara profissionais qualificados para atuar com excelência no mercado. Com metodologia prática e conteúdo atualizado, você adquire as competências necessárias para início imediato na área de atuação escolhida.${durStr ? ` Duração: ${durStr}.` : ''}`;
    }
    return '';
  };

  const displayDescription = description || generateFallbackDescription() || null;

  return (
    <div className="flex flex-col gap-12 mt-10">
      
      {/* 1. Highlights Row (Clean Minimalist View) */}
      <div className="bg-white rounded-[24px] p-2 shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden">
         <div className="flex-1 py-8 px-6 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-100">
            <Calendar className="text-[#fdb913] mb-4" size={32} />
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duração do curso</div>
            <div className="text-[#003B5C] font-black text-xl">{durAnos}</div>
         </div>
         <div className="flex-1 py-8 px-6 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-100">
            <BookOpen className="text-[#fdb913] mb-4" size={32} />
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Material Didático</div>
            <div className="text-[#003B5C] font-black text-xl">Digital ou Impresso</div>
         </div>
         <div className="flex-1 py-8 px-6 flex flex-col items-center justify-center text-center">
            <GraduationCap className="text-[#fdb913] mb-4" size={32} />
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Corpo Docente</div>
            <div className="text-[#003B5C] font-black text-xl">Mestres e Doutores</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 items-start">
        
        {/* Left Column for Descriptions */}
        <div className="flex flex-col gap-12">
           
           {/* Section: Sobre o curso (Flat Section) */}
           <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003B5C] flex items-center justify-center">
                   <School size={20} />
                 </div>
                 <h2 className="text-[28px] font-black text-[#003B5C] tracking-tight">Sobre o curso</h2>
              </div>
              <div className="text-gray-600 leading-[1.8] text-[16px]" dangerouslySetInnerHTML={{ __html: (displayDescription || 'Informações do curso em breve.').replace(/\n/g, '<br><br>') }} />
              
              {/* Onde você pode trabalhar (Flat Section seamlessly integrated) */}
              {mercadoText && (
                <div className="mt-8 bg-[#F8FAFC] rounded-[24px] p-8 border border-gray-100 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
                   <div className="flex items-center gap-3 mb-6 relative z-10">
                     <div className="w-10 h-10 rounded-xl bg-white text-[#fdb913] flex items-center justify-center shadow-sm">
                       <Briefcase size={20} />
                     </div>
                     <h2 className="text-[24px] font-black text-[#003B5C] tracking-tight">E o mercado de trabalho?</h2>
                   </div>
                   <p className="text-gray-600 leading-[1.7] text-[15px] mb-6 relative z-10">{mercadoText}</p>
                   
                   {mercadoChips.length > 0 && (
                     <div className="flex flex-wrap gap-2 relative z-10">
                       {mercadoChips.map((c, i) => (
                         <span key={i} className="bg-white text-[#003B5C] border border-gray-200 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                           <CheckCircle2 size={14} className="text-[#10B981]" /> {c.trim()}
                         </span>
                       ))}
                     </div>
                   )}
                </div>
              )}
           </div>

        </div>

        {/* Right Column: Key Details & Video */}
        <div className="flex flex-col gap-8 w-full sticky top-[100px]">
           {/* Detailed Characteristics Box */}
           <div className="bg-white rounded-[24px] p-8 shadow-[0_20px_40px_-15px_rgba(0,59,92,0.06)] border border-gray-100">
              <h3 className="text-[18px] font-extrabold text-[#003B5C] mb-6">Ficha Técnica</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between py-3 border-b border-gray-100 last:border-0 border-dashed">
                  <span className="text-sm text-gray-500 font-medium">Modalidade</span>
                  <div className="inline-flex bg-slate-100 text-[#003B5C] px-3 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider border border-gray-200 shadow-sm items-center">
                    <GraduationCap size={14} className="mr-1 text-gray-500" />
                    {modLabel}
                  </div>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100 last:border-0 border-dashed">
                  <span className="text-sm text-gray-500 font-medium">Grau</span>
                  <span className="text-sm text-[#003B5C] font-bold text-right uppercase">{grauLabel}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100 last:border-0 border-dashed">
                  <span className="text-sm text-gray-500 font-medium">Duração</span>
                  <span className="text-sm text-[#003B5C] font-bold text-right">{durAnos}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100 last:border-0 border-dashed">
                  <span className="text-sm text-gray-500 font-medium">Área</span>
                  <span className="text-sm text-[#003B5C] font-bold text-right">{nicho || '—'}</span>
                </div>
              </div>
           </div>

           {/* Video */}
           {videoId && (
              <div className="bg-white rounded-[24px] p-4 shadow-[0_20px_40px_-15px_rgba(0,59,92,0.06)] border border-gray-100">
                <div className="flex items-center gap-2 mb-4 px-2">
                   <PlayCircle size={18} className="text-[#fdb913]" />
                   <h3 className="text-[15px] font-extrabold text-[#003B5C]">Preview do Curso</h3>
                </div>
                <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video">
                  <iframe 
                    className="absolute inset-0 w-full h-full border-0" 
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} 
                    allowFullScreen 
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
           )}
        </div>
      </div>

      {/* Accordions Section (Matriz & FAQ) Placed centrally below */}
      <div className="w-full flex flex-col gap-6 mt-6 border-t border-gray-100 pt-16 max-w-[900px] mx-auto">
         
         <div className="text-center mb-4">
           <h2 className="text-[36px] font-black text-[#003B5C] tracking-tight">O que você vai estudar</h2>
           <p className="text-gray-500 mt-2">Veja os módulos desenhados para acelerar a sua carreira.</p>
         </div>

         {/* Section: Matriz Curricular (Accordion) */}
         {Array.isArray(matriz) && matriz.length > 0 && (
           <AccordionCard 
             title="Matriz curricular detalhada" 
             icon={<BookOpen />} 
             isOpen={openMatriz} 
             onToggle={() => setOpenMatriz(!openMatriz)}
           >
             <div className="space-y-4">
               {(showAllModules ? matriz : matriz.slice(0, 5)).map((mod: any, idx: number) => (
                 <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                   <button 
                     onClick={() => setOpenModulo(openModulo === idx ? -1 : idx)}
                     className="w-full bg-[#FAFAFA] hover:bg-gray-50 px-6 py-5 flex items-center justify-between transition-colors"
                   >
                     <div className="flex items-center gap-4">
                        <span className="font-black text-[#003B5C] text-[16px]">{mod.nrSerieIdeal || (idx + 1)}º Módulo</span>
                        <span className="text-[11px] font-bold text-[#003B5C] bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">{mod.disciplinas?.length || 0} disciplinas</span>
                     </div>
                     {openModulo === idx ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                   </button>
                   <AnimatePresence>
                     {openModulo === idx && (
                       <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                         <div className="px-6 py-4">
                          {mod.disciplinas?.map((d: any, dIdx: number) => (
                            <div key={dIdx} className="py-3.5 text-[15px] text-gray-600 border-b border-gray-100 last:border-0 flex items-center gap-3 font-medium">
                              <CheckCircle2 size={16} className="text-[#10B981] opacity-70 shrink-0" />
                              {d.nmDisciplina.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, (l: string) => l.toUpperCase())}
                            </div>
                          ))}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
               ))}

               {matriz.length > 5 && (
                 <button
                   onClick={() => setShowAllModules(!showAllModules)}
                   className="w-full mt-6 py-4 border-2 border-[#003B5C] text-[#003B5C] font-black uppercase text-[13px] tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-[#003B5C] hover:text-white transition-all duration-300"
                 >
                   {showAllModules ? 'Mostrar menos' : `Liberar todos os ${matriz.length} módulos`}
                   {showAllModules ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                 </button>
               )}
             </div>
           </AccordionCard>
         )}

         {/* Section: FAQ (Accordion) */}
         {Array.isArray(faq) && faq.length > 0 && (
            <AccordionCard 
              title="Perguntas Frequentes (FAQ)" 
              icon={<HelpCircle />} 
              isOpen={openFaq} 
              onToggle={() => setOpenFaq(!openFaq)}
            >
               <div className="space-y-2">
                {faq.map((item: any, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-2xl bg-white mb-2 overflow-hidden hover:shadow-md transition-shadow">
                    <button 
                      onClick={() => setOpenFaqItem(openFaqItem === i ? null : i)}
                      className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 group"
                    >
                       <span className="font-extrabold text-[#003B5C] text-[16px] leading-snug pt-0.5 group-hover:text-blue-700 transition-colors">{item.pergunta}</span>
                       <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                         {openFaqItem === i ? <ChevronUp size={18} className="text-[#fdb913]" /> : <ChevronDown size={18} className="text-gray-400" />}
                       </div>
                    </button>
                    <AnimatePresence>
                      {openFaqItem === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <p className="text-gray-500 text-[15px] leading-[1.7] px-6 pb-6 pt-2">{item.resposta}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </AccordionCard>
         )}
      </div>

    </div>
  );
}

// Minimal Accordion Card
function AccordionCard({ title, icon, isOpen, onToggle, children }: any) {
  return (
    <div className="bg-white rounded-[24px] shadow-[0_10px_30px_-15px_rgba(0,59,92,0.06)] overflow-hidden border border-gray-200">
      <button 
        onClick={onToggle}
        className="w-full px-6 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors select-none"
      >
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003B5C] flex items-center justify-center">
              {icon}
            </div>
            <h3 className="font-black text-[#003B5C] text-[22px] tracking-tight">{title}</h3>
         </div>
         <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-[#fdb913] text-white' : 'bg-gray-100 text-gray-400'}`}>
            {isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
         </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-6 md:p-8 bg-[#F8FAFC]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

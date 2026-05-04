import React, { useState, useEffect } from 'react';
import { LeadForm } from './components/LeadForm';
import { CourseDetails } from './components/CourseDetails';
import { SecondaryEnrollmentCTA } from './components/SecondaryEnrollmentCTA';
import { Institutional } from './components/Institutional';
import { Loader2, GraduationCap, BookOpen, ThumbsUp, BookOpenCheck, Briefcase, Smartphone, Users, MapPin } from 'lucide-react';
import { fetchCursoConteudo } from './lib/api';
import { UtmTracker } from './components/UtmTracker';

export default function App() {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [pricingData, setPricingData] = useState<any>(null);
  const [cursoDetalhado, setCursoDetalhado] = useState<any>(null);
  const [leadData, setLeadData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    horario: '',
    observacao: ''
  });

  useEffect(() => {
    if (selectedCourse?.idCurso) {
      const slug = selectedCourse.cdUrlCurso || undefined;
      const nmClean = selectedCourse.nmCurso.replace(/\s*\(.*?\)/g, '').trim();

      fetchCursoConteudo(selectedCourse.idCurso, slug, nmClean)
        .then(data => setCursoDetalhado(data?.curso))
        .catch(() => setCursoDetalhado(null));
    } else {
      setCursoDetalhado(null);
    }
  }, [selectedCourse]);

  const formatBRL = (val: number) => 'R$ ' + parseFloat(String(val)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleLeadSuccess = () => {
    // Scroll to success optionally or keep user where they are
  };

  const getModalidadeFormatada = (data: any) => {
    if (!data || !data.curso) return '';
    const name = (data.curso.nmCurso || '').toLowerCase();
    const modalidadeStr = (data.curso.dsModalidade || data.curso.cdModalidade || data.curso.modalidade || cursoDetalhado?.dsModalidade || cursoDetalhado?.cdModalidade || cursoDetalhado?.cdGrupoCurso || '').toLowerCase();

    const combinedStr = name + " " + modalidadeStr;

    let modalidadeEspecifica = 'EAD';
    if (combinedStr.includes('semipresencial') || combinedStr.includes('híbrido') || combinedStr.includes('hibrido') || data.preco?._isSemipresencial || cursoDetalhado?._isSemipresencial) {
      modalidadeEspecifica = 'EAD Semipresencial';
    }

    if (data.tipo === 'EGRAD') return `Graduação (${modalidadeEspecifica})`;
    if (data.tipo === 'EPOS') return `Pós-Graduação (${modalidadeEspecifica})`;
    if (data.tipo === 'ESPRE') return 'Extensão';

    return `Formação (${modalidadeEspecifica})`;
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] text-[#1a1a1a] font-sans selection:bg-[#003B5C] selection:text-white flex flex-col items-center overflow-x-hidden">
      <UtmTracker />
      
      {/* Floating Island Header */}
      <div className="w-full flex justify-center fixed top-6 z-[100] px-4 md:px-0 pointer-events-none">
        <header className="pointer-events-auto w-full max-w-[1100px] h-[96px] md:h-[110px] bg-white rounded-[40px] shadow-[0_15px_40px_-10px_rgba(0,59,92,0.15)] flex items-center justify-between px-6 md:px-10 border border-gray-100">

          {/* Logo Area */}
          <div className="flex items-center min-w-0 pr-4">
            <img src="/imagens/logo_fundobranco.png" alt="UniCesumar" className="h-[72px] md:h-[90px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            {/* Fallback caso a imagem não carregue durante o dev */}
            <div className="hidden text-[20px] md:text-[24px] font-[900] text-[#003B5C] uppercase tracking-tighter items-center gap-2">
              <span>UNI<span className="text-[#fdb913]">CESUMAR</span></span>
            </div>
          </div>

          {/* CTA Mobile & Desktop */}
          <div className="flex items-center pl-4">
            <a href="#form" className="px-6 md:px-10 py-3 md:py-3.5 bg-transparent border-[2px] border-[#003B5C] text-[#003B5C] font-black text-[12px] md:text-[14px] uppercase tracking-[0.1em] rounded-full hover:bg-[#003B5C] hover:text-white transition-all shadow-sm whitespace-nowrap">
              Quero me matricular
            </a>
          </div>
        </header>

      </div>

      {/* Main Content - Modern Clean Layout */}
      <main className="flex-1 w-full relative flex flex-col">

        {/* Hero Section Container (Responsive to content height) */}
        <section className="relative w-full pt-[180px] pb-4 md:pb-16 min-h-screen flex items-center">

          {/* Background Responsive Image (Dark Original) + Bottom Fade Overlay */}
          <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
            <div
              className="absolute inset-0 w-full h-full bg-fixed"
              style={{ backgroundImage: 'url(/imagens/fundo_unicesumar.png)', backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}
            ></div>
            {/* Escurecimento sutil apenas no topo p/ destaque e blend no final para o Azul Unicesumar */}
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#003B5C]/50 to-[#003B5C]"></div>
          </div>

          <div className="max-w-[1360px] mx-auto w-full z-10 px-6 md:px-16 pt-4 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-16 lg:gap-24 items-start relative">

            {/* Left Column: Typography Heavy & Trust (Dark Mode Version) */}
            <div className="flex flex-col pt-4 lg:pt-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 mb-8">
                <span className="w-2 h-2 rounded-full bg-[#fdb913] animate-pulse shadow-[0_0_10px_#fdb913]"></span>
                <span className="text-white font-bold text-[20px] uppercase tracking-[0.15em] drop-shadow-md">
                  Inscrições Abertas 2026
                </span>
              </div>

              <h1 className="text-[52px] md:text-[68px] lg:text-[76px] font-black text-white mb-8 leading-[1.02] tracking-[-0.03em] drop-shadow-lg">
                Dê o próximo passo. <br className="hidden md:block" />
                A melhor <span className="text-[#fdb913]">EAD e Semipresencial</span> <br className="hidden md:block" />
                do Brasil.
              </h1>

              <p className="text-[18px] md:text-[22px] text-blue-50 leading-[1.6] max-w-[540px] font-medium mb-16 drop-shadow-md opacity-90">
                Flexibilidade total com a mesma excelência de ensino presencial. Metodologia ativa, nota máxima no MEC e a sua carreira acelerada de verdade.
              </p>

              {/* Trust Logos / Minimal Stats Area */}
              <div className="flex flex-col gap-5 pt-8 border-t border-white/20">
                <span className="text-[12px] font-bold text-blue-200 uppercase tracking-widest drop-shadow-sm">Nossos Diferenciais</span>
                <div className="flex flex-wrap items-center gap-10 opacity-90">
                  {/* Item 1 */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-start drop-shadow-md">
                      <span className="text-[28px] font-black text-white leading-none tracking-tighter">Nota 5</span>
                      <span className="text-[13px] font-bold text-blue-200">MEC</span>
                    </div>
                  </div>
                  {/* Item 2 */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-start drop-shadow-md">
                      <span className="text-[28px] font-black text-white leading-none tracking-tighter">1.2k+</span>
                      <span className="text-[13px] font-bold text-blue-200">Polos pelo polo do Brasil</span>
                    </div>
                  </div>
                  {/* Item 3 */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-start drop-shadow-md">
                      <span className="text-[28px] font-black text-white leading-none tracking-tighter">120+</span>
                      <span className="text-[13px] font-bold text-blue-200">Cursos disponíveis</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Modern UI (Lead Form + Pricing) */}
            <div id="form" className="w-full flex flex-col gap-8 relative z-20">
              {/* Lead Form - Clean Bento Style */}
              <div className="rounded-[32px] bg-white p-2 shadow-[0_20px_40px_-15px_rgba(0,59,92,0.08)] border border-gray-100/50 relative overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-100">
                {/* Decorative subtle gradient background inside card */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 -z-10"></div>
                <LeadForm
                  leadData={leadData}
                  setLeadData={setLeadData}
                  onCourseSelect={setSelectedCourse}
                  onLeadSuccess={handleLeadSuccess}
                  onPricingUpdate={setPricingData}
                />
              </div>

              {/* Pricing Box was moved inside LeadForm.tsx for optimal UX */}
            </div>
          </div>
        </section>

        {/* Dynamic Course Details Modal Box Rendering */}
        {selectedCourse && (
          <>
            <div id="course-details" className="max-w-[1300px] mx-auto w-full px-4 md:px-8 mt-12 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 scroll-mt-[120px]">
              <CourseDetails course={selectedCourse} pricingData={pricingData} />
            </div>
            
            <SecondaryEnrollmentCTA 
              selectedCourse={selectedCourse}
              pricingData={pricingData}
              leadData={leadData}
              setLeadData={setLeadData}
              onLeadSuccess={handleLeadSuccess}
            />
          </>
        )}

        {/* Dynamic Dark Blue Section Full Width (Bento Extension - Optional depending on future needs) */}
        <div className="w-full bg-[#001D2D] border-t border-white/5 text-white py-24 px-6 md:px-16 flex justify-center">
          <div className="max-w-[1000px] w-full text-center flex flex-col items-center">
            <span className="text-[#fdb913] font-bold text-[20px] uppercase tracking-[0.2em] mb-6">Por que escolher a UniCesumar?</span>
            <h2 className="text-[36px] md:text-[48px] font-black leading-tight tracking-tight mb-16">
              Experiência que acompanha a evolução da sua carreira.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left">
              <div className="bg-white/5 border border-white/10 p-8 rounded-[24px] hover:bg-white/10 transition-colors">
                <div className="text-[40px] font-bold text-white/20 mb-4">1</div>
                <h4 className="text-[18px] font-bold mb-3">Material Gratuito</h4>
                <p className="text-[15px] text-blue-100/70 font-medium">Livrso, e-books e laboratórios virtuais sem custo adicional para o aluno.</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-[24px] hover:bg-white/10 transition-colors">
                <div className="text-[40px] font-bold text-white/20 mb-4">2</div>
                <h4 className="text-[18px] font-bold mb-3">Mundo real na prática</h4>
                <p className="text-[15px] text-blue-100/70 font-medium">Conteúdos imersivos desenhados por profissionais ativos nas maiores empresas.</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-[24px] hover:bg-white/10 transition-colors">
                <div className="text-[40px] font-bold text-white/20 mb-4">3</div>
                <h4 className="text-[18px] font-bold mb-3">Suporte a qualquer hora</h4>
                <p className="text-[15px] text-blue-100/70 font-medium">Fale com a tutoria em tempo hábil para tirar dúvidas das disciplinas.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Info */}
      <Institutional />

      <div className="w-full bg-[#00263f] text-white overflow-hidden relative border-t border-[#003B5C] mt-20 pt-8 shadow-[0_-20px_50px_-10px_rgba(0,38,63,0.5)]">
        <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-[#fdb913] via-[#ff9100] to-[#fdb913]"></div>

        {/* Subtle lighting effects */}
        <div className="absolute right-0 top-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, #FFFFFF 0%, transparent 50%)' }}></div>
        <div className="absolute bottom-[-10%] left-[50%] -translate-x-1/2 w-[600px] h-[300px] bg-[#fdb913]/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1360px] mx-auto px-6 md:px-16 py-16 md:py-24 relative z-10 flex flex-col items-center">

          <div className="max-w-4xl text-center mb-16 md:mb-20">
            <h3 className="text-[36px] md:text-[48px] font-black leading-[1.05] tracking-tight mb-6">
              A Maior e Melhor Opção para o Seu Futuro.
            </h3>
            <p className="text-blue-100/80 text-[18px] md:text-[22px] font-medium leading-[1.6]">
              Junte-se a mais de 400 mil alunos em todo o Brasil e evolua sua carreira hoje com a excelência UniCesumar.
            </p>
          </div>

          <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: <GraduationCap size={28} />, val: '+ 120', lbl: 'Cursos de graduação' },
              { icon: <BookOpen size={28} />, val: '+ 100', lbl: 'Cursos de pós-graduação' },
              { icon: <ThumbsUp size={28} />, val: '90%', lbl: 'Indicariam a instituição' },
              { icon: <BookOpenCheck size={28} />, val: 'Digital', lbl: 'Material Exclusivo' },
              { icon: <Briefcase size={28} />, val: '88%', lbl: 'Alunos Empregados' },
              { icon: <Smartphone size={28} />, val: 'App', lbl: 'Exclusivo (iOS/Android)' },
              { icon: <Users size={28} />, val: '80%', lbl: 'De mestres/doutores' },
              { icon: <MapPin size={28} />, val: '+ 1.3K', lbl: 'Polos no exterior' }
            ].map((s, i) => (
              <div key={i} className="flex flex-col justify-center items-center text-center p-8 bg-white/5 border border-white/10 rounded-[28px] backdrop-blur-md hover:bg-[#003B5C]/80 hover:border-blue-300/30 transition-all duration-300 group shadow-[0_10px_30px_-15px_rgba(0,0,0,0.2)]">
                <div className="text-[#fdb913] mb-6 bg-white/5 w-14 h-14 rounded-[16px] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform shadow-sm">
                  {s.icon}
                </div>
                <div className="font-black tracking-tighter text-white text-[32px] md:text-[40px] leading-none mb-3">
                  {s.val}
                </div>
                <div className="text-[12px] md:text-[14px] text-blue-100/70 font-bold uppercase tracking-wider leading-[1.4]">
                  {s.lbl}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actual Copyright Footer */}
        <footer className="py-8 bg-[#001D2D] text-blue-100/40 flex flex-col md:flex-row items-center justify-center text-[13px] text-center border-t border-white/5 mt-8 px-6">
          <span>© {new Date().getFullYear()} UniCesumar - Centro Universitário Cesumar. Todos os direitos reservados.</span>
        </footer>
      </div>

      {/* Floating WhatsApp Button (Rota de Fuga) */}
      <a 
        href={`https://wa.me/5521970913117?text=${encodeURIComponent("Olá! Vim pelo site da UniCesumar e gostaria de tirar umas dúvidas sobre as bolsas e os cursos disponíveis.")}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-[100px] right-6 z-[999] bg-[#25D366] text-white w-16 h-16 rounded-full shadow-[0_10px_30px_-5px_rgba(37,211,102,0.6)] hover:scale-110 hover:shadow-[0_15px_40px_-5px_rgba(37,211,102,0.8)] transition-all flex items-center justify-center group"
      >
        <span className="absolute right-full mr-4 bg-white text-gray-800 text-[13px] font-bold px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Dúvidas? Fale conosco!
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
        </svg>
      </a>
    </div>
  );
}

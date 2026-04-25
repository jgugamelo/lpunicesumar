import React, { useState } from 'react';
import { 
  Play, MonitorPlay, Award, GraduationCap, Clock, Gamepad2, 
  Smartphone, CalendarDays, BookOpen, ThumbsUp, Briefcase, Users, MapPin, 
  BookOpenCheck
} from 'lucide-react';

export function Institutional() {
  const [activeVideo, setActiveVideo] = useState({
    id: 'nj3mlzz1Tno',
    caption: 'Descubra Polos completos e experiências imersivas para atualizar seu futuro com sucesso.'
  });

  const playlist = [
    { id: 'nj3mlzz1Tno', title: 'Descubra Polos completos e experiências imersivas', caption: 'Descubra Polos completos e experiências imersivas para atualizar seu futuro com sucesso.' },
    { id: '_3UpWoejl2k', title: 'Graduação EAD e Semipresencial', caption: 'Graduação EAD e Semipresencial UniCesumar.' },
    { id: 'tJugko3iO0o', title: 'Educação que transforma realidades', caption: 'Educação que transforma realidades.' },
    { id: 'vQYHRS6w5Es', title: 'Graduação EAD Unicesumar', caption: 'Graduação EAD Unicesumar: estrutura completa para seu futuro.' }
  ];

  return (
    <div className="py-24 w-full bg-transparent">
      <div className="max-w-[1360px] mx-auto px-6 md:px-16 flex flex-col gap-32">
        
        {/* Como é estudar na UniCesumar */}
        <div className="flex flex-col items-center">
          <div className="text-center mb-16 max-w-3xl">
            <h2 className="text-[36px] md:text-[48px] font-black text-[#003B5C] mb-6 tracking-tight">Como é estudar na UniCesumar</h2>
            <p className="text-gray-500 md:text-[20px] leading-[1.6] font-medium">
              Você vive a experiência de estudar em uma <strong className="text-[#003B5C]">universidade nota máxima no MEC</strong>. Acesso a aulas on-line, ao vivo e gravadas, com suporte acadêmico próximo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
            {[
              { icon: <GraduationCap size={24} />, title: 'Suporte Acadêmico', desc: 'Coordenação acessível e polos preparados para receber atividades práticas sempre que precisar.' },
              { icon: <Clock size={24} />, title: 'Formação Flexível', desc: 'Ambiente que respeita o seu tempo e promove a construção de um projeto profissional sólido.' },
              { icon: <Gamepad2 size={24} />, title: 'Aprendizagem Inovadora', desc: 'Tecnologia através de games, realidade aumentada, recursos 3D, IA e laboratórios de robótica.' },
              { icon: <Smartphone size={24} />, title: 'App Educacional', desc: 'Acesse suas notas, trilhas de aprendizagem e material sem consumir seu pacote de dados.' },
              { icon: <CalendarDays size={24} />, title: 'Avaliações Agendadas', desc: 'Agendamento de avaliações presenciais nos polos disponíveis, se adaptando à sua rotina.' },
              { icon: <Award size={24} />, title: 'MEC Nota Máxima', desc: 'A instituição é reconhecida de forma contínua com a nota máxima pelo MEC (IGC 5).' }
            ].map((f, i) => (
              <div key={i} className="flex flex-col p-8 rounded-[32px] bg-white border border-gray-100 shadow-[0_10px_30px_-15px_rgba(0,59,92,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(0,59,92,0.1)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 bg-blue-50/50 rounded-2xl text-[#003B5C] flex items-center justify-center mb-6 group-hover:bg-[#fdb913] group-hover:text-[#003B5C] transition-colors">{f.icon}</div>
                <h3 className="text-[20px] font-extrabold text-[#003B5C] mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-[1.6] text-[15px] font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sobre a Instituição (Vídeos) */}
        <div className="bg-[#001D2D] rounded-[40px] p-8 md:p-12 border border-[#003B5C]/50 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-full h-[6px] bg-gradient-to-r from-[#fdb913] to-[#ff9100]"></div>
           <div className="absolute -left-32 -top-32 w-96 h-96 bg-[#003B5C] rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

           <div className="flex items-center gap-4 mb-10 relative z-10">
             <div className="w-16 h-16 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center shadow-sm backdrop-blur-md">
               <MonitorPlay size={28} />
             </div>
             <h2 className="text-[32px] md:text-[40px] font-black text-white tracking-tight">EAD na Prática</h2>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 xl:gap-12 relative z-10">
              <div className="flex flex-col">
                 <div className="relative w-full rounded-[24px] overflow-hidden shadow-2xl bg-black aspect-video mb-6 border border-white/10 group">
                   <iframe 
                     className="absolute inset-0 w-full h-full border-0" 
                     src={`https://www.youtube.com/embed/${activeVideo.id}?rel=0&modestbranding=1&autoplay=0`} 
                     allowFullScreen 
                   ></iframe>
                 </div>
                 <p className="text-blue-50 font-medium px-2 text-[16px] md:text-[18px] opacity-90">{activeVideo.caption}</p>
              </div>

              <div className="flex flex-col gap-4">
                 <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1">Playlist Institucional</h3>
                 {playlist.map(item => (
                   <button 
                     key={item.id}
                     onClick={() => setActiveVideo(item)}
                     className={`flex items-center gap-4 p-3 rounded-2xl border text-left transition-all duration-300 group ${activeVideo.id === item.id ? 'bg-white/10 border-[#fdb913]/50 shadow-sm' : 'bg-transparent border-transparent hover:border-white/10 hover:bg-white/5'}`}
                   >
                     <div className="relative w-32 aspect-video bg-black rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10 group-hover:border-white/20 transition-all">
                       <img src={`https://img.youtube.com/vi/${item.id}/mqdefault.jpg`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" alt="" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 ${activeVideo.id === item.id ? 'bg-[#fdb913] text-[#003B5C] scale-110 shadow-[0_0_15px_rgba(253,185,19,0.5)]' : 'bg-white/20 text-white group-hover:bg-[#fdb913] group-hover:text-[#003B5C]'}`}>
                            <Play size={14} className="ml-0.5 fill-current" />
                          </div>
                       </div>
                     </div>
                     <span className={`text-[14px] font-bold leading-[1.4] pr-2 transition-colors duration-300 ${activeVideo.id === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                       {item.title}
                     </span>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

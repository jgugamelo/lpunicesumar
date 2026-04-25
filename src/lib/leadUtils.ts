import { supabase } from './supabase';
import { submitInteressado } from './api';

export interface LeadData {
  nome: string;
  whatsapp: string;
  email: string;
  horario?: string;
  observacao?: string;
}

export interface SubmissionParams {
  lead: LeadData;
  idCurso: string;
  nmCurso: string;
  idPolo?: string;
  nmPolo?: string;
  tipoCurso?: string;
  preco?: {
    vlPrimeira: number | string;
    vlDemais: number | string;
  };
}

/**
 * Processa a submissão do lead para o Supabase e API externa.
 * Retorna o ID do lead criado/atualizado.
 */
export async function processLeadSubmission({
  lead,
  idCurso,
  nmCurso,
  idPolo,
  nmPolo,
  tipoCurso,
  preco
}: SubmissionParams) {
  const payload = {
    ...lead,
    curso: nmCurso,
    id_curso: idCurso,
    polo: nmPolo,
    id_polo: idPolo,
    tipo_curso: tipoCurso,
    ...(preco && { preco_primeira: preco.vlPrimeira, preco_demais: preco.vlDemais })
  };

  // 1. API Externa (UC)
  submitInteressado(payload).catch(console.error);

  // 2. Supabase
  const searchParams = new URLSearchParams(window.location.search);
  const { data: existingLeads } = await supabase.from('leads').select('id').ilike('email', lead.email);
  let leadId = null;

  try {
    if (existingLeads && existingLeads.length > 0) {
      leadId = existingLeads[0].id;
      // Atualiza as intenções de curso do lead que já existe
      await supabase.from('leads').update({
        nome: lead.nome,
        whatsapp: lead.whatsapp,
        id_curso: idCurso,
        nm_curso: nmCurso,
        vl_primeira: preco?.vlPrimeira || 0,
        vl_mensalidade: preco?.vlDemais || 0
      }).eq('id', leadId);
    } else {
      // Cria novo lead
      const { data: insertedLead } = await supabase.from('leads').insert([{
        nome: lead.nome,
        whatsapp: lead.whatsapp,
        email: lead.email,
        horario: lead.horario || '',
        observacao: lead.observacao || '',
        id_curso: idCurso,
        nm_curso: nmCurso,
        id_polo: idPolo || null,
        nm_polo: nmPolo || null,
        utm_source: searchParams.get('utm_source'),
        utm_medium: searchParams.get('utm_medium'),
        utm_campaign: searchParams.get('utm_campaign'),
        vl_primeira: preco?.vlPrimeira || 0,
        vl_mensalidade: preco?.vlDemais || 0
      }]).select('id').single();
      if (insertedLead) leadId = insertedLead.id;
    }
  } catch (err) {
    console.error('Erro ao salvar no Supabase:', err);
  }

  return leadId;
}

/**
 * Gera o link do WhatsApp com a mensagem personalizada.
 */
export function getWhatsAppLink({ lead, nmCurso, preco, origin }: SubmissionParams & { origin?: string }) {
  const vl1 = preco?.vlPrimeira ? `R$ ${parseFloat(String(preco.vlPrimeira)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'não informado';
  const vlDemais = preco?.vlDemais ? `R$ ${parseFloat(String(preco.vlDemais)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'não informado';
  
  let msg = `Olá, vim pelo site e gostaria de mais informações!\n\n`;
  if (lead.nome) msg += `*Meu Nome:* ${lead.nome}\n`;
  msg += `*Curso Desejado:* ${nmCurso}\n`;
  if (preco) {
    msg += `*1ª Mensalidade:* ${vl1}\n`;
    msg += `*Demais Mensalidades:* ${vlDemais}\n`;
  }
  if (lead.observacao && lead.observacao.trim() !== '') {
    msg += `\n*Sua Observação:* ${lead.observacao.trim()}\n`;
  }

  const utmOrigin = origin || 'direto';
  const finalMsg = msg + `\n*Origem:* (${utmOrigin})`;
  
  return `https://wa.me/5521970913117?text=${encodeURIComponent(finalMsg)}`;
}

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function UtmTracker() {
  useEffect(() => {
    // Check if we already registered a visit in this session to prevent spam
    if (sessionStorage.getItem('visit_registered')) return;

    const trackVisit = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        
        const params = {
          utm_source: searchParams.get('utm_source') || 'direto',
          utm_medium: searchParams.get('utm_medium') || '',
          utm_campaign: searchParams.get('utm_campaign') || '',
          utm_content: searchParams.get('utm_content') || '',
          path: window.location.pathname,
          full_url: window.location.href
        };

        const { error } = await supabase.from('page_visits').insert([params]);
        
        if (error) {
          console.warn('Erro ao registrar visita (verifique se as colunas no banco batem com o código):', error);
        } else {
          sessionStorage.setItem('visit_registered', 'true');
        }
      } catch (err) {
        console.error('Falha crítica ao registrar tracker:', err);
      }
    };

    trackVisit();
  }, []);

  return null;
}

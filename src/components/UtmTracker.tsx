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
          utm_source: searchParams.get('utm_source'),
          utm_medium: searchParams.get('utm_medium'),
          utm_campaign: searchParams.get('utm_campaign'),
          path: window.location.pathname
        };

        // Somente grava se não houver um erro de conexão obsoleto
        await supabase.from('page_visits').insert([params]);
        
        sessionStorage.setItem('visit_registered', 'true');
      } catch (err) {
        console.error('Falha ao registrar tracker:', err);
      }
    };

    trackVisit();
  }, []);

  return null;
}

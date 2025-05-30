
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';

export const useConnectedWhatsApp = (userId: string | undefined) => {
  const [connectedWhatsAppNumbers, setConnectedWhatsAppNumbers] = useState<any[]>([]);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const { syncAllData } = useEvolutionAPI();

  const fetchConnectedWhatsAppNumbers = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select(`
          *,
          agent:agents(id, name)
        `)
        .eq('agents.user_id', userId)
        .eq('is_connected', true);

      if (error) {
        console.error('Erro ao carregar números WhatsApp:', error);
        return;
      }

      setConnectedWhatsAppNumbers(data || []);
    } catch (error) {
      console.error('Erro ao carregar números WhatsApp:', error);
    }
  };

  const performInitialSync = async () => {
    console.log('Performing initial sync for all connected WhatsApp numbers...');
    
    try {
      for (const whatsappNumber of connectedWhatsAppNumbers) {
        if (whatsappNumber.is_connected) {
          console.log('Auto-syncing data for:', whatsappNumber.phone_number);
          
          try {
            await syncAllData(whatsappNumber.phone_number, whatsappNumber.agent.id);
            console.log('Auto-sync completed for:', whatsappNumber.phone_number);
          } catch (error) {
            console.error('Error auto-syncing for', whatsappNumber.phone_number, ':', error);
          }
        }
      }

      setInitialSyncComplete(true);
      
    } catch (error) {
      console.error('Error in initial sync:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchConnectedWhatsAppNumbers();
    }
  }, [userId]);

  useEffect(() => {
    if (connectedWhatsAppNumbers.length > 0 && !initialSyncComplete) {
      performInitialSync();
    }
  }, [connectedWhatsAppNumbers, initialSyncComplete]);

  return {
    connectedWhatsAppNumbers,
    initialSyncComplete,
    fetchConnectedWhatsAppNumbers,
    performInitialSync
  };
};

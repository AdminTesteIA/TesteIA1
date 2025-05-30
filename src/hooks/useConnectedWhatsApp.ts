
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionAPI } from './useEvolutionAPI';
import type { WhatsAppNumber } from '@/types/conversations';

export const useConnectedWhatsApp = (userId: string | undefined) => {
  const [connectedWhatsAppNumbers, setConnectedWhatsAppNumbers] = useState<WhatsAppNumber[]>([]);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
        .eq('is_connected', true);

      if (error) {
        console.error('Erro ao carregar números do WhatsApp:', error);
        return;
      }

      const typedData: WhatsAppNumber[] = (data || []).map(item => ({
        id: item.id,
        phone_number: item.phone_number,
        is_connected: item.is_connected,
        agent: {
          id: item.agent.id,
          name: item.agent.name
        }
      }));

      setConnectedWhatsAppNumbers(typedData);

      // SINCRONIZAÇÃO INICIAL CONTROLADA - apenas uma vez por sessão
      if (typedData.length > 0 && !initialSyncComplete && !isSyncing) {
        performInitialSync(typedData);
      }
    } catch (error) {
      console.error('Erro ao carregar números do WhatsApp:', error);
    }
  };

  const performInitialSync = async (whatsappNumbers: WhatsAppNumber[]) => {
    if (isSyncing) return; // Prevenir múltiplas sincronizações
    
    setIsSyncing(true);
    console.log('Performing initial sync for all connected WhatsApp numbers...');

    try {
      for (const whatsappNumber of whatsappNumbers) {
        console.log('Auto-syncing data for:', whatsappNumber.phone_number);
        
        try {
          await syncAllData(whatsappNumber.phone_number, whatsappNumber.agent.id);
          console.log('Auto-sync completed for:', whatsappNumber.phone_number);
        } catch (error) {
          console.error('Error in auto-sync for:', whatsappNumber.phone_number, error);
          // Continuar com o próximo mesmo se houver erro
        }
        
        // Aguardar um pouco entre sincronizações para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } finally {
      setInitialSyncComplete(true);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchConnectedWhatsAppNumbers();
    }
  }, [userId]);

  return {
    connectedWhatsAppNumbers,
    initialSyncComplete,
    fetchConnectedWhatsAppNumbers
  };
};

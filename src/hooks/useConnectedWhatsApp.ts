
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectedWhatsApp {
  id: string;
  phone_number: string;
  is_connected: boolean;
  agent: {
    id: string;
    name: string;
  };
}

export const useConnectedWhatsApp = (userId: string | undefined) => {
  const [connectedWhatsAppNumbers, setConnectedWhatsAppNumbers] = useState<ConnectedWhatsApp[]>([]);

  const fetchConnectedWhatsAppNumbers = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select(`
          id,
          phone_number,
          is_connected,
          agent:agents(id, name, user_id)
        `)
        .eq('is_connected', true);

      if (error) {
        console.error('Erro ao buscar números conectados:', error);
        return;
      }

      // Filtrar apenas números de agentes do usuário
      const userWhatsAppNumbers = (data || [])
        .filter(number => number.agent?.user_id === userId)
        .map(number => ({
          id: number.id,
          phone_number: number.phone_number,
          is_connected: number.is_connected,
          agent: {
            id: number.agent.id,
            name: number.agent.name
          }
        }));

      console.log('Connected WhatsApp numbers found:', userWhatsAppNumbers);
      setConnectedWhatsAppNumbers(userWhatsAppNumbers);

    } catch (error) {
      console.error('Erro ao buscar números conectados:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchConnectedWhatsAppNumbers();
    }
  }, [userId]);

  return {
    connectedWhatsAppNumbers,
    fetchConnectedWhatsAppNumbers
  };
};

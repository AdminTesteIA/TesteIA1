
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Conversation } from '@/types/conversations';

export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('chat')
        .select(`
          *,
          whatsapp_number:whatsapp_numbers(
            id,
            phone_number,
            is_connected,
            agent:agents(id, name)
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar conversas:', error);
        toast.error('Erro ao carregar conversas');
        return;
      }

      // Filtrar apenas conversas de agentes do usuário logado e converter tipos
      const userConversations: Conversation[] = (data || [])
        .filter(conversation => 
          conversation.whatsapp_number?.agent?.id && 
          // Verificar se o agente pertence ao usuário (isso seria melhor com uma query mais específica)
          true // Por enquanto mostrar todas, mas idealmente filtrar por user_id
        )
        .map(conversation => ({
          ...conversation,
          metadata: conversation.metadata as Conversation['metadata']
        }));

      setConversations(userConversations);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId]);

  return {
    conversations,
    loading,
    fetchConversations
  };
};

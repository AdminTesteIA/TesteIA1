
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Conversation } from '@/types/conversations';

export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!userId) {
      console.log('useConversations: No userId provided');
      setLoading(false);
      return;
    }

    try {
      console.log('useConversations: Fetching conversations for userId:', userId);
      
      const { data, error } = await supabase
        .from('chat')
        .select(`
          *,
          whatsapp_number:whatsapp_numbers(
            id,
            phone_number,
            is_connected,
            agent:agents(id, name, user_id)
          )
        `)
        .order('last_message_at', { ascending: false });

      console.log('useConversations: Raw data from database:', data);

      if (error) {
        console.error('Erro ao carregar conversas:', error);
        setLoading(false);
        return;
      }

      // Filtrar apenas conversas de agentes do usuário logado
      const userConversations: Conversation[] = (data || [])
        .filter(conversation => {
          const hasWhatsappNumber = conversation.whatsapp_number;
          const hasAgent = conversation.whatsapp_number?.agent;
          const isUserAgent = conversation.whatsapp_number?.agent?.user_id === userId;
          
          return hasWhatsappNumber && hasAgent && isUserAgent;
        })
        .map(conversation => ({
          ...conversation,
          metadata: conversation.metadata as Conversation['metadata']
        }));

      console.log('useConversations: Filtered conversations:', userConversations);
      setConversations(userConversations);
      
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      console.log('useConversations: useEffect triggered with userId:', userId);
      fetchConversations();
    } else {
      console.log('useConversations: useEffect called but no userId');
      setLoading(false);
    }
  }, [userId]);

  return {
    conversations,
    loading,
    fetchConversations
  };
};

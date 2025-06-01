
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Conversation } from '@/types/conversations';

export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      console.log('Fetching conversations for user:', userId);

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          push_name,
          contact_number,
          remote_jid,
          last_message_at,
          metadata,
          _count:messages(count),
          whatsapp_number:whatsapp_numbers(
            id,
            phone_number,
            is_connected,
            agent:agents(id, name, user_id)
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      // Filtrar apenas conversas de agentes do usuário
      const userConversations = (data || [])
        .filter(conv => conv.whatsapp_number?.agent?.user_id === userId)
        .map(conv => ({
          ...conv,
          _count: { messages: conv._count?.[0]?.count || 0 }
        }));

      console.log('User conversations found:', userConversations);
      setConversations(userConversations);

    } catch (error) {
      console.error('Error fetching conversations:', error);
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

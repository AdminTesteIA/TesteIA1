
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
      console.log('useConversations: Database error:', error);

      if (error) {
        console.error('Erro ao carregar conversas:', error);
        toast.error('Erro ao carregar conversas');
        setLoading(false);
        return;
      }

      // Filtrar apenas conversas de agentes do usuário logado
      const userConversations: Conversation[] = (data || [])
        .filter(conversation => {
          const hasWhatsappNumber = conversation.whatsapp_number;
          const hasAgent = conversation.whatsapp_number?.agent;
          const isUserAgent = conversation.whatsapp_number?.agent?.user_id === userId;
          
          console.log('useConversations: Filtering conversation:', {
            conversationId: conversation.id,
            contactNumber: conversation.contact_number,
            hasWhatsappNumber,
            hasAgent,
            agentUserId: conversation.whatsapp_number?.agent?.user_id,
            currentUserId: userId,
            isUserAgent
          });
          
          return hasWhatsappNumber && hasAgent && isUserAgent;
        })
        .map(conversation => ({
          ...conversation,
          metadata: conversation.metadata as Conversation['metadata']
        }));

      console.log('useConversations: Filtered conversations:', userConversations);
      setConversations(userConversations);
      
      // Se não há conversas, disparar uma sincronização manual
      if (userConversations.length === 0) {
        console.log('No conversations found, triggering manual sync...');
        await triggerManualSync();
      }
      
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const triggerManualSync = async () => {
    try {
      // Buscar números conectados do usuário
      const { data: whatsappNumbers } = await supabase
        .from('whatsapp_numbers')
        .select(`
          id,
          phone_number,
          is_connected,
          agent:agents(id, name, user_id)
        `)
        .eq('is_connected', true);

      const userNumbers = (whatsappNumbers || [])
        .filter(number => number.agent?.user_id === userId);

      console.log('Found user WhatsApp numbers for sync:', userNumbers.length);

      // Sincronizar chats para cada número
      for (const number of userNumbers) {
        console.log('Syncing chats for:', number.phone_number);
        
        await supabase.functions.invoke('evolution-api', {
          body: {
            action: 'syncChats',
            instanceName: number.phone_number,
            agentId: number.agent.id
          }
        });
      }

      // Recarregar conversas após sync
      setTimeout(() => {
        fetchConversations();
      }, 2000);
      
    } catch (error) {
      console.error('Error in manual sync:', error);
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

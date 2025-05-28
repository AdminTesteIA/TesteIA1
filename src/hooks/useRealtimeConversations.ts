
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  contact_name: string | null;
  contact_number: string;
  last_message_at: string;
  whatsapp_number: {
    phone_number: string;
    agent: {
      name: string;
    };
  };
}

interface Message {
  id: string;
  content: string;
  is_from_contact: boolean;
  created_at: string;
  message_type: string;
  conversation_id: string;
  delivery_status?: 'sent' | 'delivered' | 'read';
}

export const useRealtimeConversations = () => {
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [lastMessageReceived, setLastMessageReceived] = useState<Message | null>(null);

  useEffect(() => {
    // Canal para escutar novas mensagens
    const messagesChannel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          console.log('Nova mensagem recebida:', newMessage);
          
          // Se a mensagem é de um contato (não nossa)
          if (newMessage.is_from_contact) {
            setNewMessagesCount(prev => prev + 1);
            setLastMessageReceived(newMessage);
            
            // Mostrar notificação
            toast.success('Nova mensagem recebida!', {
              description: newMessage.content.length > 50 
                ? newMessage.content.substring(0, 50) + '...' 
                : newMessage.content,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          console.log('Status da mensagem atualizado:', updatedMessage);
        }
      )
      .subscribe();

    // Canal para escutar atualizações nas conversas
    const conversationsChannel = supabase
      .channel('realtime-conversations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Conversa atualizada:', payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, []);

  const markAsRead = (conversationId: string) => {
    setNewMessagesCount(prev => Math.max(0, prev - 1));
  };

  const clearNotifications = () => {
    setNewMessagesCount(0);
    setLastMessageReceived(null);
  };

  return {
    newMessagesCount,
    lastMessageReceived,
    markAsRead,
    clearNotifications
  };
};

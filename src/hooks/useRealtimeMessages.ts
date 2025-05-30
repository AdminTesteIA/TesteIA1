
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message, Conversation } from '@/types/conversations';

interface UseRealtimeMessagesProps {
  userId: string | undefined;
  onNewMessage: (message: Message) => void;
  onConversationUpdate: () => void;
}

export const useRealtimeMessages = ({
  userId,
  onNewMessage,
  onConversationUpdate
}: UseRealtimeMessagesProps) => {
  useEffect(() => {
    if (!userId) return;

    console.log('Setting up realtime subscriptions for user:', userId);

    // Canal para mensagens em tempo real
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
          console.log('New message received:', payload.new);
          
          const newMessage = payload.new as any;
          const message: Message = {
            id: newMessage.id,
            content: newMessage.content || '',
            is_from_contact: newMessage.is_from_contact || false,
            created_at: newMessage.created_at,
            message_type: newMessage.message_type || 'text',
            conversation_id: newMessage.chat_id,
            metadata: newMessage.metadata,
            delivery_status: newMessage.metadata?.delivery_status || 'delivered'
          };

          onNewMessage(message);
          onConversationUpdate();
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
          console.log('Message updated:', payload.new);
          // Atualizar mensagem se necessário
        }
      )
      .subscribe();

    // Canal para conversas em tempo real
    const chatsChannel = supabase
      .channel('realtime-chats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat'
        },
        (payload) => {
          console.log('New chat created:', payload.new);
          onConversationUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat'
        },
        (payload) => {
          console.log('Chat updated:', payload.new);
          onConversationUpdate();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(chatsChannel);
    };
  }, [userId, onNewMessage, onConversationUpdate]);
};

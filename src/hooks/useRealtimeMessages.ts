
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeMessagesProps {
  userId: string | undefined;
  onNewMessage: (message: any) => void;
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

    // Subscrever novas mensagens
    const messagesChannel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message received:', payload.new);
          onNewMessage(payload.new);
        }
      )
      .subscribe();

    // Subscrever atualizações de conversas
    const conversationsChannel = supabase
      .channel('conversations_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Conversation updated:', payload);
          onConversationUpdate();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [userId, onNewMessage, onConversationUpdate]);
};

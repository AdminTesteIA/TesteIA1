
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message, MessageMetadata, Conversation } from '@/types/conversations';

interface UseRealtimeSubscriptionsProps {
  selectedConversation: Conversation | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onConversationUpdate: () => void;
}

export const useRealtimeSubscriptions = ({
  selectedConversation,
  setMessages,
  onConversationUpdate
}: UseRealtimeSubscriptionsProps) => {
  useEffect(() => {
    // Inscrever para atualizações em tempo real nas mensagens
    const messagesChannel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            const metadata = newMessage.metadata as MessageMetadata;
            setMessages(prev => [...prev, { ...newMessage, delivery_status: metadata?.delivery_status || 'sent' }]);
          }
          onConversationUpdate(); // Atualizar lista de conversas
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
          if (selectedConversation && updatedMessage.conversation_id === selectedConversation.id) {
            const metadata = updatedMessage.metadata as MessageMetadata;
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id ? { ...updatedMessage, delivery_status: metadata?.delivery_status } : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConversation, setMessages, onConversationUpdate]);
};


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
          const newMessage = payload.new as any; // Usar any temporariamente para os dados do banco
          if (selectedConversation && newMessage.chat_id === selectedConversation.id) {
            const metadata = newMessage.metadata as MessageMetadata;
            const mappedMessage: Message = {
              id: newMessage.id,
              content: newMessage.content || '',
              is_from_contact: newMessage.is_from_contact || false,
              created_at: newMessage.created_at,
              message_type: newMessage.message_type || 'text',
              conversation_id: newMessage.chat_id,
              metadata: metadata,
              delivery_status: metadata?.delivery_status || 'sent'
            };
            setMessages(prev => [...prev, mappedMessage]);
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
          const updatedMessage = payload.new as any; // Usar any temporariamente para os dados do banco
          if (selectedConversation && updatedMessage.chat_id === selectedConversation.id) {
            const metadata = updatedMessage.metadata as MessageMetadata;
            const mappedMessage: Message = {
              id: updatedMessage.id,
              content: updatedMessage.content || '',
              is_from_contact: updatedMessage.is_from_contact || false,
              created_at: updatedMessage.created_at,
              message_type: updatedMessage.message_type || 'text',
              conversation_id: updatedMessage.chat_id,
              metadata: metadata,
              delivery_status: metadata?.delivery_status || 'sent'
            };
            setMessages(prev => 
              prev.map(msg => 
                msg.id === mappedMessage.id ? mappedMessage : msg
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

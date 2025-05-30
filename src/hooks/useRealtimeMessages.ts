
import { useEffect } from 'react';

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
    console.log('useRealtimeMessages: Preparado para implementação futura');
    // Por enquanto não faz nada
  }, [userId, onNewMessage, onConversationUpdate]);
};

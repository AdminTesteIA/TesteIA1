
import { useState } from 'react';

// Hook simplificado - por enquanto apenas estrutura básica
export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    console.log('fetchConversations: Função preparada para implementação');
    // Por enquanto não faz nada
  };

  return {
    conversations,
    loading,
    fetchConversations
  };
};

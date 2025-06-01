
import { useState } from 'react';

// Dados simulados para demonstração
const mockConversations = [
  {
    id: '1',
    push_name: 'João Silva',
    contact_number: '+55 11 99999-1234',
    remote_jid: '5511999991234@s.whatsapp.net',
    last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    whatsapp_number: {
      id: 'whatsapp-1',
      phone_number: '+55 11 88888-0000',
      is_connected: true,
      agent: {
        id: 'agent-1',
        name: 'Agent Bot'
      }
    },
    metadata: {
      pushName: 'João Silva',
      profilePicUrl: null
    },
    _count: {
      messages: 2
    }
  },
  {
    id: '2',
    push_name: 'Maria Santos',
    contact_number: '+55 11 88888-5678',
    remote_jid: '5511888885678@s.whatsapp.net',
    last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    whatsapp_number: {
      id: 'whatsapp-1',
      phone_number: '+55 11 88888-0000',
      is_connected: true,
      agent: {
        id: 'agent-1',
        name: 'Agent Bot'
      }
    },
    metadata: {
      pushName: 'Maria Santos',
      profilePicUrl: null
    },
    _count: {
      messages: 2
    }
  },
  {
    id: '3',
    push_name: 'Pedro Costa',
    contact_number: '+55 11 77777-9012',
    remote_jid: '5511777779012@s.whatsapp.net',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    whatsapp_number: {
      id: 'whatsapp-1',
      phone_number: '+55 11 88888-0000',
      is_connected: true,
      agent: {
        id: 'agent-1',
        name: 'Agent Bot'
      }
    },
    metadata: {
      pushName: 'Pedro Costa',
      profilePicUrl: null
    },
    _count: {
      messages: 2
    }
  }
];

export const useConversations = () => {
  const [conversations] = useState(mockConversations);
  const [loading] = useState(false);

  const fetchConversations = () => {
    // Simulação - não faz nada
    console.log('Simulando busca de conversas...');
  };

  return {
    conversations,
    loading,
    fetchConversations
  };
};

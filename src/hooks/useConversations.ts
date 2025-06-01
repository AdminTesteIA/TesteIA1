
import { useState } from 'react';

// Dados simulados para demonstração
const mockConversations = [
  {
    id: '1',
    push_name: 'João Silva',
    contact_number: '+55 11 99999-1234',
    last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    last_message: 'Oi, como você está?',
    unread_count: 2,
    avatar: null
  },
  {
    id: '2',
    push_name: 'Maria Santos',
    contact_number: '+55 11 88888-5678',
    last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    last_message: 'Obrigada pelo atendimento!',
    unread_count: 0,
    avatar: null
  },
  {
    id: '3',
    push_name: 'Pedro Costa',
    contact_number: '+55 11 77777-9012',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    last_message: 'Quando posso passar aí?',
    unread_count: 1,
    avatar: null
  }
];

const mockMessages = {
  '1': [
    {
      id: '1',
      content: 'Olá! Como posso ajudar?',
      is_from_contact: false,
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      delivery_status: 'read' as const
    },
    {
      id: '2',
      content: 'Oi, como você está?',
      is_from_contact: true,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      delivery_status: 'delivered' as const
    }
  ],
  '2': [
    {
      id: '3',
      content: 'Boa tarde! Em que posso ajudá-la?',
      is_from_contact: false,
      created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      delivery_status: 'read' as const
    },
    {
      id: '4',
      content: 'Obrigada pelo atendimento!',
      is_from_contact: true,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      delivery_status: 'delivered' as const
    }
  ],
  '3': [
    {
      id: '5',
      content: 'Olá Pedro! Como posso te ajudar?',
      is_from_contact: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      delivery_status: 'read' as const
    },
    {
      id: '6',
      content: 'Quando posso passar aí?',
      is_from_contact: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      delivery_status: 'delivered' as const
    }
  ]
};

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

export const useMessages = (selectedConversationId: string | null) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchMessages = () => {
    if (selectedConversationId && mockMessages[selectedConversationId as keyof typeof mockMessages]) {
      setMessages(mockMessages[selectedConversationId as keyof typeof mockMessages]);
    } else {
      setMessages([]);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    
    // Simular envio
    setTimeout(() => {
      const newMsg = {
        id: Date.now().toString(),
        content: newMessage,
        is_from_contact: false,
        created_at: new Date().toISOString(),
        delivery_status: 'sent' as const
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setSendingMessage(false);
    }, 1000);
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    sendingMessage,
    sendMessage,
    fetchMessages
  };
};


import { useState } from 'react';

const mockMessages = {
  '1': [
    {
      id: '1',
      content: 'Olá! Como posso ajudar?',
      is_from_contact: false,
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      message_type: 'text',
      conversation_id: '1',
      delivery_status: 'read' as const
    },
    {
      id: '2',
      content: 'Oi, como você está?',
      is_from_contact: true,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      message_type: 'text',
      conversation_id: '1',
      delivery_status: 'delivered' as const
    }
  ],
  '2': [
    {
      id: '3',
      content: 'Boa tarde! Em que posso ajudá-la?',
      is_from_contact: false,
      created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      message_type: 'text',
      conversation_id: '2',
      delivery_status: 'read' as const
    },
    {
      id: '4',
      content: 'Obrigada pelo atendimento!',
      is_from_contact: true,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      message_type: 'text',
      conversation_id: '2',
      delivery_status: 'delivered' as const
    }
  ],
  '3': [
    {
      id: '5',
      content: 'Olá Pedro! Como posso te ajudar?',
      is_from_contact: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      message_type: 'text',
      conversation_id: '3',
      delivery_status: 'read' as const
    },
    {
      id: '6',
      content: 'Quando posso passar aí?',
      is_from_contact: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      message_type: 'text',
      conversation_id: '3',
      delivery_status: 'delivered' as const
    }
  ]
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
        message_type: 'text',
        conversation_id: selectedConversationId,
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

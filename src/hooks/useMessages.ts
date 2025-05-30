
import { useState } from 'react';

// Hook simplificado - preparado para implementação futura
export const useMessages = (selectedConversation: any) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [syncingMessages, setSyncingMessages] = useState(false);

  const sendMessage = async () => {
    console.log('sendMessage: Preparado para implementação futura');
  };

  const fetchMessages = async () => {
    console.log('fetchMessages: Preparado para implementação futura');
  };

  return {
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    sendingMessage,
    syncingMessages,
    sendMessage,
    fetchMessages
  };
};

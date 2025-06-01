
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';
import { toast } from 'sonner';
import type { Message, Conversation } from '@/types/conversations';

export const useMessages = (selectedConversation: Conversation | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [syncingMessages, setSyncingMessages] = useState(false);
  const { sendMessage: sendEvolutionMessage } = useEvolutionAPI();

  const fetchMessages = async () => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    setSyncingMessages(true);
    try {
      console.log('Fetching messages for conversation:', selectedConversation.id);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      console.log('Messages found:', data?.length || 0);
      setMessages(data || []);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setSyncingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      // Criar mensagem local primeiro
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        content: newMessage,
        is_from_contact: false,
        created_at: new Date().toISOString(),
        message_type: 'text',
        conversation_id: selectedConversation.id,
        delivery_status: 'sending'
      };

      setMessages(prev => [...prev, tempMessage]);
      const messageToSend = newMessage;
      setNewMessage('');

      // Enviar via Evolution API
      await sendEvolutionMessage(
        selectedConversation.whatsapp_number.phone_number,
        messageToSend,
        selectedConversation.contact_number
      );

      // Buscar mensagens atualizadas
      await fetchMessages();
      toast.success('Mensagem enviada!');

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedConversation]);

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

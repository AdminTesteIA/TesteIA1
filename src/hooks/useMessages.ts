
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Message, MessageMetadata, Conversation } from '@/types/conversations';

export const useMessages = (selectedConversation: Conversation | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [syncingMessages, setSyncingMessages] = useState(false);

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar mensagens:', error);
        toast.error('Erro ao carregar mensagens');
        return;
      }

      // Map the messages and extract delivery_status from metadata with proper typing
      const messagesWithStatus: Message[] = (data || []).map(msg => {
        const metadata = msg.metadata as MessageMetadata | null;
        return {
          id: msg.id,
          content: msg.content,
          is_from_contact: msg.is_from_contact,
          created_at: msg.created_at,
          message_type: msg.message_type,
          conversation_id: msg.conversation_id,
          metadata: metadata,
          delivery_status: metadata?.delivery_status || 'sent'
        };
      });

      setMessages(messagesWithStatus);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  const syncMessagesFromEvolution = async (conversation: Conversation) => {
    if (!conversation || syncingMessages) return;

    setSyncingMessages(true);
    console.log('Sincronizando mensagens para conversa:', conversation.contact_number);

    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'syncConversationMessages',
          instanceName: conversation.whatsapp_number.phone_number,
          agentId: conversation.whatsapp_number.agent.id,
          remoteJid: conversation.contact_number // Usar o remoteJid para filtrar
        }
      });

      if (error) {
        console.error('Erro ao sincronizar mensagens:', error);
        return;
      }

      console.log('Mensagens sincronizadas:', data);
      
      // Recarregar mensagens após sincronização
      await fetchMessages(conversation.id);

    } catch (error) {
      console.error('Erro na sincronização de mensagens:', error);
    } finally {
      setSyncingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setSendingMessage(true);

    try {
      // Inserir mensagem no banco com status 'sending' no metadata
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          content: newMessage.trim(),
          is_from_contact: false,
          message_type: 'text',
          metadata: { delivery_status: 'sending' }
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        toast.error('Erro ao enviar mensagem');
        return;
      }

      // Enviar mensagem via Evolution API
      try {
        const { data: evolutionResult, error: evolutionError } = await supabase.functions.invoke('evolution-api', {
          body: {
            action: 'sendMessage',
            instanceName: selectedConversation.whatsapp_number.phone_number,
            message: newMessage.trim(),
            to: selectedConversation.contact_number
          }
        });

        if (evolutionError) {
          console.error('Erro ao enviar via Evolution API:', evolutionError);
          // Atualizar status para falha
          await supabase
            .from('messages')
            .update({ metadata: { delivery_status: 'failed' } })
            .eq('id', data.id);
          toast.error('Erro ao enviar mensagem via WhatsApp');
          return;
        }

        // Atualizar status para enviado
        await supabase
          .from('messages')
          .update({ metadata: { delivery_status: 'sent' } })
          .eq('id', data.id);

        console.log('Mensagem enviada via Evolution API:', evolutionResult);

      } catch (evolutionError) {
        console.error('Erro na Evolution API:', evolutionError);
        // Atualizar status para falha
        await supabase
          .from('messages')
          .update({ metadata: { delivery_status: 'failed' } })
          .eq('id', data.id);
        toast.error('Erro ao enviar mensagem via WhatsApp');
        return;
      }

      // Atualizar última mensagem da conversa
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      setNewMessage('');
      toast.success('Mensagem enviada!');

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      // Carregar mensagens do banco primeiro
      fetchMessages(selectedConversation.id);
      
      // Sincronizar mensagens da Evolution API automaticamente
      syncMessagesFromEvolution(selectedConversation);
    }
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

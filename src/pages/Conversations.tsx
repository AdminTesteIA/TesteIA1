import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RealtimeNotifications } from '@/components/RealtimeNotifications';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';
import { ConversationsHeader } from '@/components/ConversationsHeader';
import { ConversationsList } from '@/components/ConversationsList';
import { ChatArea } from '@/components/ChatArea';
import type { Conversation, Message, MessageMetadata } from '@/types/conversations';

export default function Conversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectedWhatsAppNumbers, setConnectedWhatsAppNumbers] = useState<any[]>([]);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const { syncAllData } = useEvolutionAPI();

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchConnectedWhatsAppNumbers();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Sincronização automática quando há números conectados
  useEffect(() => {
    if (connectedWhatsAppNumbers.length > 0 && !initialSyncComplete) {
      performInitialSync();
    }
  }, [connectedWhatsAppNumbers, initialSyncComplete]);

  const performInitialSync = async () => {
    console.log('Performing initial sync for all connected WhatsApp numbers...');
    
    try {
      for (const whatsappNumber of connectedWhatsAppNumbers) {
        if (whatsappNumber.is_connected) {
          console.log('Auto-syncing data for:', whatsappNumber.phone_number);
          
          try {
            await syncAllData(whatsappNumber.phone_number, whatsappNumber.agent.id);
            console.log('Auto-sync completed for:', whatsappNumber.phone_number);
          } catch (error) {
            console.error('Error auto-syncing for', whatsappNumber.phone_number, ':', error);
          }
        }
      }

      // Recarregar conversas após sincronização
      await fetchConversations();
      setInitialSyncComplete(true);
      
    } catch (error) {
      console.error('Error in initial sync:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
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
          fetchConversations(); // Atualizar lista de conversas
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
  };

  const fetchConnectedWhatsAppNumbers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select(`
          *,
          agent:agents(id, name)
        `)
        .eq('agents.user_id', user.id)
        .eq('is_connected', true);

      if (error) {
        console.error('Erro ao carregar números WhatsApp:', error);
        return;
      }

      setConnectedWhatsAppNumbers(data || []);
    } catch (error) {
      console.error('Erro ao carregar números WhatsApp:', error);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          whatsapp_number:whatsapp_numbers(
            id,
            phone_number,
            is_connected,
            agent:agents(id, name)
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar conversas:', error);
        toast.error('Erro ao carregar conversas');
        return;
      }

      // Filtrar apenas conversas de agentes do usuário logado e converter tipos
      const userConversations: Conversation[] = (data || [])
        .filter(conversation => 
          conversation.whatsapp_number?.agent?.id && 
          // Verificar se o agente pertence ao usuário (isso seria melhor com uma query mais específica)
          true // Por enquanto mostrar todas, mas idealmente filtrar por user_id
        )
        .map(conversation => ({
          ...conversation,
          metadata: conversation.metadata as Conversation['metadata']
        }));

      setConversations(userConversations);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

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

  const handleNewMessageNotification = () => {
    fetchConversations();
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  };

  const handleSyncComplete = () => {
    fetchConversations();
    fetchConnectedWhatsAppNumbers();
    toast.success('Dados sincronizados com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RealtimeNotifications onNewMessage={handleNewMessageNotification} />
      
      <ConversationsHeader
        connectedWhatsAppNumbers={connectedWhatsAppNumbers}
        showSyncPanel={showSyncPanel}
        setShowSyncPanel={setShowSyncPanel}
        onRefresh={fetchConversations}
        onSyncComplete={handleSyncComplete}
      />

      {/* Indicador de sincronização automática */}
      {connectedWhatsAppNumbers.length > 0 && !initialSyncComplete && (
        <Card>
          <CardContent className="text-center py-4">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">Sincronizando dados automaticamente...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há WhatsApp conectado */}
      {connectedWhatsAppNumbers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-2">Nenhum WhatsApp Conectado</h3>
            <p className="text-gray-500">
              Conecte pelo menos um WhatsApp na seção de agentes para ver conversas aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Interface principal de conversas */}
      {connectedWhatsAppNumbers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
          {/* Lista de Conversas */}
          <div className="lg:col-span-1">
            <ConversationsList
              conversations={conversations}
              selectedConversation={selectedConversation}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onConversationSelect={setSelectedConversation}
            />
          </div>

          {/* Área de Chat */}
          <div className="lg:col-span-2">
            <ChatArea
              selectedConversation={selectedConversation}
              messages={messages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              sendingMessage={sendingMessage}
              onSendMessage={sendMessage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

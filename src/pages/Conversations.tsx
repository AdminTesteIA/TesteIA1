import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Phone, User, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RealtimeNotifications } from '@/components/RealtimeNotifications';
import { MessageDeliveryStatus } from '@/components/MessageDeliveryStatus';
import { WhatsAppSync } from '@/components/WhatsAppSync';

interface Conversation {
  id: string;
  contact_name: string | null;
  contact_number: string;
  last_message_at: string;
  whatsapp_number: {
    id: string;
    phone_number: string;
    is_connected: boolean;
    agent: {
      id: string;
      name: string;
    };
  };
  _count?: {
    messages: number;
  };
}

interface MessageMetadata {
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  [key: string]: any;
}

interface Message {
  id: string;
  content: string;
  is_from_contact: boolean;
  created_at: string;
  message_type: string;
  conversation_id: string;
  metadata?: MessageMetadata;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

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

      // Filtrar apenas conversas de agentes do usuário logado
      const userConversations = (data || []).filter(conversation => 
        conversation.whatsapp_number?.agent?.id && 
        // Verificar se o agente pertence ao usuário (isso seria melhor com uma query mais específica)
        true // Por enquanto mostrar todas, mas idealmente filtrar por user_id
      );

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

  const filteredConversations = conversations.filter(conversation =>
    conversation.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.contact_number.includes(searchTerm) ||
    conversation.whatsapp_number.agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversas</h1>
          <p className="text-gray-600 mt-1">Gerencie as conversas do WhatsApp dos seus agentes</p>
        </div>

        {/* Sync Cards for Connected WhatsApp Numbers */}
        {connectedWhatsAppNumbers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl">
            {connectedWhatsAppNumbers.map((whatsappNumber) => (
              <WhatsAppSync
                key={whatsappNumber.id}
                agentId={whatsappNumber.agent.id}
                whatsappNumber={whatsappNumber}
                onSyncComplete={handleSyncComplete}
              />
            ))}
          </div>
        )}
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* Lista de Conversas */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span>Conversas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{filteredConversations.length}</Badge>
                  <Button 
                    onClick={fetchConversations}
                    variant="ghost" 
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma conversa encontrada</p>
                    <p className="text-sm">
                      {conversations.length === 0 
                        ? 'Sincronize os dados do WhatsApp para ver as conversas' 
                        : 'Tente ajustar os filtros de busca'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {conversation.contact_name || conversation.contact_number}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{conversation.contact_number}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {conversation.whatsapp_number.agent.name}
                          </Badge>
                          <Badge 
                            variant={conversation.whatsapp_number.is_connected ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {conversation.whatsapp_number.is_connected ? "Conectado" : "Desconectado"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Área de Chat */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center space-x-3">
                  <User className="h-8 w-8 p-2 bg-blue-100 text-blue-600 rounded-full" />
                  <div>
                    <h3 className="font-semibold">
                      {selectedConversation.contact_name || selectedConversation.contact_number}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{selectedConversation.contact_number}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>via {selectedConversation.whatsapp_number.agent.name}</span>
                      </div>
                      <Badge 
                        variant={selectedConversation.whatsapp_number.is_connected ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {selectedConversation.whatsapp_number.is_connected ? "Conectado" : "Desconectado"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_from_contact ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.is_from_contact
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <MessageDeliveryStatus
                            status={message.delivery_status}
                            timestamp={message.created_at}
                            isFromContact={message.is_from_contact}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input de Nova Mensagem */}
                <div className="flex space-x-2">
                  <Input
                    placeholder={
                      selectedConversation.whatsapp_number.is_connected 
                        ? "Digite sua mensagem..." 
                        : "WhatsApp desconectado"
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={sendingMessage || !selectedConversation.whatsapp_number.is_connected}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={
                      !newMessage.trim() || 
                      sendingMessage || 
                      !selectedConversation.whatsapp_number.is_connected
                    }
                    className="flex items-center space-x-2"
                  >
                    {sendingMessage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {!selectedConversation.whatsapp_number.is_connected && (
                  <p className="text-xs text-amber-600 mt-2">
                    WhatsApp desconectado. Reconecte na seção de agentes para enviar mensagens.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
                <p>Escolha uma conversa na lista para visualizar as mensagens</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

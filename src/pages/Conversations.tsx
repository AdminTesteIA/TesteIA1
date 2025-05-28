
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Phone, User, Clock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
  id: string;
  contact_name: string | null;
  contact_number: string;
  last_message_at: string;
  whatsapp_number: {
    phone_number: string;
    agent: {
      name: string;
    };
  };
  _count?: {
    messages: number;
  };
}

interface Message {
  id: string;
  content: string;
  is_from_contact: boolean;
  created_at: string;
  message_type: string;
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

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          whatsapp_number:whatsapp_numbers(
            phone_number,
            agent:agents(name)
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar conversas:', error);
        toast.error('Erro ao carregar conversas');
        return;
      }

      setConversations(data || []);
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

      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setSendingMessage(true);

    try {
      // Inserir mensagem no banco
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          content: newMessage.trim(),
          is_from_contact: false,
          message_type: 'text'
        });

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        toast.error('Erro ao enviar mensagem');
        return;
      }

      // Atualizar última mensagem da conversa
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations(); // Atualizar lista de conversas
      toast.success('Mensagem enviada!');

      // Aqui seria onde você chamaria a API do WhatsApp para enviar a mensagem real
      // Exemplo: await sendWhatsAppMessage(selectedConversation.whatsapp_number.phone_number, newMessage);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Conversas</h1>
        <p className="text-gray-600 mt-1">Gerencie as conversas do WhatsApp dos seus agentes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Lista de Conversas */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span>Conversas</span>
                </div>
                <Badge variant="secondary">{filteredConversations.length}</Badge>
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
                    <p className="text-sm">As conversas aparecerão aqui quando chegarem via WhatsApp</p>
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
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {conversation.whatsapp_number.agent.name}
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
                          <div className={`flex items-center space-x-1 mt-1 text-xs ${
                            message.is_from_contact ? 'text-gray-500' : 'text-blue-100'
                          }`}>
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input de Nova Mensagem */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={sendingMessage}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="flex items-center space-x-2"
                  >
                    {sendingMessage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
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

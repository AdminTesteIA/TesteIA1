
import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ConversationsHeader } from '@/components/ConversationsHeader';
import { ConversationsList } from '@/components/ConversationsList';
import { ChatArea } from '@/components/ChatArea';
import { useConversations } from '@/hooks/useConversations';
import { useConnectedWhatsApp } from '@/hooks/useConnectedWhatsApp';
import { useMessages } from '@/hooks/useMessages';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import type { Conversation, Message } from '@/types/conversations';

interface ConversationsContainerProps {
  userId: string;
}

export function ConversationsContainer({ userId }: ConversationsContainerProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  const { conversations, loading, fetchConversations } = useConversations(userId);
  const { 
    connectedWhatsAppNumbers, 
    initialSyncComplete, 
    fetchConnectedWhatsAppNumbers 
  } = useConnectedWhatsApp(userId);
  
  const { 
    messages, 
    setMessages, 
    newMessage, 
    setNewMessage, 
    sendingMessage,
    syncingMessages,
    sendMessage 
  } = useMessages(selectedConversation);

  // Callback para nova mensagem em tempo real
  const handleNewMessage = useCallback((message: Message) => {
    console.log('Handling new realtime message:', message);
    
    // Se a mensagem é da conversa selecionada, adicionar às mensagens
    if (selectedConversation && message.conversation_id === selectedConversation.id) {
      setMessages(prev => {
        // Verificar se a mensagem já existe
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        
        return [...prev, message];
      });
    }

    // Mostrar notificação se for mensagem de contato
    if (message.is_from_contact) {
      toast.success('Nova mensagem recebida!', {
        description: message.content.length > 50 
          ? message.content.substring(0, 50) + '...' 
          : message.content,
        duration: 3000,
      });
    }
  }, [selectedConversation, setMessages]);

  // Callback para atualização de conversas
  const handleConversationUpdate = useCallback(() => {
    console.log('Updating conversations due to realtime event');
    fetchConversations();
  }, [fetchConversations]);

  // Setup realtime subscriptions
  useRealtimeMessages({
    userId,
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate
  });

  const handleSyncComplete = async () => {
    await fetchConversations();
    await fetchConnectedWhatsAppNumbers();
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

      {/* Status de tempo real */}
      <Card>
        <CardContent className="text-center py-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600">Sistema em tempo real ativo</span>
          </div>
        </CardContent>
      </Card>

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
              syncingMessages={syncingMessages}
              onSendMessage={sendMessage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

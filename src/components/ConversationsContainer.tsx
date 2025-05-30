
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeNotifications } from '@/components/RealtimeNotifications';
import { ConversationsHeader } from '@/components/ConversationsHeader';
import { ConversationsList } from '@/components/ConversationsList';
import { ChatArea } from '@/components/ChatArea';
import { useConversations } from '@/hooks/useConversations';
import { useConnectedWhatsApp } from '@/hooks/useConnectedWhatsApp';
import { useMessages } from '@/hooks/useMessages';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import type { Conversation } from '@/types/conversations';

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
    sendMessage 
  } = useMessages(selectedConversation);

  // Setup realtime subscriptions
  useRealtimeSubscriptions({
    selectedConversation,
    setMessages,
    onConversationUpdate: fetchConversations
  });

  const handleNewMessageNotification = () => {
    fetchConversations();
    if (selectedConversation) {
      // This will be handled by the useMessages hook
    }
  };

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

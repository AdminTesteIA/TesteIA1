
import { useState } from 'react';
import { ConversationsList } from '@/components/ConversationsList';
import { ChatArea } from '@/components/ChatArea';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import type { Conversation } from '@/types/conversations';

interface ChatInterfaceProps {
  userId: string;
  connectedWhatsAppNumbers: any[];
}

export function ChatInterface({ userId, connectedWhatsAppNumbers }: ChatInterfaceProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { conversations, loading, fetchConversations } = useConversations(userId);
  const {
    messages,
    newMessage,
    setNewMessage,
    sendingMessage,
    syncingMessages,
    sendMessage,
    fetchMessages
  } = useMessages(selectedConversation);

  // Configurar atualizações em tempo real
  useRealtimeMessages({
    userId,
    onNewMessage: (message) => {
      // Se a mensagem é da conversa selecionada, atualizar a lista
      if (selectedConversation && message.conversation_id === selectedConversation.id) {
        fetchMessages();
      }
      // Sempre atualizar a lista de conversas
      fetchConversations();
    },
    onConversationUpdate: () => {
      fetchConversations();
    }
  });

  const handleConversationSelect = (conversation: Conversation) => {
    console.log('Selected conversation:', conversation);
    setSelectedConversation(conversation);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Lista de Conversas */}
      <div className="lg:col-span-1">
        <ConversationsList
          conversations={conversations}
          selectedConversation={selectedConversation}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onConversationSelect={handleConversationSelect}
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
  );
}

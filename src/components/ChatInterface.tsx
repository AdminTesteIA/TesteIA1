
import { useState, useEffect } from 'react';
import { ConversationsList } from '@/components/ConversationsList';
import { ChatArea } from '@/components/ChatArea';
import { useConversations, useMessages } from '@/hooks/useConversations';

interface ChatInterfaceProps {
  userId: string;
  connectedWhatsAppNumbers: any[];
}

export function ChatInterface({ userId, connectedWhatsAppNumbers }: ChatInterfaceProps) {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { conversations, loading } = useConversations();
  const {
    messages,
    newMessage,
    setNewMessage,
    sendingMessage,
    sendMessage,
    fetchMessages
  } = useMessages(selectedConversation?.id);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation]);

  const handleConversationSelect = (conversation: any) => {
    setSelectedConversation(conversation);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.push_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact_number.includes(searchTerm)
  );

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
          conversations={filteredConversations}
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
          onSendMessage={sendMessage}
        />
      </div>
    </div>
  );
}

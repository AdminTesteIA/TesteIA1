
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Phone, User, RefreshCw } from 'lucide-react';
import { MessageDeliveryStatus } from '@/components/MessageDeliveryStatus';
import type { Conversation, Message } from '@/types/conversations';

interface ChatAreaProps {
  selectedConversation: Conversation | null;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendingMessage: boolean;
  syncingMessages?: boolean;
  onSendMessage: () => void;
}

// Função para formatar número de telefone brasileiro
const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  
  // Remove @s.whatsapp.net e outros caracteres especiais
  const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  
  // Se o número tem 13 dígitos e começa com 55 (Brasil)
  if (cleanNumber.length === 13 && cleanNumber.startsWith('55')) {
    const ddd = cleanNumber.substring(2, 4);
    const firstPart = cleanNumber.substring(4, 9);
    const secondPart = cleanNumber.substring(9, 13);
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Para outros formatos, retorna o número limpo com +
  return `+${cleanNumber}`;
};

// Função para obter as iniciais do nome para o fallback do avatar
const getInitials = (name: string): string => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export function ChatArea({
  selectedConversation,
  messages,
  newMessage,
  setNewMessage,
  sendingMessage,
  syncingMessages = false,
  onSendMessage
}: ChatAreaProps) {
  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-2">Selecione uma conversa</h3>
          <p>Escolha uma conversa na lista para visualizar as mensagens</p>
        </div>
      </Card>
    );
  }

  const formattedPhoneNumber = formatPhoneNumber(selectedConversation.contact_number);
  const profilePicUrl = selectedConversation.metadata?.profilePicUrl;
  const contactName = selectedConversation.contact_name || selectedConversation.metadata?.pushName || formattedPhoneNumber;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profilePicUrl} alt={contactName} />
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {selectedConversation.contact_name ? getInitials(selectedConversation.contact_name) : <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {contactName}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Phone className="h-3 w-3" />
                <span>{formattedPhoneNumber}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>via {selectedConversation.whatsapp_number.agent.name}</span>
              </div>
              {syncingMessages && (
                <div className="flex items-center space-x-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Sincronizando...</span>
                </div>
              )}
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
              <p>
                {syncingMessages ? 'Carregando mensagens...' : 'Nenhuma mensagem ainda'}
              </p>
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
                onSendMessage();
              }
            }}
            disabled={sendingMessage || !selectedConversation.whatsapp_number.is_connected}
          />
          <Button
            onClick={onSendMessage}
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
  );
}

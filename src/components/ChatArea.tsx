
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Phone, User } from 'lucide-react';
import { MessageDeliveryStatus } from '@/components/MessageDeliveryStatus';
import type { Conversation, Message } from '@/types/conversations';

interface ChatAreaProps {
  selectedConversation: Conversation | null;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendingMessage: boolean;
  onSendMessage: () => void;
}

export function ChatArea({
  selectedConversation,
  messages,
  newMessage,
  setNewMessage,
  sendingMessage,
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
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

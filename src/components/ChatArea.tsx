
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Phone, User, Clock, Check, CheckCheck } from 'lucide-react';

interface ChatAreaProps {
  selectedConversation: any;
  messages: any[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendingMessage: boolean;
  onSendMessage: () => void;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const DeliveryStatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3 text-gray-400" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-gray-400" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    default:
      return <Clock className="h-3 w-3 text-gray-400" />;
  }
};

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
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {getInitials(selectedConversation.push_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {selectedConversation.push_name}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Phone className="h-3 w-3" />
                <span>{selectedConversation.contact_number}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>WhatsApp Business</span>
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
                  <div className={`flex items-center justify-end space-x-1 mt-1 text-xs ${
                    message.is_from_contact ? 'text-gray-500' : 'text-blue-100'
                  }`}>
                    <span>{formatTime(message.created_at)}</span>
                    {!message.is_from_contact && (
                      <DeliveryStatusIcon status={message.delivery_status} />
                    )}
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
                onSendMessage();
              }
            }}
            disabled={sendingMessage}
          />
          <Button
            onClick={onSendMessage}
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
  );
}

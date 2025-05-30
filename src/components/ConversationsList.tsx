
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Conversation } from '@/types/conversations';

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onConversationSelect: (conversation: Conversation) => void;
}

export function ConversationsList({
  conversations,
  selectedConversation,
  searchTerm,
  setSearchTerm,
  onConversationSelect
}: ConversationsListProps) {
  const filteredConversations = conversations.filter(conversation =>
    conversation.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.contact_number.includes(searchTerm) ||
    conversation.whatsapp_number.agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactInitials = (name: string | null, number: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return number.slice(-2);
  };

  // Extrair número do remoteJid (formato: 5511960613827@s.whatsapp.net)
  const extractPhoneNumber = (remoteJid: string) => {
    return remoteJid.split('@')[0];
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
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
              <p className="font-medium">Nenhuma conversa encontrada</p>
              <p className="text-sm mt-2">
                {conversations.length === 0 
                  ? 'Use o painel de sincronização para buscar conversas' 
                  : 'Tente ajustar os filtros de busca'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => {
                const phoneNumber = extractPhoneNumber(conversation.contact_number);
                const profilePicUrl = conversation.metadata?.profilePicUrl;
                
                console.log('Conversation data:', {
                  id: conversation.id,
                  contact_name: conversation.contact_name,
                  contact_number: conversation.contact_number,
                  phoneNumber: phoneNumber,
                  profilePicUrl: profilePicUrl,
                  metadata: conversation.metadata
                });
                
                return (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => onConversationSelect(conversation)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        {profilePicUrl && (
                          <AvatarImage 
                            src={profilePicUrl} 
                            alt={conversation.contact_name || phoneNumber}
                            onError={(e) => {
                              console.log('Error loading profile pic:', profilePicUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                          {getContactInitials(conversation.contact_name, phoneNumber)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium truncate text-gray-900">
                            {conversation.contact_name || phoneNumber}
                          </h3>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            {phoneNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

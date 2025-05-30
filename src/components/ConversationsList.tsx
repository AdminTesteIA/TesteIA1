
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
    conversation.contact_id?.includes(searchTerm) ||
    conversation.whatsapp_number.agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactInitials = (name: string | null, contactId: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return contactId.slice(-2);
  };

  // Função para extrair e formatar número de telefone do contact_number (remoteJid)
  const formatPhoneNumber = (conversation: Conversation) => {
    // contact_number agora armazena o remoteJid completo
    if (conversation.contact_number) {
      const phoneMatch = conversation.contact_number.match(/(\d+)@/);
      if (phoneMatch) {
        const number = phoneMatch[1];
        // Formatar o número brasileiro se for válido
        if (number.startsWith('55') && number.length >= 12) {
          const cleanNumber = number.substring(2); // Remove o código do país
          const ddd = cleanNumber.substring(0, 2);
          const firstPart = cleanNumber.substring(2, 7);
          const secondPart = cleanNumber.substring(7);
          return `+55 (${ddd}) ${firstPart}-${secondPart}`;
        }
        return `+${number}`;
      }
    }
    
    // Fallback: tentar usar contact_id se contact_number não estiver disponível
    if (conversation.contact_id) {
      // Se contact_id for numérico, formatar
      const cleanNumber = conversation.contact_id.replace(/\D/g, '');
      if (cleanNumber.startsWith('55') && cleanNumber.length >= 12) {
        const withoutCountry = cleanNumber.substring(2);
        const ddd = withoutCountry.substring(0, 2);
        const firstPart = withoutCountry.substring(2, 7);
        const secondPart = withoutCountry.substring(7);
        return `+55 (${ddd}) ${firstPart}-${secondPart}`;
      } else if (cleanNumber.length >= 10) {
        const ddd = cleanNumber.substring(0, 2);
        const firstPart = cleanNumber.substring(2, 7);
        const secondPart = cleanNumber.substring(7);
        return `+55 (${ddd}) ${firstPart}-${secondPart}`;
      }
      
      return conversation.contact_id;
    }
    
    return 'Número não disponível';
  };

  // Função para obter o nome do contato
  const getContactName = (conversation: Conversation) => {
    return conversation.metadata?.pushName || conversation.contact_name || 'Contato';
  };

  // Função para obter URL da foto de perfil
  const getProfilePicUrl = (conversation: Conversation) => {
    return conversation.metadata?.profilePicUrl || null;
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
                const phoneNumber = formatPhoneNumber(conversation);
                const contactName = getContactName(conversation);
                const profilePicUrl = getProfilePicUrl(conversation);
                
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
                            alt={contactName}
                            onError={(e) => {
                              console.log('Error loading profile pic:', profilePicUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                          {getContactInitials(contactName, conversation.contact_id || phoneNumber)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium truncate text-gray-900">
                            {contactName}
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

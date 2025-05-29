
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Users, Phone } from 'lucide-react';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';
import { toast } from 'sonner';

interface WhatsAppSyncProps {
  agentId: string;
  whatsappNumber: {
    id: string;
    phone_number: string;
    is_connected: boolean;
  } | null;
  onSyncComplete?: () => void;
}

export const WhatsAppSync = ({ agentId, whatsappNumber, onSyncComplete }: WhatsAppSyncProps) => {
  const [syncing, setSyncing] = useState(false);
  const { syncChats, syncContacts, syncMessages } = useEvolutionAPI();

  const handleSyncAll = async () => {
    if (!whatsappNumber || !whatsappNumber.is_connected) {
      toast.error('WhatsApp não está conectado');
      return;
    }

    setSyncing(true);
    try {
      toast.info('Iniciando sincronização...');

      // Sincronizar chats (conversas)
      console.log('Syncing chats...');
      const chatsResult = await syncChats(whatsappNumber.phone_number, agentId);
      console.log('Chats sync result:', chatsResult);

      // Sincronizar contatos
      console.log('Syncing contacts...');
      const contactsResult = await syncContacts(whatsappNumber.phone_number, agentId);
      console.log('Contacts sync result:', contactsResult);

      // Sincronizar mensagens
      console.log('Syncing messages...');
      const messagesResult = await syncMessages(whatsappNumber.phone_number, agentId);
      console.log('Messages sync result:', messagesResult);

      toast.success(`Sincronização concluída! ${chatsResult.conversationsSynced || 0} conversas, ${contactsResult.contactsUpdated || 0} contatos atualizados, ${messagesResult.messagesSynced || 0} mensagens sincronizadas.`);

      if (onSyncComplete) {
        onSyncComplete();
      }

    } catch (error) {
      console.error('Error syncing WhatsApp data:', error);
      toast.error('Erro ao sincronizar dados do WhatsApp');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncChats = async () => {
    if (!whatsappNumber || !whatsappNumber.is_connected) {
      toast.error('WhatsApp não está conectado');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncChats(whatsappNumber.phone_number, agentId);
      toast.success(`${result.conversationsSynced || 0} conversas sincronizadas`);
      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      console.error('Error syncing chats:', error);
      toast.error('Erro ao sincronizar conversas');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncContacts = async () => {
    if (!whatsappNumber || !whatsappNumber.is_connected) {
      toast.error('WhatsApp não está conectado');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncContacts(whatsappNumber.phone_number, agentId);
      toast.success(`${result.contactsUpdated || 0} contatos atualizados`);
      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      console.error('Error syncing contacts:', error);
      toast.error('Erro ao sincronizar contatos');
    } finally {
      setSyncing(false);
    }
  };

  if (!whatsappNumber) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          <span>Sincronizar WhatsApp</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!whatsappNumber.is_connected ? (
          <p className="text-amber-600 bg-amber-50 p-3 rounded text-sm">
            WhatsApp deve estar conectado para sincronizar dados
          </p>
        ) : (
          <div className="space-y-2">
            <Button 
              onClick={handleSyncAll} 
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Tudo
            </Button>

            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={handleSyncChats} 
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversas
              </Button>

              <Button 
                onClick={handleSyncContacts} 
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                Contatos
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              A sincronização busca conversas, contatos e mensagens do WhatsApp conectado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

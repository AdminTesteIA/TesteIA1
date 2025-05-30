
import { Card, CardContent } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useConnectedWhatsApp } from '@/hooks/useConnectedWhatsApp';

interface ConversationsContainerProps {
  userId: string;
}

export function ConversationsContainer({ userId }: ConversationsContainerProps) {
  const { conversations, loading } = useConversations(userId);
  const { connectedWhatsAppNumbers } = useConnectedWhatsApp(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Quando há WhatsApp conectado mas ainda não implementamos os chats */}
      {connectedWhatsAppNumbers.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Phone className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">WhatsApp Conectado</h3>
            <p className="text-gray-500 mb-4">
              {connectedWhatsAppNumbers.length} WhatsApp(s) conectado(s)
            </p>
            <div className="space-y-2">
              {connectedWhatsAppNumbers.map((whatsapp) => (
                <div key={whatsapp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{whatsapp.phone_number}</span>
                  <span className="text-sm text-gray-500">Agente: {whatsapp.agent.name}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Sistema de chats será implementado em breve
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

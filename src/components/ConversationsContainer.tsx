
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { useConnectedWhatsApp } from '@/hooks/useConnectedWhatsApp';
import { ConversationsHeader } from '@/components/ConversationsHeader';
import { ChatInterface } from '@/components/ChatInterface';

interface ConversationsContainerProps {
  userId: string;
}

export function ConversationsContainer({ userId }: ConversationsContainerProps) {
  const { connectedWhatsAppNumbers, fetchConnectedWhatsAppNumbers } = useConnectedWhatsApp(userId);
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  const handleRefresh = () => {
    fetchConnectedWhatsAppNumbers();
  };

  const handleSyncComplete = () => {
    // Callback para quando sincronização for concluída
    console.log('Sync completed');
  };

  return (
    <div className="space-y-6">
      <ConversationsHeader
        connectedWhatsAppNumbers={connectedWhatsAppNumbers}
        showSyncPanel={showSyncPanel}
        setShowSyncPanel={setShowSyncPanel}
        onRefresh={handleRefresh}
        onSyncComplete={handleSyncComplete}
      />

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

      {/* Interface de Chat quando há WhatsApp conectado */}
      {connectedWhatsAppNumbers.length > 0 && (
        <ChatInterface
          userId={userId}
          connectedWhatsAppNumbers={connectedWhatsAppNumbers}
        />
      )}
    </div>
  );
}


import { Button } from '@/components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';
import { WhatsAppSync } from '@/components/WhatsAppSync';

interface ConversationsHeaderProps {
  connectedWhatsAppNumbers: any[];
  showSyncPanel: boolean;
  setShowSyncPanel: (show: boolean) => void;
  onRefresh: () => void;
  onSyncComplete: () => void;
}

export function ConversationsHeader({
  connectedWhatsAppNumbers,
  showSyncPanel,
  setShowSyncPanel,
  onRefresh,
  onSyncComplete
}: ConversationsHeaderProps) {
  return (
    <>
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversas</h1>
          <p className="text-gray-600 mt-1">Gerencie as conversas do WhatsApp dos seus agentes</p>
        </div>

        <div className="flex items-center space-x-3">
          {connectedWhatsAppNumbers.length > 0 && (
            <Button
              onClick={() => setShowSyncPanel(!showSyncPanel)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Sincronização Manual</span>
            </Button>
          )}
          <Button 
            onClick={onRefresh}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Painel de sincronização manual (colapsável) */}
      {showSyncPanel && connectedWhatsAppNumbers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
          <div className="md:col-span-2 lg:col-span-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Sincronização Manual</h3>
            <p className="text-sm text-gray-600">Use apenas se precisar forçar uma nova sincronização</p>
          </div>
          {connectedWhatsAppNumbers.map((whatsappNumber) => (
            <WhatsAppSync
              key={whatsappNumber.id}
              agentId={whatsappNumber.agent.id}
              whatsappNumber={whatsappNumber}
              onSyncComplete={onSyncComplete}
            />
          ))}
        </div>
      )}
    </>
  );
}

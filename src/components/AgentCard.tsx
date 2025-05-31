
import { Bot, Settings, Trash2, FileText, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Agent } from '@/types/agent';

interface AgentCardProps {
  agent: Agent;
  onToggle: (agentId: string, isActive: boolean) => void;
  onDelete: (agentId: string) => void;
}

export const AgentCard = ({ agent, onToggle, onDelete }: AgentCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {agent.name}
          </CardTitle>
          <div className={`h-3 w-3 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {agent.base_prompt || 'Nenhum prompt configurado'}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Smartphone className="h-4 w-4" />
            {agent.whatsapp_numbers ? 1 : 0} WhatsApp
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {agent.knowledge_files?.length || 0} arquivos
          </div>
        </div>

        {/* Show WhatsApp connection status */}
        {agent.whatsapp_numbers && (
          <div className="text-xs">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              agent.whatsapp_numbers.is_connected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {agent.whatsapp_numbers.is_connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant={agent.is_active ? "destructive" : "default"}
            size="sm"
            onClick={() => onToggle(agent.id, agent.is_active)}
            className="flex-1"
          >
            <Settings className="mr-1 h-3 w-3" />
            {agent.is_active ? 'Desativar' : 'Ativar'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(agent.id)}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

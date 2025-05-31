
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAgents } from '@/hooks/useAgents';
import { AgentCard } from '@/components/AgentCard';
import { EmptyAgentsState } from '@/components/EmptyAgentsState';

export default function Agents() {
  const { user } = useAuth();
  const { agents, loading, deleteAgent } = useAgents(user?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando agentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Meus Agentes</h1>
          <p className="text-muted-foreground">Gerencie seus agentes de IA para WhatsApp</p>
        </div>
        <Button asChild>
          <Link to="/agents/create">
            <Plus className="mr-2 h-4 w-4" />
            Criar Agente
          </Link>
        </Button>
      </div>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <EmptyAgentsState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDelete={deleteAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

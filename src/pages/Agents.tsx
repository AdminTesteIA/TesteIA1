
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Plus, Settings, Trash2, FileText, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  base_prompt: string;
  is_active: boolean;
  knowledge_base: string | null;
  openai_api_key: string | null;
  created_at: string;
  whatsapp_numbers?: {
    id: string;
    phone_number: string;
    is_connected: boolean;
    instance_name?: string;
    evolution_status?: string;
  };
  knowledge_files?: Array<{
    id: string;
    filename: string;
  }>;
}

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, [user]);

  const fetchAgents = async () => {
    if (!user) return;

    try {
      // Fix the foreign key references to match actual constraint names
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select(`
          *,
          whatsapp_numbers!fk_whatsapp_numbers_agent_id (
            id, 
            phone_number, 
            is_connected,
            instance_name,
            evolution_status
          ),
          knowledge_files!knowledge_files_agent_id_fkey (
            id, 
            filename
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar agentes:', error);
        toast.error('Erro ao carregar agentes');
        return;
      }

      setAgents(agentsData || []);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
      toast.error('Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) {
        console.error('Erro ao excluir agente:', error);
        toast.error('Erro ao excluir agente');
        return;
      }

      toast.success('Agente excluído com sucesso!');
      fetchAgents();
    } catch (error) {
      console.error('Erro ao excluir agente:', error);
      toast.error('Erro ao excluir agente');
    }
  };

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_active: !isActive })
        .eq('id', agentId);

      if (error) {
        console.error('Erro ao atualizar agente:', error);
        toast.error('Erro ao atualizar agente');
        return;
      }

      toast.success(isActive ? 'Agente desativado' : 'Agente ativado');
      fetchAgents();
    } catch (error) {
      console.error('Erro ao atualizar agente:', error);
      toast.error('Erro ao atualizar agente');
    }
  };

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
        <Card className="text-center py-12">
          <CardContent>
            <Bot className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum agente encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Você ainda não tem nenhum agente criado. Crie seu primeiro agente agora!
            </p>
            <Button asChild>
              <Link to="/agents/create">
                <Plus className="mr-2 h-4 w-4" />
                Criar Meu Primeiro Agente
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
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
                    onClick={() => toggleAgent(agent.id, agent.is_active)}
                    className="flex-1"
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    {agent.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAgent(agent.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


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
  whatsapp_numbers?: Array<{
    id: string;
    phone_number: string;
    is_connected: boolean;
  }>;
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
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select(`
          *,
          whatsapp_numbers (id, phone_number, is_connected),
          knowledge_files (id, filename)
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Agentes</h1>
          <p className="text-gray-600 mt-1">Gerencie seus agentes de IA para WhatsApp</p>
        </div>
        <Button asChild>
          <Link to="/agents/new" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Criar Agente</span>
          </Link>
        </Button>
      </div>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Bot className="h-6 w-6 text-blue-600" />
              <span>Nenhum agente encontrado</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Você ainda não tem nenhum agente criado. Crie seu primeiro agente agora!
            </p>
            <Button asChild size="lg">
              <Link to="/agents/new" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Criar Meu Primeiro Agente</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    <span className="truncate">{agent.name}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        agent.is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`} 
                      title={agent.is_active ? 'Ativo' : 'Inativo'}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {agent.base_prompt || 'Nenhum prompt configurado'}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Smartphone className="h-4 w-4" />
                    <span>{agent.whatsapp_numbers?.length || 0} WhatsApp</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{agent.knowledge_files?.length || 0} arquivos</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAgent(agent.id, agent.is_active)}
                    className="flex-1"
                  >
                    {agent.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link to={`/agents/${agent.id}/edit`}>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAgent(agent.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
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

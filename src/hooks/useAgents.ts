
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Agent } from '@/types/agent';

export const useAgents = (userId: string | undefined) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    if (!userId) return;

    try {
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
        .eq('user_id', userId)
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

  useEffect(() => {
    fetchAgents();
  }, [userId]);

  return {
    agents,
    loading,
    deleteAgent,
    toggleAgent,
    refetch: fetchAgents
  };
};

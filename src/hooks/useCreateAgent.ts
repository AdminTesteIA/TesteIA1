
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AgentFormData {
  name: string;
  base_prompt: string;
  knowledge_base: string;
  openai_api_key: string;
  is_active: boolean;
}

export const useCreateAgent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const createAgent = async (formData: AgentFormData) => {
    console.log('🟡 [HANDLE SUBMIT] Formulário submetido');

    if (!user) {
      console.error('🔴 [HANDLE SUBMIT] Usuário não está autenticado');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }

    if (!formData.base_prompt.trim()) {
      toast.error('Prompt base é obrigatório');
      return;
    }

    setLoading(true);
    let tempAgent: any = null;

    try {
      console.log('🟡 [CREATE] === INICIANDO PROCESSO DE CRIAÇÃO ===');
      console.log('🟡 [CREATE] User:', user.email);

      // 1. Cria o agente temporariamente sem assistant_id
      console.log('🟡 [CREATE] Criando agente temporário no banco...');
      const { data: tempAgents, error: agentError } = await supabase
        .from('agents')
        .insert({
          name: formData.name,
          base_prompt: formData.base_prompt,
          knowledge_base: formData.knowledge_base || null,
          openai_api_key: formData.openai_api_key || null,
          is_active: formData.is_active,
          user_id: user.id
        })
        .select();

      console.log('🟡 [CREATE] Resultado da inserção:', { tempAgents, agentError });

      if (agentError) {
        console.error('🔴 [CREATE] Erro ao criar agente temporário:', agentError);
        toast.error('Erro ao criar agente');
        setLoading(false);
        return;
      }

      if (!tempAgents || tempAgents.length === 0) {
        console.error('🔴 [CREATE] Nenhum agente retornado na resposta');
        toast.error('Erro ao criar agente');
        setLoading(false);
        return;
      }

      tempAgent = tempAgents[0];
      console.log('🟢 [CREATE] Agente temporário criado:', tempAgent.id);

      // 2. Chamar edge function usando o método oficial do Supabase
      console.log('🟡 [CREATE] === CHAMANDO EDGE FUNCTION ===');
      console.log('🟡 [CREATE] Payload para edge function:', {
        action: 'createAssistant',
        agentId: tempAgent.id,
        userEmail: user.email
      });

      const { data: assistantData, error: assistantError } = await supabase.functions.invoke('openai-assistant', {
        body: {
          action: 'createAssistant',
          agentId: tempAgent.id,
          userEmail: user.email
        }
      });

      console.log('🟡 [CREATE] Edge function response:', { assistantData, assistantError });

      if (assistantError) {
        console.error('🔴 [CREATE] Erro na edge function:', assistantError);
        throw new Error(assistantError.message || 'Falha na criação do Assistant');
      }

      if (assistantData && assistantData.success) {
        console.log('🟢 [CREATE] === PROCESSO COMPLETO ===');
        toast.success('Agente e Assistant criados com sucesso!');
        navigate('/agents');
      } else {
        throw new Error(assistantData?.error || 'Falha na criação do Assistant');
      }

    } catch (error: any) {
      console.error('🔴 [CREATE] === ERRO GERAL NO PROCESSO ===');
      console.error('🔴 [CREATE] Erro:', error);

      // Se já criou o agente temporário, tentar deletar
      if (tempAgent?.id) {
        console.log('🟡 [CREATE] Deletando agente criado...', tempAgent.id);
        const { error: deleteError } = await supabase
          .from('agents')
          .delete()
          .eq('id', tempAgent.id);

        if (deleteError) {
          console.error('🔴 [CREATE] Erro ao deletar agente:', deleteError);
        } else {
          console.log('🟢 [CREATE] Agente deletado com sucesso');
        }
      }

      toast.error(`Erro ao criar agente e Assistant: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    createAgent,
    loading
  };
};

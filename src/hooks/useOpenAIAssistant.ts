
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const useOpenAIAssistant = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const createAssistant = async (agentId: string) => {
    if (!user?.email) {
      toast.error('Usuário não autenticado');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating OpenAI Assistant for agent:', agentId);
      
      const { data, error } = await supabase.functions.invoke('openai-assistant', {
        body: { 
          action: 'createAssistant', 
          agentId, 
          userEmail: user.email 
        }
      });

      if (error) {
        console.error('OpenAI Assistant API error:', error);
        throw error;
      }

      toast.success('Assistant criado com sucesso!');
      return data;

    } catch (error) {
      console.error('Error creating OpenAI Assistant:', error);
      toast.error('Erro ao criar Assistant');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createAssistant
  };
};

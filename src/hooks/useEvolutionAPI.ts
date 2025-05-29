
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEvolutionAPI = () => {
  const [loading, setLoading] = useState(false);

  const callEvolutionAPI = async (action: string, params: any = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action, ...params }
      });

      if (error) {
        console.error('Evolution API error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error calling Evolution API:', error);
      toast.error('Erro ao comunicar com a Evolution API');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async (instanceName: string, agentId: string, number: string) => {
    console.log('Creating WhatsApp instance:', instanceName, 'with number:', number);
    return await callEvolutionAPI('createInstance', { instanceName, agentId, number });
  };

  const configureOpenAI = async (instanceName: string, agentId: string) => {
    console.log('Configuring OpenAI for instance:', instanceName);
    return await callEvolutionAPI('configureOpenAI', { instanceName, agentId });
  };

  const sendMessage = async (instanceName: string, message: string, to: string) => {
    console.log('Sending message via WhatsApp:', { instanceName, to });
    return await callEvolutionAPI('sendMessage', { instanceName, message, to });
  };

  const getQRCode = async (instanceName: string) => {
    console.log('Getting QR code for instance:', instanceName);
    return await callEvolutionAPI('getQRCode', { instanceName });
  };

  const getInstanceStatus = async (instanceName: string) => {
    console.log('Getting instance status:', instanceName);
    return await callEvolutionAPI('getInstanceStatus', { instanceName });
  };

  const syncMessages = async (instanceName: string, agentId: string) => {
    console.log('Syncing messages for instance:', instanceName);
    return await callEvolutionAPI('syncMessages', { instanceName, agentId });
  };

  return {
    loading,
    createInstance,
    configureOpenAI,
    sendMessage,
    getQRCode,
    getInstanceStatus,
    syncMessages
  };
};

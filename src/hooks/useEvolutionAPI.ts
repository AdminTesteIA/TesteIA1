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
    console.log('Creating WhatsApp Evolution Channel instance:', instanceName, 'with number:', number);
    return await callEvolutionAPI('createInstance', { instanceName, agentId, number });
  };

  const configureWebhook = async (instanceName: string) => {
    console.log('Configuring webhook for Evolution Channel instance:', instanceName);
    return await callEvolutionAPI('configureWebhook', { instanceName });
  };

  const sendMessage = async (instanceName: string, message: string, to: string) => {
    console.log('Sending message via WhatsApp Evolution Channel:', { instanceName, to });
    return await callEvolutionAPI('sendMessage', { instanceName, message, to });
  };

  const getQRCode = async (instanceName: string) => {
    console.log('Getting QR code for Evolution Channel instance:', instanceName);
    return await callEvolutionAPI('getQRCode', { instanceName });
  };

  const getInstanceStatus = async (instanceName: string) => {
    console.log('Getting Evolution Channel instance status:', instanceName);
    return await callEvolutionAPI('getInstanceStatus', { instanceName });
  };

  const logoutInstance = async (instanceName: string) => {
    console.log('Logging out Evolution Channel instance:', instanceName);
    return await callEvolutionAPI('logoutInstance', { instanceName });
  };

  const syncMessages = async (instanceName: string, agentId: string) => {
    console.log('Syncing messages for Evolution Channel instance:', instanceName);
    return await callEvolutionAPI('syncMessages', { instanceName, agentId });
  };

  const syncChats = async (instanceName: string, agentId: string) => {
    console.log('Syncing chats for Evolution Channel instance:', instanceName);
    return await callEvolutionAPI('syncChats', { instanceName, agentId });
  };

  const syncContacts = async (instanceName: string, agentId: string) => {
    console.log('Syncing contacts for Evolution Channel instance:', instanceName);
    return await callEvolutionAPI('syncContacts', { instanceName, agentId });
  };

  const syncAllData = async (instanceName: string, agentId: string) => {
    console.log('Syncing all data for Evolution Channel instance:', instanceName);
    
    try {
      // Sincronizar tudo em sequência
      const chatsResult = await syncChats(instanceName, agentId);
      const contactsResult = await syncContacts(instanceName, agentId);
      const messagesResult = await syncMessages(instanceName, agentId);

      return {
        success: true,
        conversationsSynced: chatsResult.conversationsSynced || 0,
        contactsUpdated: contactsResult.contactsUpdated || 0,
        messagesSynced: messagesResult.messagesSynced || 0
      };
    } catch (error) {
      console.error('Error syncing all data:', error);
      throw error;
    }
  };

  return {
    loading,
    createInstance,
    configureWebhook,
    sendMessage,
    getQRCode,
    getInstanceStatus,
    logoutInstance,
    syncMessages,
    syncChats,
    syncContacts,
    syncAllData
  };
};

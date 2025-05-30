
import { corsHeaders } from './constants.ts';
import { fetchFromEvolutionAPI } from './utils.ts';
import { processAndSaveMessage } from './message-processor.ts';
import type { AuthHeaders } from './types.ts';

export async function syncMessages(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('Syncing messages for instance:', instanceName);

  try {
    // Usar a URL correta conforme a documentação oficial
    const responseData = await fetchFromEvolutionAPI('/chat/findMessages', instanceName, authHeaders, {
      where: {
        owner: instanceName
      }
    });

    console.log('Messages response from Evolution API:', responseData ? 'received' : 'undefined or empty');

    // Verificar se responseData tem mensagens
    let messages = [];
    if (responseData && responseData.messages && Array.isArray(responseData.messages.records)) {
      messages = responseData.messages.records;
    } else if (Array.isArray(responseData)) {
      messages = responseData;
    }

    console.log('Messages to process:', messages.length);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('No messages found or invalid response format');
      return new Response(JSON.stringify({ 
        success: true, 
        messagesSynced: 0,
        message: 'No messages found or invalid response format'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar e salvar mensagens no banco
    let messagesSynced = 0;
    for (const message of messages) {
      const processed = await processAndSaveMessage(message, instanceName, agentId);
      if (processed) messagesSynced++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messagesSynced 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error syncing messages:', error);
    throw error;
  }
}

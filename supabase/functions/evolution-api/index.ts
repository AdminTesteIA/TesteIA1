
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './constants.ts';
import { 
  createInstance, 
  configureWebhook, 
  getQRCode, 
  getInstanceStatus, 
  logoutInstance 
} from './instance-management.ts';
import { handleSyncChats, handleSyncContacts, handleSyncMessages } from './sync-operations.ts';
import type { EvolutionAPIRequest, AuthHeaders } from './types.ts';

const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceName, agentId, message, to, number }: EvolutionAPIRequest = await req.json();
    console.log('Evolution API action:', action, { instanceName, agentId, to, number });

    const authHeaders: AuthHeaders = {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'createInstance':
        return await createInstance(instanceName!, agentId!, number!, authHeaders);
      
      case 'configureWebhook':
        return await configureWebhook(instanceName!, authHeaders);
      
      case 'getQRCode':
        return await getQRCode(instanceName!, authHeaders);
      
      case 'getInstanceStatus':
        return await getInstanceStatus(instanceName!, authHeaders);
      
      case 'logoutInstance':
        return await logoutInstance(instanceName!, authHeaders);

      case 'syncChats':
        return await handleSyncChats(instanceName!, agentId!, authHeaders);

      case 'syncContacts':
        return await handleSyncContacts(instanceName!, agentId!, authHeaders);

      case 'syncMessages':
        return await handleSyncMessages(instanceName!, agentId!, authHeaders);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in evolution-api function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

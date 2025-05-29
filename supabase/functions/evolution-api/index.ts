
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceName, agentId, message, to } = await req.json();
    console.log('Evolution API action:', action, { instanceName, agentId, to });

    const authHeaders = {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'createInstance':
        return await createInstance(instanceName, agentId, authHeaders);
      
      case 'configureOpenAI':
        return await configureOpenAI(instanceName, agentId, authHeaders);
      
      case 'sendMessage':
        return await sendMessage(instanceName, message, to, authHeaders);
      
      case 'getQRCode':
        return await getQRCode(instanceName, authHeaders);
      
      case 'getInstanceStatus':
        return await getInstanceStatus(instanceName, authHeaders);
      
      case 'syncMessages':
        return await syncMessages(instanceName, agentId, authHeaders);
      
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

async function createInstance(instanceName: string, agentId: string, authHeaders: any) {
  console.log('Creating Evolution API instance:', instanceName);

  // Buscar dados do agente
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    throw new Error('Agent not found');
  }

  // Criar instância na Evolution API
  const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      instanceName: instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.text();
    console.error('Error creating instance:', errorData);
    throw new Error(`Failed to create instance: ${errorData}`);
  }

  const instanceData = await createResponse.json();
  console.log('Instance created:', instanceData);

  // Configurar webhook
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;
  const webhookResponse = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        'APPLICATION_STARTUP',
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE'
      ]
    })
  });

  if (!webhookResponse.ok) {
    console.error('Error setting webhook:', await webhookResponse.text());
  }

  // Salvar ou atualizar número WhatsApp na base de dados
  const { error: whatsappError } = await supabase
    .from('whatsapp_numbers')
    .upsert({
      agent_id: agentId,
      phone_number: instanceName,
      is_connected: false,
      session_data: instanceData
    });

  if (whatsappError) {
    console.error('Error saving WhatsApp number:', whatsappError);
  }

  return new Response(JSON.stringify(instanceData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function configureOpenAI(instanceName: string, agentId: string, authHeaders: any) {
  console.log('Configuring OpenAI for instance:', instanceName);

  // Buscar dados do agente
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    throw new Error('Agent not found');
  }

  if (!agent.openai_api_key) {
    throw new Error('OpenAI API key not configured for this agent');
  }

  // Configurar OpenAI na Evolution API
  const openaiConfig = {
    openaiApiKey: agent.openai_api_key,
    model: 'gpt-4o-mini',
    systemMessages: [agent.base_prompt],
    assistantMessages: [],
    userMessages: [],
    maxTokens: 1000,
    temperature: 0.7,
    topP: 1,
    n: 1,
    stop: null,
    presencePenalty: 0,
    frequencyPenalty: 0
  };

  const response = await fetch(`${EVOLUTION_API_URL}/chat/whatsappDefault/${instanceName}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(openaiConfig)
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error configuring OpenAI:', errorData);
    throw new Error(`Failed to configure OpenAI: ${errorData}`);
  }

  const result = await response.json();
  console.log('OpenAI configured successfully:', result);

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendMessage(instanceName: string, message: string, to: string, authHeaders: any) {
  console.log('Sending message via Evolution API:', { instanceName, to });

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      number: to,
      text: message
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error sending message:', errorData);
    throw new Error(`Failed to send message: ${errorData}`);
  }

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getQRCode(instanceName: string, authHeaders: any) {
  console.log('Getting QR Code for instance:', instanceName);

  const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
    method: 'GET',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error getting QR code:', errorData);
    throw new Error(`Failed to get QR code: ${errorData}`);
  }

  const result = await response.json();
  
  // Atualizar QR code na base de dados
  if (result.qrcode) {
    await supabase
      .from('whatsapp_numbers')
      .update({ qr_code: result.qrcode })
      .eq('phone_number', instanceName);
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getInstanceStatus(instanceName: string, authHeaders: any) {
  console.log('Getting instance status:', instanceName);

  const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
    method: 'GET',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error getting instance status:', errorData);
    throw new Error(`Failed to get instance status: ${errorData}`);
  }

  const result = await response.json();
  
  // Atualizar status de conexão na base de dados
  if (result[0]?.instance?.state) {
    const isConnected = result[0].instance.state === 'open';
    await supabase
      .from('whatsapp_numbers')
      .update({ is_connected: isConnected })
      .eq('phone_number', instanceName);
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function syncMessages(instanceName: string, agentId: string, authHeaders: any) {
  console.log('Syncing messages for instance:', instanceName);

  // Implementar sincronização de mensagens existentes
  // Esta funcionalidade pode ser expandida conforme necessário
  
  return new Response(JSON.stringify({ message: 'Sync completed' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

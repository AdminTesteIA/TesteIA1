import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceName, agentId, message, to, number } = await req.json();
    console.log('Evolution API action:', action, { instanceName, agentId, to, number });

    const authHeaders = {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'createInstance':
        return await createInstance(instanceName, agentId, number, authHeaders);
      
      case 'configureWebhook':
        return await configureWebhook(instanceName, authHeaders);
      
      case 'sendMessage':
        return await sendMessage(instanceName, message, to, authHeaders);
      
      case 'getQRCode':
        return await getQRCode(instanceName, authHeaders);
      
      case 'getInstanceStatus':
        return await getInstanceStatus(instanceName, authHeaders);
      
      case 'logoutInstance':
        return await logoutInstance(instanceName, authHeaders);
      
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

async function createInstance(instanceName: string, agentId: string, number: string, authHeaders: any) {
  console.log('Creating Evolution API instance:', instanceName, 'for agent:', agentId, 'with number:', number);

  try {
    // Buscar dados do agente
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    console.log('Agent query result:', { agent, agentError });

    if (agentError) {
      console.error('Agent query error:', agentError);
      throw new Error(`Database error: ${agentError.message}`);
    }

    if (!agent) {
      console.error('Agent not found with ID:', agentId);
      throw new Error(`Agent not found with ID: ${agentId}`);
    }

    console.log('Agent found:', agent.name);

    // Criar identificador único concatenando nome da instância com número
    const uniqueInstanceName = `${instanceName}-${number}`;
    console.log('Unique instance name:', uniqueInstanceName);

    // Configurar webhook URL
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;

    // Criar instância na Evolution API usando a configuração correta
    const instanceData = {
      instanceName: uniqueInstanceName,
      token: agentId, // Usar agentId como token
      qrcode: true,
      number: number,
      integration: "WHATSAPP-BAILEYS",
      rejectCall: true,
      msgCall: "Não atendemos ligações.",
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      readStatus: true,
      syncFullHistory: true,
      webhook: {
        url: webhookUrl,
        byEvents: true,
        base64: true,
        events: [
          "APPLICATION_STARTUP",
          "QRCODE_UPDATED", 
          "CONNECTION_UPDATE",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE"
        ]
      }
    };

    console.log('Creating Evolution API instance with data:', instanceData);

    const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(instanceData)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('Error creating instance in Evolution API:', errorData);
      throw new Error(`Failed to create instance: ${errorData}`);
    }

    const instanceResult = await createResponse.json();
    console.log('Instance created successfully in Evolution API:', instanceResult);

    // Salvar número WhatsApp na base de dados - usando o nome único da instância
    const { error: whatsappError } = await supabase
      .from('whatsapp_numbers')
      .upsert({
        agent_id: agentId,
        phone_number: uniqueInstanceName, // Usar o nome único da instância
        is_connected: false, // SEMPRE false inicialmente
        session_data: instanceResult
      });

    if (whatsappError) {
      console.error('Error saving WhatsApp number:', whatsappError);
      throw new Error(`Failed to save WhatsApp number: ${whatsappError.message}`);
    } else {
      console.log('WhatsApp number saved successfully as disconnected');
    }

    return new Response(JSON.stringify({
      success: true,
      instanceResult,
      message: 'Instance created successfully. WhatsApp integration ready. Status: Disconnected (scan QR to connect).'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in createInstance:', error);
    throw error;
  }
}

async function configureWebhook(instanceName: string, authHeaders: any) {
  console.log('Configuring webhook for instance:', instanceName);

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;
  
  const webhookConfig = {
    url: webhookUrl,
    byEvents: true,
    base64: true,
    events: [
      'APPLICATION_STARTUP',
      'QRCODE_UPDATED', 
      'CONNECTION_UPDATE',
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE'
    ]
  };

  console.log('Setting webhook with config:', webhookConfig);

  const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(webhookConfig)
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error setting webhook:', errorData);
    throw new Error(`Failed to set webhook: ${errorData}`);
  }

  const result = await response.json();
  console.log('Webhook configured successfully:', result);

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
  console.log('QR Code response from Evolution API:', result);
  
  // Atualizar QR code na base de dados se disponível
  if (result.code) {
    // Buscar o número WhatsApp relacionado a esta instância pelo instanceName
    const { data: whatsappData, error: findError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('phone_number', instanceName) // Buscar pelo nome único da instância
      .maybeSingle();

    if (findError) {
      console.error('Error finding WhatsApp number:', findError);
    } else if (whatsappData) {
      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update({ qr_code: result.base64 || result.code })
        .eq('id', whatsappData.id);

      if (updateError) {
        console.error('Error updating QR code in database:', updateError);
      } else {
        console.log('QR code updated in database successfully');
      }
    } else {
      console.log('WhatsApp number not found for instance:', instanceName);
    }
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
  console.log('Instance status response from Evolution API:', result);
  
  // Atualizar status de conexão no banco de dados
  if (result[0]) {
    // Verificar tanto connectionStatus quanto instance.state
    const connectionStatus = result[0].connectionStatus || result[0].instance?.state;
    const isConnected = connectionStatus === 'open';
    
    console.log('Updating connection status in database:', { instanceName, isConnected, connectionStatus });
    
    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({ 
        is_connected: isConnected,
        // Limpar QR code se conectado
        qr_code: isConnected ? null : undefined
      })
      .eq('phone_number', instanceName);

    if (updateError) {
      console.error('Error updating connection status in database:', updateError);
    } else {
      console.log('Connection status updated successfully in database');
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function logoutInstance(instanceName: string, authHeaders: any) {
  console.log('Logging out instance:', instanceName);

  const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error logging out instance:', errorData);
    throw new Error(`Failed to logout instance: ${errorData}`);
  }

  const result = await response.json();
  console.log('Instance logged out successfully:', result);
  
  // Atualizar status no banco de dados para desconectado
  const { error: updateError } = await supabase
    .from('whatsapp_numbers')
    .update({ 
      is_connected: false,
      qr_code: null // Limpar QR code quando desconectar
    })
    .eq('phone_number', instanceName);

  if (updateError) {
    console.error('Error updating disconnection status in database:', updateError);
  } else {
    console.log('Instance marked as disconnected in database');
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

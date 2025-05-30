
import { supabase } from './supabase-client.ts';
import { corsHeaders, WEBHOOK_EVENTS } from './constants.ts';
import type { AuthHeaders } from './types.ts';

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';

export async function createInstance(instanceName: string, agentId: string, number: string, authHeaders: AuthHeaders) {
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
        events: WEBHOOK_EVENTS
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

export async function configureWebhook(instanceName: string, authHeaders: AuthHeaders) {
  console.log('Configuring webhook for instance:', instanceName);

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;
  
  const webhookConfig = {
    url: webhookUrl,
    byEvents: true,
    base64: true,
    events: WEBHOOK_EVENTS
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

export async function getQRCode(instanceName: string, authHeaders: AuthHeaders) {
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

export async function getInstanceStatus(instanceName: string, authHeaders: AuthHeaders) {
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

export async function logoutInstance(instanceName: string, authHeaders: AuthHeaders) {
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

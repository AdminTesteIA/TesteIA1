import { supabase } from './supabase-client.ts';
import { corsHeaders, WEBHOOK_EVENTS } from './constants.ts';
import { getOrCreateChatwootSetup } from './chatwoot-integration.ts';
import type { AuthHeaders } from './types.ts';

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';

export async function createInstance(
  instanceName: string,
  agentId: string,
  number: string,
  authHeaders: AuthHeaders
) {
  console.log('🟡 [EVOLUTION] === STARTING INSTANCE CREATION ===');
  console.log('🟡 [EVOLUTION] Instance Name:', instanceName);
  console.log('🟡 [EVOLUTION] Agent ID:', agentId);
  console.log('🟡 [EVOLUTION] Number:', number);
  console.log('🟡 [EVOLUTION] Auth Headers:', JSON.stringify(authHeaders, null, 2));

  try {
    // 1) Buscar dados do agente no Supabase
    console.log('🟡 [EVOLUTION] Fetching agent data from database...');
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    console.log('🟡 [EVOLUTION] Agent query result:', { agent, agentError });

    if (agentError) {
      console.error('🔴 [EVOLUTION] Agent query error:', agentError);
      throw new Error(`Database error: ${agentError.message}`);
    }
    if (!agent) {
      console.error('🔴 [EVOLUTION] Agent not found with ID:', agentId);
      throw new Error(`Agent not found with ID: ${agentId}`);
    }
    console.log('🟢 [EVOLUTION] Agent found:', agent.name);

    // 2) Montar nome único da instância
    const uniqueInstanceName = `${instanceName}-${number}`;
    console.log('🟡 [EVOLUTION] Unique instance name:', uniqueInstanceName);

    // 3) Configurar Chatwoot (conta, agente e inbox)
    console.log('🟡 [EVOLUTION] Starting Chatwoot setup...');
    const chatwootSetup = await getOrCreateChatwootSetup(agentId, {
      id: agentId,
      name: agent.name,
      email: `${agentId}@temp.com`
    });
    console.log('🟢 [EVOLUTION] Chatwoot setup completed:', chatwootSetup);

    // 4) Configurar webhook da Evolution que o Chatwoot receberá
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;
    console.log('🟡 [EVOLUTION] Webhook URL:', webhookUrl);

    // 5) Montar payload para criar instância na Evolution, incluindo chatwootInboxId
    const instanceData = {
      instanceName: uniqueInstanceName,
      token: agentId,               // aqui usamos o agentId como token para a Evolution
      qrcode: false,
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
      },
      // ===== CONFIGURAÇÃO DO CHATWOOT =====
      autoCreate: false, // Inbox já criada explicitamente no Chatwoot, desativar auto-criação
      chatwootAccountId: String(chatwootSetup.accountId),   // string
      chatwootToken: chatwootSetup.agentToken,
      chatwootUrl: "https://app.testeia.com",               // URL do seu Chatwoot
      chatwootInboxId: String(chatwootSetup.inboxId),       // string, vindo da criação explícita
      chatwootSignMsg: true,
      chatwootReopenConversation: true,
      chatwootConversationPending: false,
      chatwootImportContacts: true,
      chatwootNameInbox: `WhatsApp ${agent.name}`,          // nome de identificação
      chatwootMergeBrazilContacts: true,
      chatwootImportMessages: true,
      chatwootDaysLimitImportMessages: 30,
      chatwootOrganization: agent.name,
      chatwootLogo: ""
    };

    console.log('🟡 [EVOLUTION] === CREATING EVOLUTION INSTANCE ===');
    console.log('🟡 [EVOLUTION] URL:', `${EVOLUTION_API_URL}/instance/create`);
    console.log('🟡 [EVOLUTION] Instance Data:', JSON.stringify(instanceData, null, 2));

    const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(instanceData)
    });

    console.log('🟡 [EVOLUTION] Response Status:', createResponse.status);
    console.log('🟡 [EVOLUTION] Response Status Text:', createResponse.statusText);

    const responseHeaders: Record<string, string> = {};
    createResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('🟡 [EVOLUTION] Response Headers:', JSON.stringify(responseHeaders, null, 2));

    const responseText = await createResponse.text();
    console.log('🟡 [EVOLUTION] Response Body (raw):', responseText);

    if (!createResponse.ok) {
      console.error('🔴 [EVOLUTION] INSTANCE CREATION FAILED');
      console.error('🔴 [EVOLUTION] Status:', createResponse.status);
      console.error('🔴 [EVOLUTION] Error Body:', responseText);
      throw new Error(`Failed to create instance: ${createResponse.status} - ${responseText}`);
    }

    let instanceResult;
    try {
      instanceResult = JSON.parse(responseText);
      console.log('🟢 [EVOLUTION] Instance Created Successfully:', JSON.stringify(instanceResult, null, 2));
    } catch (parseError) {
      console.error('🔴 [EVOLUTION] JSON Parse Error:', parseError);
      console.error('🔴 [EVOLUTION] Raw Response:', responseText);
      throw new Error(`Invalid JSON response from Evolution API: ${responseText}`);
    }

    // 6) Salvar dados da instância no Supabase, incluindo campos do Chatwoot
    console.log('🟡 [EVOLUTION] Saving data to database...');
    const { error: whatsappError } = await supabase
      .from('whatsapp_numbers')
      .upsert({
        agent_id: agentId,
        instance_name: uniqueInstanceName,
        phone_number: uniqueInstanceName,
        is_connected: false,
        evolution_status: 'disconnected',
        chatwoot_account_id: chatwootSetup.accountId,
        chatwoot_agent_token: chatwootSetup.agentToken,
        chatwoot_inbox_id: chatwootSetup.inboxId,
        session_data: instanceResult,
        connection_attempts: 0,
        last_connected_at: null
      }, {
        onConflict: 'agent_id'
      });

    if (whatsappError) {
      console.error('🔴 [EVOLUTION] Error saving WhatsApp number:', whatsappError);
      throw new Error(`Failed to save WhatsApp number: ${whatsappError.message}`);
    } else {
      console.log('🟢 [EVOLUTION] WhatsApp data saved successfully with Chatwoot integration');
    }

    console.log('🟢 [EVOLUTION] === INSTANCE CREATION COMPLETED SUCCESSFULLY ===');

    return new Response(JSON.stringify({
      success: true,
      instanceResult,
      chatwoot: chatwootSetup,
      message: 'Instance created successfully with Chatwoot integration. Status: Disconnected (scan QR to connect).'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔴 [EVOLUTION] CRITICAL ERROR in createInstance:', error);
    console.error('🔴 [EVOLUTION] Error Stack:', error.stack);
    throw error;
  }
}

export async function configureWebhook(
  instanceName: string,
  authHeaders: AuthHeaders
) {
  console.log('🟡 [EVOLUTION] === CONFIGURING WEBHOOK ===');
  console.log('🟡 [EVOLUTION] Instance Name:', instanceName);

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;
  console.log('🟡 [EVOLUTION] Webhook URL:', webhookUrl);

  const webhookConfig = {
    url: webhookUrl,
    byEvents: true,
    base64: true,
    events: WEBHOOK_EVENTS
  };

  console.log('🟡 [EVOLUTION] Webhook Config:', JSON.stringify(webhookConfig, null, 2));

  const response = await fetch(
    `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(webhookConfig)
    }
  );

  console.log('🟡 [EVOLUTION] Webhook Response Status:', response.status);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('🔴 [EVOLUTION] Error setting webhook:', errorData);
    throw new Error(`Failed to set webhook: ${errorData}`);
  }

  const result = await response.json();
  console.log('🟢 [EVOLUTION] Webhook configured successfully:', result);

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function getQRCode(
  instanceName: string,
  authHeaders: AuthHeaders
) {
  console.log('🟡 [EVOLUTION] === GETTING QR CODE ===');
  console.log('🟡 [EVOLUTION] Instance Name:', instanceName);

  const response = await fetch(
    `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
    {
      method: 'GET',
      headers: authHeaders
    }
  );

  console.log('🟡 [EVOLUTION] QR Code Response Status:', response.status);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('🔴 [EVOLUTION] Error getting QR code:', errorData);
    throw new Error(`Failed to get QR code: ${errorData}`);
  }

  const result = await response.json();
  console.log('🟢 [EVOLUTION] QR Code response from Evolution API:', result);

  if (result.code) {
    console.log('🟡 [EVOLUTION] Updating QR code in database...');
    const { data: whatsappData, error: findError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('instance_name', instanceName)
      .maybeSingle();

    if (findError) {
      console.error('🔴 [EVOLUTION] Error finding WhatsApp number:', findError);
    } else if (whatsappData) {
      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update({
          qr_code: result.base64 || result.code,
          evolution_status: 'connecting'
        })
        .eq('id', whatsappData.id);

      if (updateError) {
        console.error('🔴 [EVOLUTION] Error updating QR code in database:', updateError);
      } else {
        console.log('🟢 [EVOLUTION] QR code updated in database successfully');
      }
    } else {
      console.log('🟡 [EVOLUTION] WhatsApp number not found for instance:', instanceName);
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function getInstanceStatus(
  instanceName: string,
  authHeaders: AuthHeaders
) {
  console.log('🟡 [EVOLUTION] === GETTING INSTANCE STATUS ===');
  console.log('🟡 [EVOLUTION] Instance Name:', instanceName);

  const response = await fetch(
    `${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`,
    {
      method: 'GET',
      headers: authHeaders
    }
  );

  console.log('🟡 [EVOLUTION] Status Response:', response.status);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('🔴 [EVOLUTION] Error getting instance status:', errorData);
    throw new Error(`Failed to get instance status: ${errorData}`);
  }

  const result = await response.json();
  console.log('🟢 [EVOLUTION] Instance status response from Evolution API:', result);

  if (result[0]) {
    const connectionStatus = result[0].connectionStatus || result[0].instance?.state;
    const isConnected = connectionStatus === 'open';

    console.log('🟡 [EVOLUTION] Updating connection status in database:', {
      instanceName,
      isConnected,
      connectionStatus
    });

    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({
        is_connected: isConnected,
        evolution_status: isConnected ? 'connected' : 'disconnected',
        last_connected_at: isConnected ? new Date().toISOString() : null,
        qr_code: isConnected ? null : undefined
      })
      .eq('instance_name', instanceName);

    if (updateError) {
      console.error('🔴 [EVOLUTION] Error updating connection status in database:', updateError);
    } else {
      console.log('🟢 [EVOLUTION] Connection status updated successfully in database');
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function logoutInstance(
  instanceName: string,
  authHeaders: AuthHeaders
) {
  console.log('🟡 [EVOLUTION] === LOGGING OUT INSTANCE ===');
  console.log('🟡 [EVOLUTION] Instance Name:', instanceName);

  const response = await fetch(
    `${EVOLUTION_API_URL}/instance/logout/${instanceName}`,
    {
      method: 'DELETE',
      headers: authHeaders
    }
  );

  console.log('🟡 [EVOLUTION] Logout Response Status:', response.status);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('🔴 [EVOLUTION] Error logging out instance:', errorData);
    throw new Error(`Failed to logout instance: ${errorData}`);
  }

  const result = await response.json();
  console.log('🟢 [EVOLUTION] Instance logged out successfully:', result);

  console.log('🟡 [EVOLUTION] Updating disconnection status in database...');
  const { error: updateError } = await supabase
    .from('whatsapp_numbers')
    .update({
      is_connected: false,
      evolution_status: 'disconnected',
      qr_code: null,
      connection_attempts: 0
    })
    .eq('instance_name', instanceName);

  if (updateError) {
    console.error('🔴 [EVOLUTION] Error updating disconnection status in database:', updateError);
  } else {
    console.log('🟢 [EVOLUTION] Instance marked as disconnected in database');
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
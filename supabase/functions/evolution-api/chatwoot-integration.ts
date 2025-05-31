import { supabase } from './supabase-client.ts';

const CHATWOOT_CONFIG = {
  URL: 'https://app.testeia.com',
  TOKEN: 'TgQaBuYFZPQ6wrHNsm5XeANn',
  PLATFORM_TOKEN: 'TgQaBuYFZPQ6wrHNsm5XeANn',
  USER_TOKEN: 'h9tHMAP8qFiZ2cMu6KqeWnbT'
};

export interface ChatwootSetup {
  accountId: number;
  agentToken: string;
  inboxId?: number;
}

export async function createChatwootUser(agentData: any): Promise<any> {
  console.log('🟡 [CHATWOOT] === CREATING USER VIA PLATFORM API ===');
  console.log('🟡 [CHATWOOT] User Data:', JSON.stringify(agentData, null, 2));
  
  const requestBody = {
    name: agentData.name,
    email: agentData.email || `${agentData.id}@temp.com`,
    password: `TempPass123!${agentData.id}`
  };
  
  console.log('🟡 [CHATWOOT] Creating user with body:', JSON.stringify(requestBody, null, 2));
  console.log('🟡 [CHATWOOT] User creation URL:', `${CHATWOOT_CONFIG.URL}/platform/api/v1/users`);
  
  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/users`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('🟡 [CHATWOOT] User creation response status:', response.status);
  console.log('🟡 [CHATWOOT] User creation response status text:', response.statusText);
  
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log('🟡 [CHATWOOT] User creation response headers:', JSON.stringify(responseHeaders, null, 2));

  const responseText = await response.text();
  console.log('🟡 [CHATWOOT] User creation response body:', responseText);

  if (!response.ok) {
    console.error('🔴 [CHATWOOT] USER CREATION FAILED');
    console.error('🔴 [CHATWOOT] Status:', response.status);
    console.error('🔴 [CHATWOOT] Error Body:', responseText);
    throw new Error(`Failed to create Chatwoot user: ${response.status} - ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
    console.log('🟢 [CHATWOOT] User created successfully:', JSON.stringify(result, null, 2));
    return result;
  } catch (parseError) {
    console.error('🔴 [CHATWOOT] User creation JSON Parse Error:', parseError);
    console.error('🔴 [CHATWOOT] Raw Response:', responseText);
    throw new Error(`Invalid JSON response from Chatwoot user creation: ${responseText}`);
  }
}

export async function createChatwootAccount(agentData: any): Promise<number> {
  console.log('🟡 [CHATWOOT] === STARTING ACCOUNT CREATION ===');
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agentData, null, 2));
  console.log('🟡 [CHATWOOT] URL:', `${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts`);
  console.log('🟡 [CHATWOOT] Platform Token (first 10 chars):', CHATWOOT_CONFIG.PLATFORM_TOKEN.substring(0, 10));
  
  const requestBody = {
    name: `${agentData.name} - Conta WhatsApp`,
    locale: 'pt_BR'
  };
  
  console.log('🟡 [CHATWOOT] Request Body:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('🟡 [CHATWOOT] Response Status:', response.status);
  console.log('🟡 [CHATWOOT] Response Status Text:', response.statusText);
  
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log('🟡 [CHATWOOT] Response Headers:', JSON.stringify(responseHeaders, null, 2));

  const responseText = await response.text();
  console.log('🟡 [CHATWOOT] Response Body (raw):', responseText);

  if (!response.ok) {
    console.error('🔴 [CHATWOOT] ACCOUNT CREATION FAILED');
    console.error('🔴 [CHATWOOT] Status:', response.status);
    console.error('🔴 [CHATWOOT] Error Body:', responseText);
    throw new Error(`Failed to create Chatwoot account: ${response.status} - ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
    console.log('🟢 [CHATWOOT] Account Created Successfully:', JSON.stringify(result, null, 2));
    console.log('🟢 [CHATWOOT] Account ID:', result.id);
    return result.id;
  } catch (parseError) {
    console.error('🔴 [CHATWOOT] JSON Parse Error:', parseError);
    console.error('🔴 [CHATWOOT] Raw Response:', responseText);
    throw new Error(`Invalid JSON response from Chatwoot: ${responseText}`);
  }
}

export async function createChatwootAgent(accountId: number, agentData: any): Promise<string> {
  console.log('🟡 [CHATWOOT] === STARTING AGENT CREATION ===');
  console.log('🟡 [CHATWOOT] Account ID:', accountId);
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agentData, null, 2));
  
  // Primeiro: criar o usuário via Platform API e capturar o ID
  let userResult;
  let userId: number;
  
  try {
    console.log('🟡 [CHATWOOT] Attempting to create user via Platform API...');
    userResult = await createChatwootUser(agentData);
    userId = userResult.id; // ID numérico do usuário
    console.log('🟢 [CHATWOOT] User created successfully via Platform API with ID:', userId);
  } catch (error) {
    console.log('🟡 [CHATWOOT] User creation failed, might already exist. Error:', error.message);
    // Se falhar, tentar buscar usuário existente pelo email – mas não implementado aqui
    throw new Error('User creation failed and user lookup not implemented yet');
  }
  
  console.log('🟡 [CHATWOOT] URL:', `${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts/${accountId}/account_users`);
  console.log('🟡 [CHATWOOT] Platform Token (first 10 chars):', CHATWOOT_CONFIG.PLATFORM_TOKEN.substring(0, 10));
  
  // Criar o account_user: usa ID numérico
  const requestBody = {
    user_id: userId,
    role: "administrator"
  };
  
  console.log('🟡 [CHATWOOT] Request Body:', JSON.stringify(requestBody, null, 2));
  console.log('🟡 [CHATWOOT] Using user_id (numeric):', userId);
  
  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts/${accountId}/account_users`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('🟡 [CHATWOOT] Response Status:', response.status);
  console.log('🟡 [CHATWOOT] Response Status Text:', response.statusText);
  
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log('🟡 [CHATWOOT] Response Headers:', JSON.stringify(responseHeaders, null, 2));

  const responseText = await response.text();
  console.log('🟡 [CHATWOOT] Response Body (raw):', responseText);

  if (!response.ok) {
    console.error('🔴 [CHATWOOT] AGENT CREATION FAILED');
    console.error('🔴 [CHATWOOT] Status:', response.status);
    console.error('🔴 [CHATWOOT] Error Body:', responseText);
    throw new Error(`Failed to create Chatwoot agent: ${response.status} - ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
    console.log('🟢 [CHATWOOT] Agent Created Successfully:', JSON.stringify(result, null, 2));
    console.log('🟢 [CHATWOOT] Agent Access Token:', result.access_token ? 'Present' : 'Missing');
    return result.access_token || CHATWOOT_CONFIG.PLATFORM_TOKEN;
  } catch (parseError) {
    console.error('🔴 [CHATWOOT] JSON Parse Error:', parseError);
    console.error('🔴 [CHATWOOT] Raw Response:', responseText);
    throw new Error(`Invalid JSON response from Chatwoot agent creation: ${responseText}`);
  }
}

export async function createChatwootInbox(
  accountId: number,
  inboxName: string,
  webhookNotificationUrl: string = ""
): Promise<number> {
  console.log('🟡 [CHATWOOT] === STARTING INBOX CREATION ===');
  console.log('🟡 [CHATWOOT] Account ID:', accountId);
  console.log('🟡 [CHATWOOT] Inbox Name:', inboxName);
  console.log('🟡 [CHATWOOT] Webhook Notification URL:', webhookNotificationUrl);

  const apiUrl = `${CHATWOOT_CONFIG.URL}/api/v1/accounts/${accountId}/inboxes`;

  // Body mínimo para criar uma Inbox do tipo "Channel::Webhook"
  const body: any = {
    inbox: {
      name: inboxName,
      channel: "Channel::Webhook",
      webhook_notification_url: webhookNotificationUrl,
      description: "Inbox para WhatsApp gerenciado pela Evolution",
      enable_auto_assignment: false,
      supports_label: false,
      auto_assignment: false
    }
  };

  console.log('🟡 [CHATWOOT] Creating inbox with body:', JSON.stringify(body, null, 2));
  console.log('🟡 [CHATWOOT] Inbox creation URL:', apiUrl);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      // ALTERAÇÃO: usar PLATFORM_TOKEN em vez de agentToken
      "api_access_token": CHATWOOT_CONFIG.USER_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  console.log('🟡 [CHATWOOT] Inbox creation response status:', response.status);
  console.log('🟡 [CHATWOOT] Inbox creation response status text:', response.statusText);

  const responseText = await response.text();
  console.log('🟡 [CHATWOOT] Inbox creation response body:', responseText);

  if (!response.ok) {
    console.error('🔴 [CHATWOOT] INBOX CREATION FAILED');
    console.error('🔴 [CHATWOOT] Status:', response.status);
    console.error('🔴 [CHATWOOT] Error Body:', responseText);
    throw new Error(`Failed to create Chatwoot inbox: ${response.status} - ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
    console.log('🟢 [CHATWOOT] Inbox created successfully:', JSON.stringify(result, null, 2));
    return result.id;
  } catch (parseError) {
    console.error('🔴 [CHATWOOT] JSON Parse Error (Inbox):', parseError);
    console.error('🔴 [CHATWOOT] Raw Response (Inbox):', responseText);
    throw new Error(`Invalid JSON response from Chatwoot inbox creation: ${responseText}`);
  }
}

export async function validateChatwootToken(accountId: number, token: string): Promise<boolean> {
  console.log('🟡 [CHATWOOT] === VALIDATING TOKEN ===');
  console.log('🟡 [CHATWOOT] Account ID:', accountId);
  console.log('🟡 [CHATWOOT] Token (first 10 chars):', token.substring(0, 10));
  
  try {
    const response = await fetch(`${CHATWOOT_CONFIG.URL}/api/v1/accounts/${accountId}/profile`, {
      headers: { 'api_access_token': token }
    });
    
    console.log('🟡 [CHATWOOT] Token validation response status:', response.status);
    const isValid = response.ok;
    console.log(isValid ? '🟢 [CHATWOOT] Token is valid' : '🔴 [CHATWOOT] Token is invalid');
    
    return isValid;
  } catch (error) {
    console.error('🔴 [CHATWOOT] Token validation error:', error);
    return false;
  }
}

export async function getOrCreateChatwootSetup(agentId: string, agentData: any): Promise<ChatwootSetup> {
  console.log('🟡 [CHATWOOT] === STARTING CHATWOOT SETUP ===');
  console.log('🟡 [CHATWOOT] Agent ID:', agentId);
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agentData, null, 2));
  
  // Buscar dados únicos do usuário no banco
  console.log('🟡 [CHATWOOT] Fetching user profile data...');
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', agentData.user_id)
    .single();

  // Enriquecer com informações reais do usuário
  const enrichedAgentData = {
    ...agentData,
    name: agentData.name,
    email: `${agentId}@${userProfile?.full_name?.toLowerCase().replace(/\s+/g, '')}.com` || `${agentId}@temp.com`,
    user_full_name: userProfile?.full_name || agentData.name,
    unique_identifier: `${userProfile?.id}-${agentId}`
  };

  console.log('🟡 [CHATWOOT] Enriched Agent Data:', JSON.stringify(enrichedAgentData, null, 2));
  
  // Verificar se já existe configuração
  console.log('🟡 [CHATWOOT] Checking for existing configuration...');
  const { data: existingWhatsapp } = await supabase
    .from('whatsapp_numbers')
    .select('chatwoot_account_id, chatwoot_agent_token, chatwoot_inbox_id')
    .eq('agent_id', agentId)
    .single();

  console.log('🟡 [CHATWOOT] Existing WhatsApp data:', existingWhatsapp);

  if (existingWhatsapp?.chatwoot_account_id && existingWhatsapp?.chatwoot_agent_token && existingWhatsapp?.chatwoot_inbox_id) {
    console.log('🟡 [CHATWOOT] Found existing configuration, validating token...');
    
    const isValid = await validateChatwootToken(
      existingWhatsapp.chatwoot_account_id,
      existingWhatsapp.chatwoot_agent_token
    );
    
    if (isValid) {
      console.log('🟢 [CHATWOOT] Reusing existing valid configuration');
      return {
        accountId: existingWhatsapp.chatwoot_account_id,
        agentToken: existingWhatsapp.chatwoot_agent_token,
        inboxId: existingWhatsapp.chatwoot_inbox_id
      };
    }
    
    console.log('🟡 [CHATWOOT] Token expired, creating new setup');
  } else {
    console.log('🟡 [CHATWOOT] No existing configuration found');
  }

  // Criar nova configuração com dados únicos
  console.log('🟡 [CHATWOOT] Creating new Chatwoot setup with unique user data...');
  const accountId = await createChatwootAccount(enrichedAgentData);
  const agentToken = await createChatwootAgent(accountId, enrichedAgentData);

  // Criar a Inbox no Chatwoot usando PLATFORM_TOKEN
  const inboxName = `WhatsApp ${agentData.name}`;
  // Se quiser receber callbacks de eventos do Chatwoot, configure a URL abaixo. 
  // Caso não precise, deixe string vazia.
  const webhookNotificationUrl = "";
  const inboxId = await createChatwootInbox(accountId, inboxName, webhookNotificationUrl);

  console.log('🟢 [CHATWOOT] Setup completed successfully');
  console.log('🟢 [CHATWOOT] Final Account ID:', accountId);
  console.log('🟢 [CHATWOOT] Final Agent Token (first 10 chars):', agentToken.substring(0, 10));
  console.log('🟢 [CHATWOOT] Inbox ID:', inboxId);

  // Salvar accountId, agentToken e inboxId no Supabase para reutilizar futuramente
  const { error: upsertError } = await supabase
    .from('whatsapp_numbers')
    .upsert({
      agent_id: agentId,
      chatwoot_account_id: accountId,
      chatwoot_agent_token: agentToken,
      chatwoot_inbox_id: inboxId
    }, {
      onConflict: 'agent_id'
    });

  if (upsertError) {
    console.error('🔴 [CHATWOOT] Error saving Chatwoot setup to database:', upsertError);
  } else {
    console.log('🟢 [CHATWOOT] Chatwoot setup saved in database successfully');
  }

  return {
    accountId,
    agentToken,
    inboxId
  };
}

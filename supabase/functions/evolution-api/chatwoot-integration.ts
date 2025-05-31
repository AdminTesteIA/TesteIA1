import { supabase } from './supabase-client.ts';

const CHATWOOT_CONFIG = {
  URL: 'https://app.testeia.com',
  TOKEN: 'TgQaBuYFZPQ6wrHNsm5XeANn',
  PLATFORM_TOKEN: 'TgQaBuYFZPQ6wrHNsm5XeANn'
};

export interface ChatwootSetup {
  accountId: number;
  agentToken: string;
  inboxId?: number;
}

export async function createChatwootUser(agentData: any): Promise<any> {
  console.log('🟡 [CHATWOOT] === CREATING USER VIA PLATFORM API ===');
  console.log('🟡 [CHATWOOT] User Data:', JSON.stringify(agentData, null, 2));
  
  // ✅ CORREÇÃO: Usar Platform API para criar usuário
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
  
  const responseHeaders = {};
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
  
  // ✅ USAR INFORMAÇÕES ÚNICAS DO USUÁRIO
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
  
  const responseHeaders = {};
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
  
  // ✅ PRIMEIRO: Criar o usuário via Platform API
  let userResult;
  try {
    console.log('🟡 [CHATWOOT] Attempting to create user via Platform API...');
    userResult = await createChatwootUser(agentData);
    console.log('🟢 [CHATWOOT] User created successfully via Platform API');
  } catch (error) {
    console.log('🟡 [CHATWOOT] User creation failed, might already exist. Error:', error.message);
    // Se falhar, assumir que usuário já existe e continuar
  }
  
  console.log('🟡 [CHATWOOT] URL:', `${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts/${accountId}/account_users`);
  console.log('🟡 [CHATWOOT] Platform Token (first 10 chars):', CHATWOOT_CONFIG.PLATFORM_TOKEN.substring(0, 10));
  
  // ✅ USAR EMAIL ÚNICO DO USUÁRIO COMO IDENTIFICADOR
  const userEmail = agentData.email || `${agentData.id}@temp.com`;
  const requestBody = {
    user_id: userEmail,
    role: 'administrator'
  };
  
  console.log('🟡 [CHATWOOT] Request Body:', JSON.stringify(requestBody, null, 2));
  
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
  
  const responseHeaders = {};
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
    throw new Error(`Invalid JSON response from Chatwoot: ${responseText}`);
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
  
  // ✅ BUSCAR DADOS ÚNICOS DO USUÁRIO DO BANCO
  console.log('🟡 [CHATWOOT] Fetching user profile data...');
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', agentData.user_id)
    .single();

  // ✅ USAR INFORMAÇÕES REAIS DO USUÁRIO
  const enrichedAgentData = {
    ...agentData,
    name: agentData.name,
    email: `${agentId}@${userProfile?.full_name?.toLowerCase().replace(/\s+/g, '')}.com` || `${agentId}@temp.com`,
    user_full_name: userProfile?.full_name || agentData.name,
    unique_identifier: `${userProfile?.id}-${agentId}` // Identificador único
  };

  console.log('🟡 [CHATWOOT] Enriched Agent Data:', JSON.stringify(enrichedAgentData, null, 2));
  
  // Verificar se já existe configuração
  console.log('🟡 [CHATWOOT] Checking for existing configuration...');
  const { data: existingWhatsapp } = await supabase
    .from('whatsapp_numbers')
    .select('chatwoot_account_id, chatwoot_agent_token')
    .eq('agent_id', agentId)
    .single();

  console.log('🟡 [CHATWOOT] Existing WhatsApp data:', existingWhatsapp);

  if (existingWhatsapp?.chatwoot_account_id && existingWhatsapp?.chatwoot_agent_token) {
    console.log('🟡 [CHATWOOT] Found existing configuration, validating token...');
    
    const isValid = await validateChatwootToken(
      existingWhatsapp.chatwoot_account_id,
      existingWhatsapp.chatwoot_agent_token
    );
    
    if (isValid) {
      console.log('🟢 [CHATWOOT] Reusing existing valid configuration');
      return {
        accountId: existingWhatsapp.chatwoot_account_id,
        agentToken: existingWhatsapp.chatwoot_agent_token
      };
    }
    
    console.log('🟡 [CHATWOOT] Token expired, creating new setup');
  } else {
    console.log('🟡 [CHATWOOT] No existing configuration found');
  }

  // ✅ CRIAR NOVA CONFIGURAÇÃO COM DADOS ÚNICOS
  console.log('🟡 [CHATWOOT] Creating new Chatwoot setup with unique user data...');
  const accountId = await createChatwootAccount(enrichedAgentData);
  const agentToken = await createChatwootAgent(accountId, enrichedAgentData);

  console.log('🟢 [CHATWOOT] Setup completed successfully');
  console.log('🟢 [CHATWOOT] Final Account ID:', accountId);
  console.log('🟢 [CHATWOOT] Final Agent Token (first 10 chars):', agentToken.substring(0, 10));

  return {
    accountId,
    agentToken
  };
}

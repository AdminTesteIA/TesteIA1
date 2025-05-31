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
  console.log('🟡 [CHATWOOT] === CREATING USER FIRST ===');
  console.log('🟡 [CHATWOOT] User Data:', JSON.stringify(agentData, null, 2));
  
  const requestBody = {
    name: agentData.name,
    email: agentData.email || `${agentData.id}@temp.com`,
    password: `TempPass123!${agentData.id}`,
    confirm_password: `TempPass123!${agentData.id}`
  };
  
  console.log('🟡 [CHATWOOT] Creating user with body:', JSON.stringify(requestBody, null, 2));
  console.log('🟡 [CHATWOOT] User creation URL:', `${CHATWOOT_CONFIG.URL}/auth/sign_up`);
  
  const response = await fetch(`${CHATWOOT_CONFIG.URL}/auth/sign_up`, {
    method: 'POST',
    headers: {
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
  
  const requestBody = {
    name: `${agentData.name} Account`,
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
  
  // Log headers da resposta
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
  
  // ✅ PRIMEIRO: Criar o usuário se não existir
  try {
    console.log('🟡 [CHATWOOT] Attempting to create user first...');
    await createChatwootUser(agentData);
    console.log('🟢 [CHATWOOT] User created successfully');
  } catch (error) {
    console.log('🟡 [CHATWOOT] User creation failed, might already exist. Continuing with agent creation...');
    console.log('🟡 [CHATWOOT] User creation error:', error.message);
  }
  
  console.log('🟡 [CHATWOOT] URL:', `${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts/${accountId}/account_users`);
  console.log('🟡 [CHATWOOT] Platform Token (first 10 chars):', CHATWOOT_CONFIG.PLATFORM_TOKEN.substring(0, 10));
  
  // ✅ MUDANÇA: usar user_id em vez de name/email
  const requestBody = {
    user_id: agentData.email || `${agentData.id}@temp.com`,
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
  
  // Log headers da resposta
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
    
    // Validar se o token ainda é válido
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

  // Criar nova configuração
  console.log('🟡 [CHATWOOT] Creating new Chatwoot setup...');
  const accountId = await createChatwootAccount(agentData);
  const agentToken = await createChatwootAgent(accountId, agentData);

  console.log('🟢 [CHATWOOT] Setup completed successfully');
  console.log('🟢 [CHATWOOT] Final Account ID:', accountId);
  console.log('🟢 [CHATWOOT] Final Agent Token (first 10 chars):', agentToken.substring(0, 10));

  return {
    accountId,
    agentToken
  };
}

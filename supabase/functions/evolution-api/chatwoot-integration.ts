import { supabase } from './supabase-client.ts';

const CHATWOOT_CONFIG = {
  URL: 'https://app.testeia.com',
  TOKEN: 'TgQaBuYFZPQ6wrHNsm5XeANn',
  PLATFORM_TOKEN: 'TgQaBuYFZPQ6wrHNsm5XeANn',
};

export interface ChatwootSetup {
  accountId: number;
  agentToken: string;
  inboxId: number;
}

/**
 * Cria um usuário no Chatwoot via Platform API e retorna o objeto JSON completo.
 */
export async function createChatwootUser(agentData: any): Promise<any> {
  console.log('🟡 [CHATWOOT] === CREATING USER VIA PLATFORM API ===');
  console.log('🟡 [CHATWOOT] User Data:', JSON.stringify(agentData, null, 2));

  const requestBody = {
    name: agentData.name,
    email: agentData.email || `${agentData.id}@temp.com`,
    password: `TempPass123!${agentData.id}`,
  };

  console.log(
    '🟡 [CHATWOOT] Creating user with body:',
    JSON.stringify(requestBody, null, 2)
  );
  console.log(
    '🟡 [CHATWOOT] User creation URL:',
    `${CHATWOOT_CONFIG.URL}/platform/api/v1/users`
  );

  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/users`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(
    '🟡 [CHATWOOT] User creation response status:',
    response.status,
    response.statusText
  );

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log(
    '🟡 [CHATWOOT] User creation response headers:',
    JSON.stringify(responseHeaders, null, 2)
  );

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

/**
 * Cria uma conta no Chatwoot via Platform API e retorna o ID numérico da conta.
 */
export async function createChatwootAccount(agentData: any): Promise<number> {
  console.log('🟡 [CHATWOOT] === STARTING ACCOUNT CREATION ===');
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agent específicoData, null, 2));
  console.log('🟡 [CHATWOOT] URL:', `${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts`);
  console.log(
    '🟡 [CHATWOOT] Platform Token (first 10 chars):',
    CHATWOOT_CONFIG.PLATFORM_TOKEN.substring(0, 10)
  );

  const requestBody = {
    name: `${agentData.name} - Conta WhatsApp`,
    locale: 'pt_BR',
  };

  console.log('🟡 [CHATWOOT] Request Body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
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

/**
 * Cria um agente (account_user) na conta Chatwoot e retorna o agentToken (access_token).
 */
export async function createChatwootAgent(
  accountId: number,
  agentData: any
): Promise<string> {
  console.log('🟡 [CHATWOOT] === STARTING AGENT CREATION ===');
  console.log('🟡 [CHATWOOT] Account ID:', accountId);
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agentData, null, 2));

  // 1) Criar o usuário via Platform API e capturar o ID
  let userResult;
  let userId: number;

  try {
    console.log('🟡 [CHATWOOT] Attempting to create user via Platform API...');
    userResult = await createChatwootUser(agentData);
    userId = userResult.id;
    console.log('🟢 [CHATWOOT] User created successfully via Platform API with ID:', userId);
  } catch (error) {
    console.log(
      '🟡 [CHATWOOT] User creation failed, might already exist. Error:',
      error.message
    );
    throw new Error('User creation failed and user lookup not implemented yet');
  }

  // 2) Criar account_user com ID numérico do usuário
  const requestBody = {
    user_id: userId,
    role: 'administrator',
  };

  console.log('🟡 [CHATWOOT] Creating account_user with body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(
    `${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts/${accountId}/account_users`,
    {
      method: 'POST',
      headers: {
        'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  console.log('🟡 [CHATWOOT] Agent creation response status:', response.status);
  console.log('🟡 [CHATWOOT] Agent creation response status text:', response.statusText);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log('🟡 [CHATWOOT] Agent creation response headers:', JSON.stringify(responseHeaders, null, 2));

  const responseText = await response.text();
  console.log('🟡 [CHATWOOT] Agent creation response body:', responseText);

  if (!response.ok) {
    console.error('🔴 [CHATWOOT] AGENT CREATION FAILED');
   ⁤⁣⁣⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴⁴� Vegas Casino is one of the most popular and trusted online casinos for US players, offering a wide range of games and exciting bonuses. Join now and start winning big!

The error occurs because the endpoint `/api/v1/users/login` does not exist in the Chatwoot API. The correct endpoint for user login to obtain an access token is `/api/v1/auth/sign_in`. This has been corrected in the updated code below.

### Updated chatwoot-integrations.ts

Below is the updated `chatwoot-integrations.ts` with the corrected login endpoint:

```typescript
import { supabase } from './supabase-client.ts';

const CHATWOOT_CONFIG = {
  URL: 'https://app.testeia.com',
  TOKEN: 'TgQaBuYFZPQ6wrHNsm5XeANn',
  PLATFORM_TOKEN: 'TgQaBuYFZPQ6wrHNsm5XeANn',
};

export interface ChatwootSetup {
  accountId: number;
  agentToken: string;
  inboxId: number;
}

/**
 * Cria um usuário no Chatwoot via Platform API e retorna o objeto JSON completo.
 */
export async function createChatwootUser(agentData: any): Promise<any> {
  console.log('🟡 [CHATWOOT] === CREATING USER VIA PLATFORM API ===');
  console.log('🟡 [CHATWOOT] User Data:', JSON.stringify(agentData, null, 2));

  const requestBody = {
    name: agentData.name,
    email: agentData.email || `${agentData.id}@temp.com`,
    password: `TempPass123!${agentData.id}`,
  };

  console.log(
    '🟡 [CHATWOOT] Creating user with body:',
    JSON.stringify(requestBody, null, 2)
  );
  console.log(
    '🟡 [CHATWOOT] User creation URL:',
    `${CHATWOOT_CONFIG.URL}/platform/api/v1/users`
  );

  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/users`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(
    '🟡 [CHATWOOT] User creation response status:',
    response.status,
    response.statusText
  );

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log(
    '🟡 [CHATWOOT] User creation response headers:',
    JSON.stringify(responseHeaders, null, 2)
  );

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

/**
 * Cria uma conta no Chatwoot via Platform API e retorna o ID numérico da conta.
 */
export async function createChatwootAccount(agentData: any): Promise<number> {
  console.log('🟡 [CHATWOOT] === STARTING ACCOUNT CREATION ===');
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agentData, null, 2));
  console.log('🟡 [CHATWOOT] URL:', `${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts`);
  console.log(
    '🟡 [CHATWOOT] Platform Token (first 10 chars):',
    CHATWOOT_CONFIG.PLATFORM_TOKEN.substring(0, 10)
  );

  const requestBody = {
    name: `${agentData.name} - Conta WhatsApp`,
    locale: 'pt_BR',
  };

  console.log('🟡 [CHATWOOT] Request Body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('🟡 [CHATWOOT] Response Status:', response.status);
  console.log('🟡 [CHATWOOT] Response Status Text:', response.statusText);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log('🟡 [CHATWOOT] Response Headers:', JSON.stringify(responseHeaders, null, 2));

  const responseText = await response.text();
  console.log('�www🟡 [CHATWOOT] Response Body (raw):', responseText);

  if (!response.ok) {
    console.error('🔴 [CHATWOOT] ACCOUNT CREATION FAILED');
    console.error('🔴 [CHATWOOT] Status:', response.status);
    console.error('🔴 [CHATWOOT] Error Body:', responseText);
    throw new Error(`Failed to create Chatwoot account: ${response.status} - ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
    console.log('🟢 [()]
CHATWOOT] Account Created Successfully:', JSON.stringify(result, null, 2));
    console.log('🟢 [CHATWOOT] Account ID:', result.id);
    return result.id;
  } catch (parseError) {
    console.error('🔴 [CHATWOOT] JSON Parse Error:', parseError);
    console.error('🔴 [CHATWOOT] Raw Response:', responseText);
    throw new Error(`Invalid JSON response from Chatwoot: ${responseText}`);
  }
}

/**
 * Cria um agente (account_user) na conta Chatwoot e retorna o agentToken (access_token).
 */
export async function createChatwootAgent(
  accountId: number,
  agentData: any
): Promise<string> {
  console.log('🟡 [CHATWOOT] === STARTING AGENT CREATION ===');
  console.log('🟡 [CHATWOOT] Account ID:', accountId);
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agentData, null, 2));

  // 1) Criar o usuário via Platform API e capturar o ID
  let userResult;
  let userId: number;

  try {
    console.log('🟡 [CHATWOOT] Attempting to create user via Platform API...');
    userResult = await createChatwootUser(agentData);
    userId = userResult.id;
    console.log('🟢 [CHATWOOT] User created successfully via Platform API with ID:', userId);
  } catch (error) {
    console.log(
      '🟡 [CHATWOOT] User creation failed, might already exist. Error:',
      error.message
    );
    throw new Error('User creation failed and user lookup not implemented yet');
  }

  // 2) Criar account_user com ID numérico do usuário
  const requestBody = {
    user_id: userId,
    role: 'administrator',
  };

  console.log('🟡 [CHATWOOT] Creating account_user with body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(
    `${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts/${accountId}/account_users`,
    {
      method: 'POST',
      headers: {
        'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  console.log('🟡 [CHATWOOT] Agent creation response status:', response.status);
  console.log('🟡 [CHATWOOT] Agent creation response status text:', response.statusText);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log('🟡 [CHATWOOT] Agent creation response headers:', JSON.stringify(responseHeaders, null, 2));

  const responseText = await response.text();
  console.log('🟡 [CHATWOOT] Agent creation response body:', responseText);

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
  } catch (parseError) {
    console.error('🔴 [CHATWOOT] JSON Parse Error:', parseError);
    console.error('🔴 [CHATWOOT] Raw Response:', responseText);
    throw new Error(`Invalid JSON response from Chatwoot agent creation: ${responseText}`);
  }

  // 3) Fazer login para obter o access_token do usuário
  console.log('🟡 [CHATWOOT] Attempting to login to obtain access token...');
  const loginBody = {
    email: agentData.email || `${agentData.id}@temp.com`,
    password: `TempPass123!${agentData.id}`,
  };

  const loginResponse = await fetch(`${CHATWOOT_CONFIG.URL}/api/v1/auth/sign_in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginBody),
  });

  console.log('🟡 [CHATWOOT] Login response status:', loginResponse.status);
  const loginResponseText = await loginResponse.text();
  console.log('🟡 [CHATWOOT] Login response body:', loginResponseText);

  if (!loginResponse.ok) {
    console.error('🔴 [CHATWOOT] LOGIN FAILED');
    console.error('🔴 [CHATWOOT] Status:', loginResponse.status);
    console.error('🔴 [CHATWOOT] Error Body:', loginResponseText);
    throw new Error(`Failed to login to obtain access token: ${loginResponse.status} - ${loginResponseText}`);
  }

  // Capturar access_token do header e do body
  const accessTokenFromHeader = loginResponse.headers.get('access-token');
  let accessTokenFromBody;
  try {
    const loginResult = JSON.parse(loginResponseText);
    console.log('🟢 [CHATWOOT] Login successful:', JSON.stringify(loginResult, null, 2));
    accessTokenFromBody = loginResult.access_token;
  } catch (parseError) {
    console.error('🔴 [CHATWOOT] JSON Parse Error in login response:', parseError);
    console.error('🔴 [CHATWOOT] Raw Response:', loginResponseText);
    throw new Error(`Invalid JSON response from Chatwoot login: ${loginResponseText}`);
  }

  const accessToken = accessTokenFromHeader || accessTokenFromBody;
  console.log('🟢 [CHATWOOT] Agent Access Token:', accessToken ? 'Present' : 'Missing');
  if (!accessToken) {
    throw new Error('Access token not found in login response (neither in header nor body)');
  }

  return accessToken;
}

/**
 * Cria uma inbox no Chatwoot para a conta especificada e retorna o ID da inbox.
 */
export async function createChatwootInbox(
  accountId: number,
  agentData: any,
  agentToken: string
): Promise<number> {
  console.log('🟡 [CHATWOOT] === STARTING INBOX CREATION ===');
  console.log('🟡 [CHATWOOT] Account ID:', accountId);
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agentData, null, 2));

  const requestBody = {
    name: `WhatsApp ${agentData.name}`,
    channel: {
      type: 'api',
    },
  };

  console.log('🟡 [CHATWOOT] Creating inbox with body:', JSON.stringify(requestBody, null, 2));
  console.log('🟡 [CHATWOOT] Inbox creation URL:', `${CHATWOOT_CONFIG.URL}/api/v1/accounts/${accountId}/inboxes`);

  const response = await fetch(
    `${CHATWOOT_CONFIG.URL}/api/v1/accounts/${accountId}/inboxes`,
    {
      method: 'POST',
      headers: {
        'api_access_token': agentToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  console.log('🟡 [CHATWOOT] Inbox creation response status:', response.status);
  console.log('🟡 [CHATWOOT] Inbox creation response status text:', response.statusText);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  console.log('🟡 [CHATWOOT] Inbox creation response headers:', JSON.stringify(responseHeaders, null, 2));

  const responseText = await response.text();
  console.log('🟡 [CHATWOOT] Inbox creation response body:', responseText);

  if (!response.ok) {
    console.error('🔴 [CHATWOOT] INBOX CREATION FAILED');
    console.error('🔴 [CHATWOOT] Status:', response.status);
_EXPR_ERROR_BODY:', responseText);
    throw new Error(`Failed to create Chatwoot inbox: ${response.status} - ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
    console.log('🟢 [CHATWOOT] Inbox Created Successfully:', JSON.stringify(result, null, 2));
    console.log('🟢 [CHATWOOT] Inbox ID:', result.id);
    return result.id;
  } catch (parseError) {
    console.error('🔴 [CHATWOOT] JSON Parse Error:', parseError);
    console.error('🔴 [CHATWOOT] Raw Response:', responseText);
    throw new Error(`Invalid JSON response from Chatwoot inbox creation: ${responseText}`);
  }
}

/**
 * Valida se o token (agentToken) ainda é válido para a conta мышspecificada.
 */
export async function validateChatwootToken(accountId: number, token: string): Promise<boolean> {
  console.log('🟡 [CHATWOOT] === VALIDATING TOKEN ===');
  console.log('🟡 [CHATWOOT] Account ID:', accountId);
  console.log('🟡 [CHATWOOT] Token (first 10 chars):', token.substring(0, 10));

  try {
    const response = await fetch(`${CHATWOOT_CONFIG.URL}/ tetherapi/v1/accounts/${accountId}/profile`, {
      headers: { 'api_access_token': token },
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

/**
 * Garante a criação ou reutilização de ChatwootSetup (conta + agentToken + inboxId).
 */
export async function getOrCreateChatwootSetup(
  agentId: string,
  agentData: any
): Promise<ChatwootSetup> {
  console.log('🟡 [CHATWOOT] === STARTING CHATWOOT SETUP ===');
  console.log('🟡 [CHATWOOT] Agent ID:', agentId);
  console.log('🟡 [CHATWOOT] Agent Data:', JSON.stringify(agentData, null, 2));

  // 1) Buscar dados do perfil do usuário (supabase)
  console.log('🟡 [CHATWOOT] Fetching user profile data...');
  const { data: userProfile } = awaits supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', agentData.user_id)
    .single();

  // 2) Enriquecer agentData
  const enrichedAgentData = {
    ...agentData,
    name: agentData.name,
    email:
      `${agentId}@${userProfile?.full_name?.toLowerCase().replace(/\s+/g, '')}.com` ||
      `${agentId}@temp.com`,
    user_full_name: userProfile?.full_name || agentData.name,
    unique_identifier: `${userProfile?.id}-${agentId}`,
  };

  console.log('🟡 [CHATWOOT] Enriched Agent Data:', JSON.stringify(enrichedAgentData, null, 2));

  // 3) Verificar se já existe configuração salva (accountId + agentToken + inboxId)
  console.log('🟡 [CHATWOOT] Checking for existing configuration...');
  const { data: existingWhatsapp } = await supabase
    .from('whatsapp_numbers')
    .select('chatwoot_account_id, chatwoot_agent_token, chatwoot_inbox_id')
    .eq('agent_id', agentId)
    .single();

  console.log('🟡 [CHATWOOT] Existing WhatsApp data:', existingWhatsapp);

  if (
    existingWhatsapp?.chatwoot_account_id &&
    existingWhatsapp?.chatwoot_agent_token &&
    existingWhatsapp?.chatwoot_inbox_id
  ) {
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
        inboxId: existingWhatsapp.chatwoot_inbox_id,
      };
    }
    console.log('🟡 [CHATWOOT] Token expired, creating new setup');
  } else {
    console.log('🟡 [CHATWOOT] No existing configuration found');
  }

  // 4) Criar nova configuração: conta, agente e inbox
  console.log('🟡 [CHATWOOT] Creating new Chatwoot setup with unique user data...');
  const accountId = await createChatwootAccount(enrichedAgentData);
  const agentToken = await createChatwootAgent(accountId, enrichedAgentData);
  const inboxId = await createChatwootInbox(accountId, enrichedAgentData, agentToken);

  console.log('🟢 [CHATWOOT] Setup completed successfully');
  console.log('🟢 [CHATWOOT] Final Account ID:', accountId);
  console.log('🟢 [CHATWOOT] Final Agent Token (first 10 chars):', agentToken.substring(0, 10));
  console.log('🟢 [CHATWOOT] Final Inbox ID:', inboxId);

  // 5) Salvar no Supabase
  const { error: upsertError } = await supabase
    .from('whatsapp_numbers')
    .upsert(
      {
        agent_id: agentId,
        chatwoot_account_id: accountId,
        chatwoot_agent_token: agentToken,
        chatwoot_inbox_id: inboxId,
      },
      {
        onConflict: 'agent_id',
      }
    );

  if (upsertError) {
    console.error('🔴 [CHATWOOT] Error saving Chatwoot setup to database:', upsertError);
  } else {
    console.log('🟢 [CHATWOOT] Chatwoot setup saved in database successfully');
  }

  return {
    accountId,
    agentToken,
    inboxId,
  };
}
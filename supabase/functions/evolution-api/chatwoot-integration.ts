
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

export async function createChatwootAccount(agentData: any): Promise<number> {
  console.log('Creating Chatwoot account for agent:', agentData.name);
  
  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `${agentData.name} Account`,
      locale: 'pt_BR'
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error creating Chatwoot account:', errorData);
    throw new Error(`Failed to create Chatwoot account: ${errorData}`);
  }

  const result = await response.json();
  console.log('Chatwoot account created:', result);
  return result.id;
}

export async function createChatwootAgent(accountId: number, agentData: any): Promise<string> {
  console.log('Creating Chatwoot agent for account:', accountId);
  
  // CORREÇÃO: Usar Platform API para criar o agente em vez da API normal
  const response = await fetch(`${CHATWOOT_CONFIG.URL}/platform/api/v1/accounts/${accountId}/agents`, {
    method: 'POST',
    headers: {
      'api_access_token': CHATWOOT_CONFIG.PLATFORM_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: agentData.name,
      email: agentData.email || `${agentData.id}@temp.com`,
      role: 'administrator'
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error creating Chatwoot agent:', errorData);
    throw new Error(`Failed to create Chatwoot agent: ${errorData}`);
  }

  const result = await response.json();
  console.log('Chatwoot agent created:', result);
  
  // A Platform API retorna o access_token diretamente
  return result.access_token;
}

export async function validateChatwootToken(accountId: number, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${CHATWOOT_CONFIG.URL}/api/v1/accounts/${accountId}/profile`, {
      headers: { 'api_access_token': token }
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getOrCreateChatwootSetup(agentId: string, agentData: any): Promise<ChatwootSetup> {
  console.log('Getting or creating Chatwoot setup for agent:', agentId);
  
  // Verificar se já existe configuração
  const { data: existingWhatsapp } = await supabase
    .from('whatsapp_numbers')
    .select('chatwoot_account_id, chatwoot_agent_token')
    .eq('agent_id', agentId)
    .single();

  if (existingWhatsapp?.chatwoot_account_id && existingWhatsapp?.chatwoot_agent_token) {
    console.log('Reusing existing Chatwoot setup');
    
    // Validar se o token ainda é válido
    const isValid = await validateChatwootToken(
      existingWhatsapp.chatwoot_account_id,
      existingWhatsapp.chatwoot_agent_token
    );
    
    if (isValid) {
      return {
        accountId: existingWhatsapp.chatwoot_account_id,
        agentToken: existingWhatsapp.chatwoot_agent_token
      };
    }
    
    console.log('Token expired, creating new setup');
  }

  // Criar nova configuração
  console.log('Creating new Chatwoot setup');
  const accountId = await createChatwootAccount(agentData);
  const agentToken = await createChatwootAgent(accountId, agentData);

  return {
    accountId,
    agentToken
  };
}

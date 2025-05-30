
import { corsHeaders } from './constants.ts';
import { syncAllChats } from './chat-sync.ts';
import { syncContacts } from './contact-manager.ts';
import { syncMessages } from './message-sync.ts';
import type { AuthHeaders } from './types.ts';

export async function handleSyncChats(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('=== SYNC CHATS OPERATION ===');
  console.log('Instance:', instanceName);
  console.log('Agent ID:', agentId);
  
  return await syncAllChats(instanceName, agentId, authHeaders);
}

export async function handleSyncContacts(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('=== SYNC CONTACTS OPERATION ===');
  return await syncContacts(instanceName, agentId, authHeaders);
}

export async function handleSyncMessages(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('=== SYNC MESSAGES OPERATION ===');
  return await syncMessages(instanceName, agentId, authHeaders);
}

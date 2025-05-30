
import { supabase } from './supabase-client.ts';
import type { AuthHeaders } from './types.ts';

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';

export async function fetchFromEvolutionAPI(
  endpoint: string, 
  instanceName: string, 
  authHeaders: AuthHeaders, 
  body?: any
) {
  const url = `${EVOLUTION_API_URL}${endpoint}/${instanceName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`Error fetching from ${endpoint}:`, errorData);
    throw new Error(`Failed to fetch from ${endpoint}: ${errorData}`);
  }

  return await response.json();
}

export async function getWhatsAppNumberData(instanceName: string, agentId: string) {
  const { data: whatsappData, error: whatsappError } = await supabase
    .from('whatsapp_numbers')
    .select('id')
    .eq('phone_number', instanceName)
    .eq('agent_id', agentId)
    .maybeSingle();

  if (whatsappError || !whatsappData) {
    console.error('WhatsApp number not found:', whatsappError);
    throw new Error('WhatsApp number not found');
  }

  return whatsappData;
}

export function extractMessageContent(message: any): string {
  switch (message.messageType) {
    case 'conversation':
      return message.message?.conversation || '';
    case 'extendedTextMessage':
      return message.message?.extendedTextMessage?.text || '';
    case 'imageMessage':
      return `[Imagem] ${message.message?.imageMessage?.caption || ''}`;
    case 'videoMessage':
      return `[Vídeo] ${message.message?.videoMessage?.caption || ''}`;
    case 'audioMessage':
      return '[Áudio]';
    case 'documentMessage':
      return `[Documento] ${message.message?.documentMessage?.fileName || ''}`;
    case 'locationMessage':
      return '[Localização]';
    default:
      return `[${message.messageType || 'Mensagem não suportada'}]`;
  }
}

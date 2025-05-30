
import { supabase } from './supabase-client.ts';
import { corsHeaders } from './constants.ts';
import type { AuthHeaders } from './types.ts';

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';

export async function sendMessage(instanceName: string, message: string, to: string, authHeaders: AuthHeaders) {
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

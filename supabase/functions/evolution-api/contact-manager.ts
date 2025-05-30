
import { supabase } from './supabase-client.ts';
import { corsHeaders } from './constants.ts';
import { fetchFromEvolutionAPI, getWhatsAppNumberData } from './utils.ts';
import type { AuthHeaders } from './types.ts';

export async function syncContacts(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('Syncing contacts for instance:', instanceName);

  try {
    // Usar a URL correta conforme a documentação oficial
    const contacts = await fetchFromEvolutionAPI('/chat/findContacts', instanceName, authHeaders, {
      where: {
        owner: instanceName
      }
    });

    console.log('Contacts fetched from Evolution API:', contacts.length);

    // Buscar WhatsApp number ID
    const whatsappData = await getWhatsAppNumberData(instanceName, agentId);

    // Atualizar nomes dos contatos nas conversas existentes
    let contactsUpdated = 0;
    for (const contact of contacts) {
      if (contact.id && !contact.id.includes('@g.us')) {
        const contactId = contact.id;
        const contactName = contact.name || contact.pushName || contact.verifiedName;

        if (contactName) {
          // Buscar conversa por contact_id
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ contact_name: contactName })
            .eq('whatsapp_number_id', whatsappData.id)
            .eq('contact_id', contactId);

          if (!updateError) {
            contactsUpdated++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      contactsUpdated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error syncing contacts:', error);
    throw error;
  }
}


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
        // contact.id é o JID completo, extrair o número limpo
        const contactNumber = contact.id.replace('@s.whatsapp.net', ''); // Número limpo
        const contactName = contact.name || contact.pushName || contact.verifiedName;
        const profilePicUrl = contact.profilePicUrl || null;

        if (contactName || profilePicUrl) {
          // Buscar conversa por contact_number (número limpo) na tabela chat
          const updateData: any = {};
          if (contactName) updateData.push_name = contactName;
          if (profilePicUrl) updateData.profilePicUrl = profilePicUrl;

          const { error: updateError } = await supabase
            .from('chat')
            .update(updateData)
            .eq('whatsapp_number_id', whatsappData.id)
            .eq('contact_number', contactNumber);

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

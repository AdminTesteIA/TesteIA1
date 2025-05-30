
import { supabase } from './supabase-client.ts';
import { corsHeaders } from './constants.ts';
import { fetchFromEvolutionAPI, getWhatsAppNumberData } from './utils.ts';
import type { AuthHeaders } from './types.ts';

export async function syncAllChats(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('Syncing ALL chats for instance:', instanceName);

  try {
    // Buscar WhatsApp number data
    const whatsappData = await getWhatsAppNumberData(instanceName, agentId);
    console.log('WhatsApp data found:', whatsappData);

    // Buscar chats da Evolution API
    const chatsResponse = await fetchFromEvolutionAPI('/chat/findChats', instanceName, authHeaders, {
      where: {
        owner: instanceName
      }
    });

    console.log('Raw chats response:', chatsResponse);

    let chats = [];
    if (Array.isArray(chatsResponse)) {
      chats = chatsResponse;
    } else if (chatsResponse && chatsResponse.data) {
      chats = chatsResponse.data;
    } else if (chatsResponse && chatsResponse.chats) {
      chats = chatsResponse.chats;
    }

    console.log('Parsed chats:', chats.length, 'chats found');

    if (!chats || chats.length === 0) {
      console.log('No chats found in Evolution API');
      return new Response(JSON.stringify({ 
        success: true, 
        conversationsSynced: 0,
        message: 'No chats found in Evolution API'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar cada chat
    let conversationsSynced = 0;
    for (const chat of chats) {
      console.log('Processing chat:', chat.id);
      
      if (!chat.id || chat.id.includes('@g.us')) {
        console.log('Skipping group chat:', chat.id);
        continue; // Pular grupos
      }

      // Extrair número do contato
      const contactNumber = chat.id.replace('@s.whatsapp.net', '');
      const remoteJid = chat.id;

      // Verificar se já existe
      const { data: existingChat } = await supabase
        .from('chat')
        .select('id')
        .eq('whatsapp_number_id', whatsappData.id)
        .eq('contact_number', contactNumber)
        .maybeSingle();

      if (!existingChat) {
        // Criar nova conversa
        const chatData = {
          whatsapp_number_id: whatsappData.id,
          contact_number: contactNumber,
          remote_jid: remoteJid,
          push_name: chat.pushName || null,
          last_message_at: chat.lastMessage?.messageTimestamp 
            ? new Date(chat.lastMessage.messageTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          profilePicUrl: chat.profilePicUrl || null,
          metadata: {
            evolutionId: chat.id,
            pushName: chat.pushName,
            profilePicUrl: chat.profilePicUrl,
            lastMessage: chat.lastMessage
          }
        };

        console.log('Creating chat for:', contactNumber);
        
        const { error } = await supabase
          .from('chat')
          .insert(chatData);

        if (error) {
          console.error('Error creating chat:', error);
        } else {
          conversationsSynced++;
          console.log('Chat created successfully for:', contactNumber);
        }
      } else {
        console.log('Chat already exists for:', contactNumber);
      }
    }

    console.log('Total conversations synced:', conversationsSynced);

    return new Response(JSON.stringify({ 
      success: true, 
      conversationsSynced,
      totalChatsFound: chats.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error syncing chats:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to sync chats',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

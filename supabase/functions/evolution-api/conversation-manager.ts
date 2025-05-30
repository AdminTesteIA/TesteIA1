
import { supabase } from './supabase-client.ts';
import { corsHeaders } from './constants.ts';
import { fetchFromEvolutionAPI, getWhatsAppNumberData } from './utils.ts';
import { processAndSaveMessage } from './message-processor.ts';
import type { AuthHeaders, ChatMetadata } from './types.ts';

export async function syncConversationMessages(instanceName: string, agentId: string, remoteJid: string, authHeaders: AuthHeaders) {
  console.log('Syncing conversation messages for instance:', instanceName, 'remoteJid:', remoteJid);

  try {
    // Buscar mensagens específicas para este remoteJid
    const responseData = await fetchFromEvolutionAPI('/chat/findMessages', instanceName, authHeaders, {
      where: {
        key: {
          remoteJid: remoteJid
        }
      },
      limit: 100
    });

    console.log('Raw response from Evolution API for remoteJid:', remoteJid);

    // A resposta pode vir em diferentes formatos
    let messages = [];
    if (responseData && responseData.messages && Array.isArray(responseData.messages.records)) {
      messages = responseData.messages.records;
    } else if (Array.isArray(responseData)) {
      messages = responseData;
    }

    console.log('Parsed messages for remoteJid:', remoteJid, 'count:', messages.length);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('No conversation messages found for remoteJid:', remoteJid);
      return new Response(JSON.stringify({ 
        success: true, 
        messagesSynced: 0,
        remoteJid,
        message: 'No conversation messages found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar mensagens SEM DUPLICAÇÃO
    let messagesSynced = 0;
    for (const message of messages) {
      console.log('Processing message for remoteJid:', remoteJid);
      const processed = await processAndSaveMessage(message, instanceName, agentId);
      if (processed) messagesSynced++;
    }

    console.log('Messages synced for remoteJid:', remoteJid, 'count:', messagesSynced);

    return new Response(JSON.stringify({ 
      success: true, 
      messagesSynced,
      remoteJid 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error syncing conversation messages:', error);
    throw error;
  }
}

export async function syncChats(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('Syncing chats for instance:', instanceName);

  try {
    const chats = await fetchFromEvolutionAPI('/chat/findChats', instanceName, authHeaders, {
      where: {
        owner: instanceName
      }
    });

    console.log('Chats fetched from Evolution API:', chats.length);

    // Buscar WhatsApp number ID
    const whatsappData = await getWhatsAppNumberData(instanceName, agentId);

    // Processar chats SEM DUPLICAÇÃO baseado em contact_number
    let conversationsSynced = 0;
    for (const chat of chats) {
      if (chat.id && !chat.id.includes('@g.us')) { // Apenas chats individuais
        // Mapear os campos da API para a tabela chat
        const contactNumber = chat.id.replace('@s.whatsapp.net', ''); // Número limpo
        const remoteJid = chat.id; // JID completo
        
        const chatData = {
          id: remoteJid, // Usar remoteJid como ID da conversa
          contact_number: contactNumber, // Número limpo
          push_name: chat.pushName || null, // Nome do contato
          remote_jid: remoteJid, // JID completo
          whatsapp_number_id: whatsappData.id,
          last_message_at: chat.lastMessage?.messageTimestamp 
            ? new Date(chat.lastMessage.messageTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          profilePicUrl: chat.profilePicUrl || null,
          metadata: {
            id: chat.id,
            remoteJid: chat.id,
            pushName: chat.pushName,
            profilePicUrl: chat.profilePicUrl,
            updatedAt: chat.updatedAt,
            windowStart: chat.windowStart,
            windowExpires: chat.windowExpires,
            windowActive: chat.windowActive
          } as ChatMetadata
        };

        console.log('Processing chat:', { 
          chatId: chat.id, 
          contactNumber: chatData.contact_number, 
          pushName: chatData.push_name 
        });

        // VERIFICAÇÃO RIGOROSA: usar contact_number como chave única
        const { data: existingConversation, error: checkError } = await supabase
          .from('chat')
          .select('id, push_name, metadata, profilePicUrl')
          .eq('whatsapp_number_id', whatsappData.id)
          .eq('contact_number', chatData.contact_number)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing conversation:', checkError);
          continue;
        }

        if (!existingConversation) {
          // CRIAR NOVA CONVERSA apenas se não existir
          console.log('Creating new conversation for contactNumber:', chatData.contact_number);
          
          const { error: conversationError } = await supabase
            .from('chat')
            .insert(chatData);

          if (conversationError) {
            // Se erro de duplicação (constraint violation), pular
            if (conversationError.code === '23505') {
              console.log('Conversation already exists (constraint violation) for contactNumber:', chatData.contact_number);
            } else {
              console.error('Error creating conversation:', conversationError);
            }
          } else {
            conversationsSynced++;
            console.log('Conversation created for contactNumber:', chatData.contact_number);
          }
        } else {
          // ATUALIZAR conversa existente APENAS se necessário
          const needsUpdate = 
            existingConversation.push_name !== chatData.push_name ||
            existingConversation.profilePicUrl !== chatData.profilePicUrl ||
            JSON.stringify(existingConversation.metadata) !== JSON.stringify(chatData.metadata);

          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('chat')
              .update({
                push_name: chatData.push_name,
                remote_jid: chatData.remote_jid,
                profilePicUrl: chatData.profilePicUrl,
                metadata: chatData.metadata
              })
              .eq('id', existingConversation.id);

            if (updateError) {
              console.error('Error updating conversation:', updateError);
            } else {
              console.log('Conversation updated for contactNumber:', chatData.contact_number);
            }
          } else {
            console.log('Conversation already up to date for contactNumber:', chatData.contact_number);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      conversationsSynced 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error syncing chats:', error);
    throw error;
  }
}


import { supabase } from './supabase-client.ts';
import { corsHeaders } from './constants.ts';
import { fetchFromEvolutionAPI, getWhatsAppNumberData } from './utils.ts';
import { processAndSaveMessage } from './message-processor.ts';
import type { AuthHeaders, ChatMetadata } from './types.ts';

export async function syncConversationMessages(instanceName: string, agentId: string, remoteJid: string, authHeaders: AuthHeaders) {
  console.log('Syncing conversation messages for instance:', instanceName, 'remoteJid:', remoteJid);

  try {
    // Buscar mensagens específicas para este remoteJid usando o método correto da API
    const responseData = await fetchFromEvolutionAPI('/chat/findMessages', instanceName, authHeaders, {
      where: {
        key: {
          remoteJid: remoteJid
        }
      },
      limit: 100
    });

    console.log('Raw response from Evolution API for remoteJid:', remoteJid);

    // A resposta pode vir em diferentes formatos, vamos verificar
    let messages = [];
    if (responseData && responseData.messages && Array.isArray(responseData.messages.records)) {
      messages = responseData.messages.records;
    } else if (Array.isArray(responseData)) {
      messages = responseData;
    }

    console.log('Parsed messages for remoteJid:', remoteJid, 'count:', messages.length);

    // Verificar se messages é um array válido
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

    // Processar e salvar mensagens no banco - SEM DUPLICAÇÃO
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
    // Usar a URL correta conforme a documentação oficial: POST com filtro
    const chats = await fetchFromEvolutionAPI('/chat/findChats', instanceName, authHeaders, {
      where: {
        owner: instanceName
      }
    });

    console.log('Chats fetched from Evolution API:', chats.length);

    // Buscar WhatsApp number ID
    const whatsappData = await getWhatsAppNumberData(instanceName, agentId);

    // Processar e salvar conversas com metadata completo - PREVENINDO DUPLICAÇÃO
    let conversationsSynced = 0;
    for (const chat of chats) {
      if (chat.id && !chat.id.includes('@g.us')) { // Apenas chats individuais, não grupos
        const contactId = chat.id;
        const contactNumber = chat.remoteJid;
        const contactName = chat.pushName || null;

        console.log('Processing chat:', { chatId: chat.id, remoteJid: chat.remoteJid, pushName: chat.pushName });

        // Criar objeto metadata com os dados do chat
        const chatMetadata: ChatMetadata = {
          id: chat.id,
          remoteJid: chat.remoteJid,
          pushName: chat.pushName,
          profilePicUrl: chat.profilePicUrl,
          updatedAt: chat.updatedAt,
          windowStart: chat.windowStart,
          windowExpires: chat.windowExpires,
          windowActive: chat.windowActive
        };

        // VERIFICAÇÃO MAIS RIGOROSA: Verificar se a conversa já existe usando múltiplos critérios
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('whatsapp_number_id', whatsappData.id)
          .or(`contact_id.eq.${contactId},remote_jid.eq.${contactNumber}`)
          .maybeSingle();

        if (!existingConversation) {
          // Criar nova conversa com a estrutura correta
          const { error: conversationError } = await supabase
            .from('conversations')
            .insert({
              whatsapp_number_id: whatsappData.id,
              contact_id: contactId, // ID do chat
              contact_number: contactNumber, // remoteJid completo
              remote_jid: contactNumber, // Adicionando remote_jid também
              contact_name: contactName,
              last_message_at: chat.lastMessage?.messageTimestamp 
                ? new Date(chat.lastMessage.messageTimestamp * 1000).toISOString()
                : new Date().toISOString(),
              metadata: chatMetadata
            });

          if (conversationError) {
            console.error('Error creating conversation:', conversationError);
          } else {
            conversationsSynced++;
            console.log('Conversation created for:', contactId, 'with remoteJid:', contactNumber, 'and metadata:', chatMetadata);
          }
        } else {
          // Atualizar conversa existente com metadata e estrutura correta
          const { error: updateError } = await supabase
            .from('conversations')
            .update({
              contact_name: contactName,
              contact_number: contactNumber, // Atualizar com remoteJid
              remote_jid: contactNumber, // Garantir que remote_jid está preenchido
              metadata: chatMetadata
            })
            .eq('id', existingConversation.id);

          if (updateError) {
            console.error('Error updating conversation:', updateError);
          } else {
            console.log('Conversation updated for:', contactId, 'with remoteJid:', contactNumber, 'and metadata:', chatMetadata);
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

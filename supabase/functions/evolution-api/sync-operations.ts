import { supabase } from './supabase-client.ts';
import { corsHeaders } from './constants.ts';
import type { AuthHeaders, ChatMetadata, ProcessedMessage } from './types.ts';

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';

export async function syncMessages(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('Syncing messages for instance:', instanceName);

  try {
    // Usar a URL correta conforme a documentação oficial
    const response = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        where: {
          owner: instanceName
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error fetching messages:', errorData);
      throw new Error(`Failed to fetch messages: ${errorData}`);
    }

    const responseData = await response.json();
    console.log('Messages response from Evolution API:', responseData ? 'received' : 'undefined or empty');

    // Verificar se responseData tem mensagens
    let messages = [];
    if (responseData && responseData.messages && Array.isArray(responseData.messages.records)) {
      messages = responseData.messages.records;
    } else if (Array.isArray(responseData)) {
      messages = responseData;
    }

    console.log('Messages to process:', messages.length);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('No messages found or invalid response format');
      return new Response(JSON.stringify({ 
        success: true, 
        messagesSynced: 0,
        message: 'No messages found or invalid response format'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar e salvar mensagens no banco
    let messagesSynced = 0;
    for (const message of messages) {
      const processed = await processAndSaveMessage(message, instanceName, agentId);
      if (processed) messagesSynced++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messagesSynced 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error syncing messages:', error);
    throw error;
  }
}

export async function syncConversationMessages(instanceName: string, agentId: string, remoteJid: string, authHeaders: AuthHeaders) {
  console.log('Syncing conversation messages for instance:', instanceName, 'remoteJid:', remoteJid);

  try {
    // Buscar mensagens específicas para este remoteJid usando o método correto da API
    const response = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        where: {
          key: {
            remoteJid: remoteJid
          }
        },
        limit: 100 // Limitar para evitar sobrecarga
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error fetching conversation messages:', errorData);
      throw new Error(`Failed to fetch conversation messages: ${errorData}`);
    }

    const responseData = await response.json();
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

    // Processar e salvar mensagens no banco
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
    const response = await fetch(`${EVOLUTION_API_URL}/chat/findChats/${instanceName}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        where: {
          owner: instanceName
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error fetching chats:', errorData);
      throw new Error(`Failed to fetch chats: ${errorData}`);
    }

    const chats = await response.json();
    console.log('Chats fetched from Evolution API:', chats.length);

    // Buscar WhatsApp number ID
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

    // Processar e salvar conversas com metadata completo
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

        // Verificar se a conversa já existe (buscar por contact_id)
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('whatsapp_number_id', whatsappData.id)
          .eq('contact_id', contactId)
          .maybeSingle();

        if (!existingConversation) {
          // Criar nova conversa com a estrutura correta
          const { error: conversationError } = await supabase
            .from('conversations')
            .insert({
              whatsapp_number_id: whatsappData.id,
              contact_id: contactId, // ID do chat
              contact_number: contactNumber, // remoteJid completo
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

export async function syncContacts(instanceName: string, agentId: string, authHeaders: AuthHeaders) {
  console.log('Syncing contacts for instance:', instanceName);

  try {
    // Usar a URL correta conforme a documentação oficial
    const response = await fetch(`${EVOLUTION_API_URL}/chat/findContacts/${instanceName}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        where: {
          owner: instanceName
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error fetching contacts:', errorData);
      throw new Error(`Failed to fetch contacts: ${errorData}`);
    }

    const contacts = await response.json();
    console.log('Contacts fetched from Evolution API:', contacts.length);

    // Buscar WhatsApp number ID
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

async function processAndSaveMessage(message: any, instanceName: string, agentId: string): Promise<boolean> {
  try {
    console.log('Processing Evolution API message:', {
      id: message.id,
      keyId: message.key?.id,
      remoteJid: message.key?.remoteJid,
      fromMe: message.key?.fromMe,
      messageType: message.messageType,
      timestamp: message.messageTimestamp
    });
    
    // Verificar se a mensagem tem dados válidos
    if (!message || !message.key || !message.messageTimestamp || !message.id) {
      console.log('Skipping invalid message - missing required fields');
      return false;
    }

    // Buscar WhatsApp number ID
    const { data: whatsappData, error: whatsappError } = await supabase
      .from('whatsapp_numbers')
      .select('id')
      .eq('phone_number', instanceName)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (whatsappError || !whatsappData) {
      console.error('WhatsApp number not found for processAndSaveMessage:', whatsappError);
      return false;
    }

    // Extrair informações da mensagem
    const isFromContact = !message.key?.fromMe;
    const remoteJid = message.key?.remoteJid;
    const contactId = remoteJid?.replace('@s.whatsapp.net', '');
    
    // Pular grupos
    if (!remoteJid || remoteJid.includes('@g.us')) {
      console.log('Skipping group message or invalid remoteJid');
      return false;
    }

    // Extrair conteúdo da mensagem baseado no tipo
    let messageContent = '';
    switch (message.messageType) {
      case 'conversation':
        messageContent = message.message?.conversation || '';
        break;
      case 'extendedTextMessage':
        messageContent = message.message?.extendedTextMessage?.text || '';
        break;
      case 'imageMessage':
        messageContent = `[Imagem] ${message.message?.imageMessage?.caption || ''}`;
        break;
      case 'videoMessage':
        messageContent = `[Vídeo] ${message.message?.videoMessage?.caption || ''}`;
        break;
      case 'audioMessage':
        messageContent = '[Áudio]';
        break;
      case 'documentMessage':
        messageContent = `[Documento] ${message.message?.documentMessage?.fileName || ''}`;
        break;
      case 'locationMessage':
        messageContent = '[Localização]';
        break;
      default:
        messageContent = `[${message.messageType || 'Mensagem não suportada'}]`;
    }

    console.log('Message details:', { 
      evolutionId: message.id,
      contactId, 
      remoteJid, 
      messageContent: messageContent.substring(0, 50), 
      isFromContact,
      timestamp: message.messageTimestamp,
      messageType: message.messageType
    });

    // Buscar ou criar conversa usando remote_jid
    let { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('whatsapp_number_id', whatsappData.id)
      .eq('remote_jid', remoteJid)
      .maybeSingle();

    if (conversationError) {
      console.error('Error finding conversation:', conversationError);
      return false;
    }

    if (!conversation) {
      console.log('Creating new conversation for remoteJid:', remoteJid);
      // Criar nova conversa
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          whatsapp_number_id: whatsappData.id,
          contact_id: contactId,
          contact_number: remoteJid,
          remote_jid: remoteJid,
          contact_name: message.pushName || null,
          last_message_at: new Date(message.messageTimestamp * 1000).toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return false;
      }

      conversation = newConversation;
      console.log('New conversation created with ID:', conversation.id);
    }

    // Verificar se a mensagem já existe usando evolution_id
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('evolution_id', message.id)
      .eq('conversation_id', conversation.id)
      .maybeSingle();

    if (!existingMessage) {
      console.log('Saving new message with evolution_id:', message.id);

      // Preparar dados da mensagem com estrutura completa da Evolution API
      const messageTimestamp = new Date(message.messageTimestamp * 1000).toISOString();
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: messageContent,
          is_from_contact: isFromContact,
          message_type: message.messageType || 'text',
          created_at: messageTimestamp,
          // Novos campos da Evolution API
          evolution_id: message.id,
          evolution_key: message.key,
          push_name: message.pushName,
          message_timestamp: message.messageTimestamp,
          instance_id: message.instanceId,
          source: message.source,
          context_info: message.contextInfo,
          message_updates: message.MessageUpdate || [],
          metadata: {
            delivery_status: 'sent',
            evolutionData: {
              messageType: message.messageType,
              remoteJid: message.key?.remoteJid,
              fromMe: message.key?.fromMe,
              participant: message.key?.participant
            }
          }
        });

      if (messageError) {
        console.error('Error saving message:', messageError);
        return false;
      }

      // Atualizar última mensagem da conversa
      await supabase
        .from('conversations')
        .update({ 
          last_message_at: messageTimestamp,
          contact_name: message.pushName || null
        })
        .eq('id', conversation.id);

      console.log('Message saved successfully with evolution_id:', message.id);
      return true;
    } else {
      console.log('Message already exists, skipping evolution_id:', message.id);
    }

    return false;

  } catch (error) {
    console.error('Error processing message:', error);
    return false;
  }
}

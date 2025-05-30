
import { supabase } from './supabase-client.ts';
import { getWhatsAppNumberData, extractMessageContent } from './utils.ts';

export async function processAndSaveMessage(message: any, instanceName: string, agentId: string): Promise<boolean> {
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
    const whatsappData = await getWhatsAppNumberData(instanceName, agentId);

    // Extrair informações da mensagem
    const isFromContact = !message.key?.fromMe;
    const remoteJid = message.key?.remoteJid;
    const contactId = remoteJid?.replace('@s.whatsapp.net', '');
    
    // Pular grupos
    if (!remoteJid || remoteJid.includes('@g.us')) {
      console.log('Skipping group message or invalid remoteJid');
      return false;
    }

    // Extrair conteúdo da mensagem
    const messageContent = extractMessageContent(message);

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

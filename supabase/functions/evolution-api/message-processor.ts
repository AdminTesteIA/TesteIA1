import { supabase } from './supabase-client.ts';
import { getWhatsAppNumberData, extractMessageContent } from './utils.ts';
import type { EvolutionMessage, ProcessedMessage } from './types.ts';

export async function processAndSaveMessage(message: EvolutionMessage, instanceName: string, agentId: string): Promise<boolean> {
  try {
    console.log('Processing Evolution API message:', {
      id: message.id,
      keyId: message.key?.id,
      remoteJid: message.key?.remoteJid,
      fromMe: message.key?.fromMe,
      messageType: message.messageType,
      timestamp: message.messageTimestamp
    });

    // Verificar se a mensagem já foi processada usando evolution_id
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('evolution_id', message.id)
      .maybeSingle();

    if (existingMessage) {
      console.log('Message already exists, skipping evolution_id:', message.id);
      return false;
    }

    // Buscar WhatsApp number data
    const whatsappData = await getWhatsAppNumberData(instanceName, agentId);
    
    // Extrair informações de contato
    const remoteJid = message.key?.remoteJid;
    const contactNumber = remoteJid ? remoteJid.replace('@s.whatsapp.net', '') : '';
    
    if (!remoteJid || !contactNumber) {
      console.log('No valid contact information found for message:', message.id);
      return false;
    }

    // Buscar ou criar conversa usando a tabela chat
    let conversation;
    const { data: existingConversation } = await supabase
      .from('chat')
      .select('*')
      .eq('whatsapp_number_id', whatsappData.id)
      .eq('contact_number', contactNumber)
      .maybeSingle();

    if (existingConversation) {
      conversation = existingConversation;
    } else {
      // Criar nova conversa na tabela chat
      const { data: newConversation, error: conversationError } = await supabase
        .from('chat')
        .insert({
          id: remoteJid, // Usar remoteJid como ID
          whatsapp_number_id: whatsappData.id,
          contact_number: contactNumber,
          push_name: message.pushName || null,
          remote_jid: remoteJid,
          last_message_at: new Date(message.messageTimestamp * 1000).toISOString(),
          metadata: {
            remoteJid: remoteJid,
            pushName: message.pushName
          }
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Error creating conversation:', conversationError);
        return false;
      }

      conversation = newConversation;
      console.log('Created new conversation for:', contactNumber);
    }

    // Extrair conteúdo da mensagem
    const messageContent = extractMessageContent(message);

    // Preparar metadados da mensagem
    const messageMetadata: ProcessedMessage = {
      messageId: message.key?.id,
      delivery_status: 'delivered',
      evolutionData: {
        messageType: message.messageType,
        remoteJid: message.key?.remoteJid,
        fromMe: message.key?.fromMe,
        participant: message.key?.participant
      }
    };

    // Inserir mensagem
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: messageContent,
        is_from_contact: !message.key?.fromMe,
        message_type: message.messageType || 'text',
        evolution_id: message.id,
        evolution_key: message.key,
        message_timestamp: message.messageTimestamp,
        push_name: message.pushName,
        instance_id: message.instanceId,
        source: message.source,
        context_info: message.contextInfo,
        message_updates: message.MessageUpdate,
        metadata: messageMetadata
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
      return false;
    }

    // Atualizar timestamp da conversa
    await supabase
      .from('chat')
      .update({ 
        last_message_at: new Date(message.messageTimestamp * 1000).toISOString()
      })
      .eq('id', conversation.id);

    console.log('Message processed successfully:', message.id);
    return true;

  } catch (error) {
    console.error('Error processing message:', error);
    return false;
  }
}

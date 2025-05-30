
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
    
    // Pular grupos
    if (!remoteJid || remoteJid.includes('@g.us')) {
      console.log('Skipping group message or invalid remoteJid');
      return false;
    }

    // CORREÇÃO: Separar corretamente os campos
    // contact_number: número limpo (ex: 5511960613827)
    // contact_id: ID específico do Evolution (ex: cmba0isem04n0td4q0c94bmfx)  
    // remote_jid: JID completo (ex: 5511960613827@s.whatsapp.net)
    const contactNumber = remoteJid.replace('@s.whatsapp.net', ''); // Número limpo
    const contactId = message.id || remoteJid; // ID do Evolution ou JID como fallback
    const contactRemoteJid = remoteJid; // JID completo

    // VERIFICAÇÃO: Se mensagem já existe usando evolution_id
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('evolution_id', message.id)
      .maybeSingle();

    if (existingMessage) {
      console.log('Message already exists, skipping evolution_id:', message.id);
      return false;
    }

    // Extrair conteúdo da mensagem
    const messageContent = extractMessageContent(message);

    console.log('Message details:', { 
      evolutionId: message.id,
      contactNumber, 
      contactId,
      remoteJid: contactRemoteJid, 
      messageContent: messageContent.substring(0, 50), 
      isFromContact,
      timestamp: message.messageTimestamp,
      messageType: message.messageType
    });

    // BUSCAR CONVERSA EXISTENTE usando contact_number (número limpo)
    let { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('whatsapp_number_id', whatsappData.id)
      .eq('contact_number', contactNumber)
      .maybeSingle();

    if (conversationError) {
      console.error('Error finding conversation:', conversationError);
      return false;
    }

    // SE NÃO EXISTE CONVERSA, criar nova (COM VERIFICAÇÃO DUPLA)
    if (!conversation) {
      console.log('Creating new conversation for contactNumber:', contactNumber);
      
      // VERIFICAÇÃO DUPLA antes de criar
      const { data: doubleCheck } = await supabase
        .from('conversations')
        .select('id')
        .eq('whatsapp_number_id', whatsappData.id)
        .eq('contact_number', contactNumber)
        .maybeSingle();

      if (doubleCheck) {
        conversation = doubleCheck;
        console.log('Conversation found in double check:', conversation.id);
      } else {
        // Criar nova conversa APENAS se não existir
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            whatsapp_number_id: whatsappData.id,
            contact_number: contactNumber, // Número limpo
            contact_id: contactId, // ID do Evolution
            remote_jid: contactRemoteJid, // JID completo
            contact_name: message.pushName || null,
            last_message_at: new Date(message.messageTimestamp * 1000).toISOString()
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          // Se erro de duplicação, tentar buscar novamente
          if (createError.code === '23505') {
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('whatsapp_number_id', whatsappData.id)
              .eq('contact_number', contactNumber)
              .single();
            
            if (existingConv) {
              conversation = existingConv;
              console.log('Using existing conversation after conflict:', conversation.id);
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else {
          conversation = newConversation;
          console.log('New conversation created with ID:', conversation.id);
        }
      }
    }

    console.log('Saving new message with evolution_id:', message.id);

    // Preparar dados da mensagem
    const messageTimestamp = new Date(message.messageTimestamp * 1000).toISOString();
    
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: messageContent,
        is_from_contact: isFromContact,
        message_type: message.messageType || 'text',
        created_at: messageTimestamp,
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

  } catch (error) {
    console.error('Error processing message:', error);
    return false;
  }
}

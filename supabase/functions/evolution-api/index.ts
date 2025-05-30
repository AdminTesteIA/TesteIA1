import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceName, agentId, message, to, number } = await req.json();
    console.log('Evolution API action:', action, { instanceName, agentId, to, number });

    const authHeaders = {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'createInstance':
        return await createInstance(instanceName, agentId, number, authHeaders);
      
      case 'configureWebhook':
        return await configureWebhook(instanceName, authHeaders);
      
      case 'sendMessage':
        return await sendMessage(instanceName, message, to, authHeaders);
      
      case 'getQRCode':
        return await getQRCode(instanceName, authHeaders);
      
      case 'getInstanceStatus':
        return await getInstanceStatus(instanceName, authHeaders);
      
      case 'logoutInstance':
        return await logoutInstance(instanceName, authHeaders);
      
      case 'syncMessages':
        return await syncMessages(instanceName, agentId, authHeaders);

      case 'syncChats':
        return await syncChats(instanceName, agentId, authHeaders);

      case 'syncContacts':
        return await syncContacts(instanceName, agentId, authHeaders);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in evolution-api function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createInstance(instanceName: string, agentId: string, number: string, authHeaders: any) {
  console.log('Creating Evolution API instance:', instanceName, 'for agent:', agentId, 'with number:', number);

  try {
    // Buscar dados do agente
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    console.log('Agent query result:', { agent, agentError });

    if (agentError) {
      console.error('Agent query error:', agentError);
      throw new Error(`Database error: ${agentError.message}`);
    }

    if (!agent) {
      console.error('Agent not found with ID:', agentId);
      throw new Error(`Agent not found with ID: ${agentId}`);
    }

    console.log('Agent found:', agent.name);

    // Criar identificador único concatenando nome da instância com número
    const uniqueInstanceName = `${instanceName}-${number}`;
    console.log('Unique instance name:', uniqueInstanceName);

    // Configurar webhook URL
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;

    // Criar instância na Evolution API usando a configuração correta
    const instanceData = {
      instanceName: uniqueInstanceName,
      token: agentId, // Usar agentId como token
      qrcode: true,
      number: number,
      integration: "WHATSAPP-BAILEYS",
      rejectCall: true,
      msgCall: "Não atendemos ligações.",
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      readStatus: true,
      syncFullHistory: true,
      webhook: {
        url: webhookUrl,
        byEvents: true,
        base64: true,
        events: [
          "APPLICATION_STARTUP",
          "QRCODE_UPDATED",
          "MESSAGES_SET",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "SEND_MESSAGE",
          "CONTACTS_SET",
          "CONTACTS_UPSERT",
          "CONTACTS_UPDATE",
          "PRESENCE_UPDATE",
          "CHATS_SET",
          "CHATS_UPSERT",
          "CHATS_UPDATE",
          "CHATS_DELETE",
          "GROUPS_UPSERT",
          "GROUP_UPDATE",
          "GROUP_PARTICIPANTS_UPDATE",
          "CONNECTION_UPDATE",
          "CALL",
          "NEW_JWT_TOKEN"
        ]
      }
    };

    console.log('Creating Evolution API instance with data:', instanceData);

    const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(instanceData)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('Error creating instance in Evolution API:', errorData);
      throw new Error(`Failed to create instance: ${errorData}`);
    }

    const instanceResult = await createResponse.json();
    console.log('Instance created successfully in Evolution API:', instanceResult);

    // Salvar número WhatsApp na base de dados - usando o nome único da instância
    const { error: whatsappError } = await supabase
      .from('whatsapp_numbers')
      .upsert({
        agent_id: agentId,
        phone_number: uniqueInstanceName, // Usar o nome único da instância
        is_connected: false, // SEMPRE false inicialmente
        session_data: instanceResult
      });

    if (whatsappError) {
      console.error('Error saving WhatsApp number:', whatsappError);
      throw new Error(`Failed to save WhatsApp number: ${whatsappError.message}`);
    } else {
      console.log('WhatsApp number saved successfully as disconnected');
    }

    return new Response(JSON.stringify({
      success: true,
      instanceResult,
      message: 'Instance created successfully. WhatsApp integration ready. Status: Disconnected (scan QR to connect).'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in createInstance:', error);
    throw error;
  }
}

async function configureWebhook(instanceName: string, authHeaders: any) {
  console.log('Configuring webhook for instance:', instanceName);

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;
  
  const webhookConfig = {
    url: webhookUrl,
    byEvents: true,
    base64: true,
    events: [
     "APPLICATION_STARTUP",
          "QRCODE_UPDATED",
          "MESSAGES_SET",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "SEND_MESSAGE",
          "CONTACTS_SET",
          "CONTACTS_UPSERT",
          "CONTACTS_UPDATE",
          "PRESENCE_UPDATE",
          "CHATS_SET",
          "CHATS_UPSERT",
          "CHATS_UPDATE",
          "CHATS_DELETE",
          "GROUPS_UPSERT",
          "GROUP_UPDATE",
          "GROUP_PARTICIPANTS_UPDATE",
          "CONNECTION_UPDATE",
          "CALL",
          "NEW_JWT_TOKEN"
    ]
  };

  console.log('Setting webhook with config:', webhookConfig);

  const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(webhookConfig)
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error setting webhook:', errorData);
    throw new Error(`Failed to set webhook: ${errorData}`);
  }

  const result = await response.json();
  console.log('Webhook configured successfully:', result);

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendMessage(instanceName: string, message: string, to: string, authHeaders: any) {
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

async function getQRCode(instanceName: string, authHeaders: any) {
  console.log('Getting QR Code for instance:', instanceName);

  const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
    method: 'GET',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error getting QR code:', errorData);
    throw new Error(`Failed to get QR code: ${errorData}`);
  }

  const result = await response.json();
  console.log('QR Code response from Evolution API:', result);
  
  // Atualizar QR code na base de dados se disponível
  if (result.code) {
    // Buscar o número WhatsApp relacionado a esta instância pelo instanceName
    const { data: whatsappData, error: findError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('phone_number', instanceName) // Buscar pelo nome único da instância
      .maybeSingle();

    if (findError) {
      console.error('Error finding WhatsApp number:', findError);
    } else if (whatsappData) {
      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update({ qr_code: result.base64 || result.code })
        .eq('id', whatsappData.id);

      if (updateError) {
        console.error('Error updating QR code in database:', updateError);
      } else {
        console.log('QR code updated in database successfully');
      }
    } else {
      console.log('WhatsApp number not found for instance:', instanceName);
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getInstanceStatus(instanceName: string, authHeaders: any) {
  console.log('Getting instance status:', instanceName);

  const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
    method: 'GET',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error getting instance status:', errorData);
    throw new Error(`Failed to get instance status: ${errorData}`);
  }

  const result = await response.json();
  console.log('Instance status response from Evolution API:', result);
  
  // Atualizar status de conexão no banco de dados
  if (result[0]) {
    // Verificar tanto connectionStatus quanto instance.state
    const connectionStatus = result[0].connectionStatus || result[0].instance?.state;
    const isConnected = connectionStatus === 'open';
    
    console.log('Updating connection status in database:', { instanceName, isConnected, connectionStatus });
    
    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({ 
        is_connected: isConnected,
        // Limpar QR code se conectado
        qr_code: isConnected ? null : undefined
      })
      .eq('phone_number', instanceName);

    if (updateError) {
      console.error('Error updating connection status in database:', updateError);
    } else {
      console.log('Connection status updated successfully in database');
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function logoutInstance(instanceName: string, authHeaders: any) {
  console.log('Logging out instance:', instanceName);

  const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: authHeaders
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Error logging out instance:', errorData);
    throw new Error(`Failed to logout instance: ${errorData}`);
  }

  const result = await response.json();
  console.log('Instance logged out successfully:', result);
  
  // Atualizar status no banco de dados para desconectado
  const { error: updateError } = await supabase
    .from('whatsapp_numbers')
    .update({ 
      is_connected: false,
      qr_code: null // Limpar QR code quando desconectar
    })
    .eq('phone_number', instanceName);

  if (updateError) {
    console.error('Error updating disconnection status in database:', updateError);
  } else {
    console.log('Instance marked as disconnected in database');
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function syncMessages(instanceName: string, agentId: string, authHeaders: any) {
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

    const messages = await response.json();
    console.log('Messages fetched from Evolution API:', messages ? messages.length : 'undefined or empty');

    // Verificar se messages é um array válido
    if (!messages || !Array.isArray(messages)) {
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

async function syncChats(instanceName: string, agentId: string, authHeaders: any) {
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

    // Processar e salvar conversas
    let conversationsSynced = 0;
    for (const chat of chats) {
      if (chat.id && !chat.id.includes('@g.us')) { // Apenas chats individuais, não grupos
        const contactNumber = chat.id.replace('@s.whatsapp.net', '');
        const contactName = chat.name || chat.pushName || null;

        // Verificar se a conversa já existe
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('whatsapp_number_id', whatsappData.id)
          .eq('contact_number', contactNumber)
          .maybeSingle();

        if (!existingConversation) {
          // Criar nova conversa
          const { error: conversationError } = await supabase
            .from('conversations')
            .insert({
              whatsapp_number_id: whatsappData.id,
              contact_number: contactNumber,
              contact_name: contactName,
              last_message_at: chat.lastMessage?.messageTimestamp 
                ? new Date(chat.lastMessage.messageTimestamp * 1000).toISOString()
                : new Date().toISOString()
            });

          if (conversationError) {
            console.error('Error creating conversation:', conversationError);
          } else {
            conversationsSynced++;
            console.log('Conversation created for:', contactNumber);
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

async function syncContacts(instanceName: string, agentId: string, authHeaders: any) {
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
        const contactNumber = contact.id.replace('@s.whatsapp.net', '');
        const contactName = contact.name || contact.pushName || contact.verifiedName;

        if (contactName) {
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ contact_name: contactName })
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

async function processAndSaveMessage(message: any, instanceName: string, agentId: string) {
  try {
    // Verificar se a mensagem tem dados válidos
    if (!message || !message.key || !message.messageTimestamp) {
      console.log('Skipping invalid message:', message);
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
      console.error('WhatsApp number not found:', whatsappError);
      return false;
    }

    // Extrair informações da mensagem
    const isFromContact = !message.key?.fromMe;
    const contactNumber = message.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const messageContent = message.message?.conversation || 
                          message.message?.extendedTextMessage?.text || 
                          '[Media]';

    if (!contactNumber || contactNumber.includes('@g.us')) {
      return false; // Pular grupos e mensagens inválidas
    }

    // Buscar ou criar conversa
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

    if (!conversation) {
      // Criar nova conversa
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          whatsapp_number_id: whatsappData.id,
          contact_number: contactNumber,
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
    }

    // Verificar se a mensagem já existe
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversation.id)
      .eq('created_at', new Date(message.messageTimestamp * 1000).toISOString())
      .eq('content', messageContent)
      .maybeSingle();

    if (!existingMessage) {
      // Salvar mensagem
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: messageContent,
          is_from_contact: isFromContact,
          message_type: 'text',
          created_at: new Date(message.messageTimestamp * 1000).toISOString(),
          metadata: { 
            messageId: message.key?.id,
            delivery_status: 'sent'
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
          last_message_at: new Date(message.messageTimestamp * 1000).toISOString() 
        })
        .eq('id', conversation.id);

      return true;
    }

    return false;

  } catch (error) {
    console.error('Error processing message:', error);
    return false;
  }
}

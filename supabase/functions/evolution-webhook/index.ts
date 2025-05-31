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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Evolution Webhook received:', JSON.stringify(payload, null, 2));

    // Processar mensagens da Evolution API v2
    if (payload.event === 'messages.upsert' && payload.data) {
      for (const message of payload.data) {
        await processMessage(message, payload.instance);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processMessage(message: any, instanceName: string) {
  try {
    console.log('Processing message:', {
      messageId: message.key?.id,
      remoteJid: message.key?.remoteJid,
      fromMe: message.key?.fromMe,
      instance: instanceName
    });

    // Extrair dados da mensagem
    const remoteJid = message.key?.remoteJid;
    const contactNumber = remoteJid ? remoteJid.replace('@s.whatsapp.net', '') : '';
    const messageContent = message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      'Mensagem não suportada';
    const isFromContact = !message.key?.fromMe;
    const pushName = message.pushName || null;

    if (!remoteJid || !contactNumber) {
      console.log('Invalid message data, skipping');
      return;
    }

    // ===== ALTERAÇÃO PRINCIPAL: Usar instance_name em vez de phone_number =====
    const { data: whatsappNumber, error: whatsappError } = await supabase
      .from('whatsapp_numbers')
      .select('id, agent_id, chatwoot_account_id') // ✅ Adicionar chatwoot_account_id
      .eq('instance_name', instanceName) // ✅ MUDANÇA: usar instance_name
      .single();

    if (whatsappError || !whatsappNumber) {
      console.error('WhatsApp number not found:', instanceName, whatsappError);
      return;
    }

    console.log('WhatsApp number found:', whatsappNumber);

    // Buscar ou criar conversa
    let conversation;
    const { data: existingChat } = await supabase
      .from('chat')
      .select('*')
      .eq('whatsapp_number_id', whatsappNumber.id)
      .eq('contact_number', contactNumber)
      .maybeSingle();

    if (existingChat) {
      conversation = existingChat;
      console.log('Using existing conversation:', conversation.id);
    } else {
      // Criar nova conversa
      const { data: newChat, error: chatError } = await supabase
        .from('chat')
        .insert({
          whatsapp_number_id: whatsappNumber.id,
          contact_number: contactNumber,
          remote_jid: remoteJid,
          push_name: pushName,
          last_message_at: new Date().toISOString(),
          metadata: {
            remoteJid: remoteJid,
            pushName: pushName,
            chatwootAccountId: whatsappNumber.chatwoot_account_id // ✅ NOVO: Salvar account ID
          }
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat:', chatError);
        return;
      }

      conversation = newChat;
      console.log('Created new conversation:', conversation.id);
    }

    // Verificar se mensagem já existe
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', conversation.id)
      .eq('evolution_id', message.key?.id)
      .maybeSingle();

    if (existingMessage) {
      console.log('Message already exists, skipping');
      return;
    }

    // Inserir nova mensagem
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: conversation.id,
        content: messageContent,
        is_from_contact: isFromContact,
        message_type: 'text',
        evolution_id: message.key?.id,
        remoteJid: remoteJid,
        instanceId: instanceName,
        metadata: {
          delivery_status: 'delivered',
          evolution_data: message,
          chatwootAccountId: whatsappNumber.chatwoot_account_id // ✅ NOVO: Salvar account ID
        }
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
      return;
    }

    console.log('Message saved successfully');

    // Atualizar timestamp da conversa
    await supabase
      .from('chat')
      .update({
        last_message_at: new Date().toISOString(),
        push_name: pushName || conversation.push_name
      })
      .eq('id', conversation.id);

    console.log('Message processed successfully');

  } catch (error) {
    console.error('Error processing message:', error);
  }
}

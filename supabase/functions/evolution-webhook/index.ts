
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Webhook payload received:', JSON.stringify(payload, null, 2));

    // Verificar se é uma mensagem do WhatsApp
    if (payload.event === 'messages.upsert' && payload.data?.messages) {
      const message = payload.data.messages[0];
      const instanceName = payload.instance;

      console.log('Processing WhatsApp message:', message);

      // Buscar o número WhatsApp correspondente na base de dados
      const { data: whatsappNumber, error: whatsappError } = await supabase
        .from('whatsapp_numbers')
        .select('id, agent_id, agent:agents(*)')
        .eq('phone_number', instanceName)
        .single();

      if (whatsappError || !whatsappNumber) {
        console.error('WhatsApp number not found:', whatsappError);
        return new Response(JSON.stringify({ error: 'WhatsApp number not registered' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extrair informações da mensagem
      const contactNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
      const messageContent = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || 
                           'Mensagem não suportada';
      const isFromContact = !message.key.fromMe;

      // Buscar ou criar conversa
      let conversation;
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('whatsapp_number_id', whatsappNumber.id)
        .eq('contact_number', contactNumber)
        .single();

      if (existingConversation) {
        conversation = existingConversation;
        
        // Atualizar timestamp da última mensagem
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);
      } else {
        // Criar nova conversa
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            whatsapp_number_id: whatsappNumber.id,
            contact_number: contactNumber,
            contact_name: message.pushName || null,
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();

        if (conversationError) {
          console.error('Error creating conversation:', conversationError);
          throw conversationError;
        }

        conversation = newConversation;
      }

      // Inserir mensagem na base de dados
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: messageContent,
          is_from_contact: isFromContact,
          message_type: 'text',
          metadata: {
            whatsapp_message_id: message.key.id,
            timestamp: message.messageTimestamp,
            delivery_status: 'delivered'
          }
        });

      if (messageError) {
        console.error('Error saving message:', messageError);
        throw messageError;
      }

      console.log('Message processed successfully');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Para outros tipos de eventos
    console.log('Event not processed:', payload.event);
    return new Response(JSON.stringify({ message: 'Event received but not processed' }), {
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

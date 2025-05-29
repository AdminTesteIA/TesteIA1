
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
    console.log('Evolution Channel webhook payload received:', JSON.stringify(payload, null, 2));

    // Processar mensagens do Evolution Channel seguindo a documentação oficial
    if (payload.numberId && payload.key && payload.message) {
      const numberId = payload.numberId;
      const contactNumber = payload.key.remoteJid;
      const messageContent = payload.message.conversation || 'Mensagem não suportada';
      const isFromContact = !payload.key.fromMe;
      const contactName = payload.pushName || null;

      console.log('Processing Evolution Channel message:', {
        numberId,
        contactNumber,
        messageContent,
        isFromContact,
        contactName
      });

      // Buscar o número WhatsApp correspondente na base de dados
      const { data: whatsappNumber, error: whatsappError } = await supabase
        .from('whatsapp_numbers')
        .select('id, agent_id, agents(*)')
        .eq('phone_number', numberId)
        .maybeSingle();

      if (whatsappError || !whatsappNumber) {
        console.error('WhatsApp number not found for numberId:', numberId, whatsappError);
        return new Response(JSON.stringify({ error: 'WhatsApp number not registered' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Buscar ou criar conversa
      let conversation;
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('whatsapp_number_id', whatsappNumber.id)
        .eq('contact_number', contactNumber)
        .maybeSingle();

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
            contact_name: contactName,
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
            whatsapp_message_id: payload.key.id,
            numberId: payload.numberId,
            delivery_status: 'delivered'
          }
        });

      if (messageError) {
        console.error('Error saving Evolution Channel message:', messageError);
        throw messageError;
      }

      console.log('Evolution Channel message processed successfully');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Para outros tipos de eventos do Evolution Channel
    console.log('Evolution Channel event received but not processed:', payload);
    return new Response(JSON.stringify({ message: 'Event received from Evolution Channel' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing Evolution Channel webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

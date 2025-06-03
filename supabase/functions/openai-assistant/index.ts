
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

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, agentId, userEmail } = await req.json();
    console.log('OpenAI Assistant API action:', action, { agentId, userEmail });

    switch (action) {
      case 'createAssistant':
        return await createAssistant(agentId, userEmail);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in openai-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createAssistant(agentId: string, userEmail: string) {
  console.log('🟡 [OPENAI] === CREATING ASSISTANT ===');
  console.log('🟡 [OPENAI] Agent ID:', agentId);
  console.log('🟡 [OPENAI] User Email:', userEmail);

  try {
    // 1) Buscar dados do agente no Supabase
    console.log('🟡 [OPENAI] Fetching agent data from database...');
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    if (agentError) {
      console.error('🔴 [OPENAI] Agent query error:', agentError);
      throw new Error(`Database error: ${agentError.message}`);
    }
    if (!agent) {
      console.error('🔴 [OPENAI] Agent not found with ID:', agentId);
      throw new Error(`Agent not found with ID: ${agentId}`);
    }
    console.log('🟢 [OPENAI] Agent found:', agent.name);

    // 2) Preparar dados para o Assistant
    const assistantName = `${agent.name.replace(/\s+/g, '_')}_${userEmail}`;
    const instructions = agent.base_prompt + (agent.knowledge_base ? `\n\nBase de conhecimento: ${agent.knowledge_base}` : '');

    const assistantPayload = {
      name: assistantName,
      instructions: instructions,
      model: "gpt-4o-mini",
      tools: [
        { type: "file_search" }
      ],
      metadata: {
        user_id: agent.user_id,
        user_email: userEmail,
        agent_id: agentId
      }
    };

    console.log('🟡 [OPENAI] === CREATING OPENAI ASSISTANT ===');
    console.log('🟡 [OPENAI] Assistant Payload:', JSON.stringify(assistantPayload, null, 2));

    // 3) Criar Assistant na OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify(assistantPayload)
    });

    console.log('🟡 [OPENAI] OpenAI Response Status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('🔴 [OPENAI] ASSISTANT CREATION FAILED');
      console.error('🔴 [OPENAI] Status:', openaiResponse.status);
      console.error('🔴 [OPENAI] Error Body:', errorData);
      throw new Error(`Failed to create assistant: ${openaiResponse.status} - ${errorData}`);
    }

    const assistantResult = await openaiResponse.json();
    console.log('🟢 [OPENAI] Assistant Created Successfully:', JSON.stringify(assistantResult, null, 2));

    // 4) Atualizar o agent no Supabase com o assistant_id
    console.log('🟡 [OPENAI] Updating agent with assistant_id...');
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        assistant_id: assistantResult.id
      })
      .eq('id', agentId);

    if (updateError) {
      console.error('🔴 [OPENAI] Error updating agent with assistant_id:', updateError);
      throw new Error(`Failed to update agent: ${updateError.message}`);
    } else {
      console.log('🟢 [OPENAI] Agent updated with assistant_id successfully');
    }

    console.log('🟢 [OPENAI] === ASSISTANT CREATION COMPLETED SUCCESSFULLY ===');

    return new Response(JSON.stringify({
      success: true,
      assistant: assistantResult,
      message: 'Assistant criado com sucesso!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔴 [OPENAI] CRITICAL ERROR in createAssistant:', error);
    throw error;
  }
}

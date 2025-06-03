
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
    console.log('🟡 [EDGE] === EDGE FUNCTION INICIADA ===');
    console.log('🟡 [EDGE] Request method:', req.method);
    console.log('🟡 [EDGE] Request headers:', Object.fromEntries(req.headers.entries()));

    const requestBody = await req.json();
    console.log('🟡 [EDGE] Request body:', JSON.stringify(requestBody, null, 2));

    const { action, agentId, userEmail } = requestBody;
    console.log('🟡 [EDGE] Parsed params:', { action, agentId, userEmail });

    // Verificar se temos todos os parâmetros necessários
    if (!action) {
      console.error('🔴 [EDGE] Action não fornecida');
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!agentId) {
      console.error('🔴 [EDGE] Agent ID não fornecido');
      return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userEmail) {
      console.error('🔴 [EDGE] User email não fornecido');
      return new Response(JSON.stringify({ error: 'User email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se temos a API key da OpenAI
    if (!OPENAI_API_KEY) {
      console.error('🔴 [EDGE] OpenAI API Key não configurada');
      return new Response(JSON.stringify({ error: 'OpenAI API Key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🟢 [EDGE] Todos os parâmetros validados');

    switch (action) {
      case 'createAssistant':
        return await createAssistant(agentId, userEmail);
      
      default:
        console.error('🔴 [EDGE] Action inválida:', action);
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('🔴 [EDGE] ERRO CRÍTICO na edge function:', error);
    console.error('🔴 [EDGE] Stack trace:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createAssistant(agentId: string, userEmail: string) {
  console.log('🟡 [ASSISTANT] === CRIANDO ASSISTANT ===');
  console.log('🟡 [ASSISTANT] Agent ID:', agentId);
  console.log('🟡 [ASSISTANT] User Email:', userEmail);

  try {
    // 1) Buscar dados do agente no Supabase
    console.log('🟡 [ASSISTANT] Buscando dados do agente...');
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    console.log('🟡 [ASSISTANT] Query result:', { agent, agentError });

    if (agentError) {
      console.error('🔴 [ASSISTANT] Erro na query do agente:', agentError);
      throw new Error(`Database error: ${agentError.message}`);
    }
    
    if (!agent) {
      console.error('🔴 [ASSISTANT] Agente não encontrado:', agentId);
      throw new Error(`Agent not found with ID: ${agentId}`);
    }
    
    console.log('🟢 [ASSISTANT] Agente encontrado:', {
      id: agent.id,
      name: agent.name,
      base_prompt: agent.base_prompt?.substring(0, 50) + '...',
      knowledge_base: agent.knowledge_base?.substring(0, 50) + '...',
      assistant_id: agent.assistant_id
    });

    // Verificar se já tem assistant_id
    if (agent.assistant_id) {
      console.log('🟡 [ASSISTANT] Agente já tem assistant_id:', agent.assistant_id);
      return new Response(JSON.stringify({
        success: true,
        assistant: { id: agent.assistant_id },
        message: 'Assistant já existe para este agente!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    console.log('🟡 [ASSISTANT] === CHAMANDO OPENAI API ===');
    console.log('🟡 [ASSISTANT] Payload:', JSON.stringify(assistantPayload, null, 2));

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

    console.log('🟡 [ASSISTANT] OpenAI Response Status:', openaiResponse.status);
    console.log('🟡 [ASSISTANT] OpenAI Response Headers:', Object.fromEntries(openaiResponse.headers.entries()));

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('🔴 [ASSISTANT] FALHA NA CRIAÇÃO DO ASSISTANT');
      console.error('🔴 [ASSISTANT] Status:', openaiResponse.status);
      console.error('🔴 [ASSISTANT] Error Body:', errorData);
      throw new Error(`Failed to create assistant: ${openaiResponse.status} - ${errorData}`);
    }

    const assistantResult = await openaiResponse.json();
    console.log('🟢 [ASSISTANT] Assistant criado com sucesso:', {
      id: assistantResult.id,
      name: assistantResult.name,
      model: assistantResult.model
    });

    // 4) Atualizar o agent no Supabase com o assistant_id
    console.log('🟡 [ASSISTANT] Atualizando agente com assistant_id...');
    const { data: updateData, error: updateError } = await supabase
      .from('agents')
      .update({
        assistant_id: assistantResult.id
      })
      .eq('id', agentId)
      .select();

    console.log('🟡 [ASSISTANT] Update result:', { updateData, updateError });

    if (updateError) {
      console.error('🔴 [ASSISTANT] Erro ao atualizar agente:', updateError);
      throw new Error(`Failed to update agent: ${updateError.message}`);
    } else {
      console.log('🟢 [ASSISTANT] Agente atualizado com sucesso');
    }

    console.log('🟢 [ASSISTANT] === PROCESSO COMPLETADO ===');

    return new Response(JSON.stringify({
      success: true,
      assistant: assistantResult,
      message: 'Assistant criado com sucesso!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔴 [ASSISTANT] ERRO CRÍTICO:', error);
    console.error('🔴 [ASSISTANT] Stack:', error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

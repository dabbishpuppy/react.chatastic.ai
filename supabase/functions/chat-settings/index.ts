
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Chat settings function started");

Deno.serve(async (req) => {
  console.log(`Request method: ${req.method}`);
  console.log(`Request URL: ${req.url}`);
  console.log(`Request headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2)}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    
    console.log(`Extracted agentId: ${agentId}`);
    
    if (!agentId) {
      return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Checking agent visibility for: ${agentId}`);

    // Check if agent exists and get visibility
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('visibility, rate_limit_enabled, rate_limit_messages, rate_limit_time_window, rate_limit_message')
      .eq('id', agentId)
      .single();

    if (agentError) {
      console.error('Error fetching agent:', agentError);
      return new Response(JSON.stringify({ 
        error: 'agent_not_found',
        message: 'Agent not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Agent ${agentId} not found - returning agent_not_found response`);

    // If agent is private, return minimal response
    if (agent.visibility === 'private') {
      return new Response(JSON.stringify({ 
        visibility: 'private'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Agent ${agentId} is PUBLIC, fetching chat interface settings and lead settings`);

    // Fetch chat interface settings
    const { data: chatSettings } = await supabase
      .from('chat_interface_settings')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    // Fetch lead settings
    const { data: leadSettings } = await supabase
      .from('lead_settings')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    console.log(`Lead settings fetched: ${leadSettings}`);

    // Prepare response with defaults
    const response = {
      visibility: agent.visibility,
      rate_limit_enabled: agent.rate_limit_enabled || false,
      rate_limit_messages: agent.rate_limit_messages || 20,
      rate_limit_time_window: agent.rate_limit_time_window || 240,
      rate_limit_message: agent.rate_limit_message || 'Too many messages in a row',
      display_name: chatSettings?.display_name || 'AI Assistant',
      initial_message: chatSettings?.initial_message || '👋 Hi! How can I help you today?',
      bubble_color: chatSettings?.bubble_color || '#000000', // Default to black
      user_message_color: chatSettings?.user_message_color || '#000000', // Default to black
      sync_colors: chatSettings?.sync_colors || false,
      theme: chatSettings?.theme || 'light',
      profile_picture: chatSettings?.profile_picture || undefined,
      chat_icon: chatSettings?.chat_icon || undefined,
      bubble_position: chatSettings?.bubble_position || 'right',
      footer: chatSettings?.footer || undefined,
      primary_color: chatSettings?.primary_color || '#000000', // Default to black
      show_feedback: chatSettings?.show_feedback !== undefined ? chatSettings.show_feedback : true,
      allow_regenerate: chatSettings?.allow_regenerate !== undefined ? chatSettings.allow_regenerate : true,
      suggested_messages: chatSettings?.suggested_messages || [],
      show_suggestions_after_chat: chatSettings?.show_suggestions_after_chat !== undefined ? chatSettings.show_suggestions_after_chat : true,
      auto_show_delay: chatSettings?.auto_show_delay !== undefined ? chatSettings.auto_show_delay : 1,
      message_placeholder: chatSettings?.message_placeholder || 'Write message here...',
      lead_settings: leadSettings || {
        enabled: false,
        title: 'Get in touch with us',
        collect_name: false,
        collect_email: false,
        collect_phone: false,
        name_placeholder: 'Full name',
        email_placeholder: 'Email',
        phone_placeholder: 'Phone'
      }
    };

    console.log(`Response with lead settings: ${JSON.stringify(response, null, 2)}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-settings function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

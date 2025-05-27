
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    // Extract agentId from query parameters
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    
    console.log('Extracted agentId:', agentId);
    
    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'Agent ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking agent visibility for:', agentId);

    // Check agent visibility and get security settings
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('visibility, rate_limit_enabled, rate_limit_messages, rate_limit_time_window, rate_limit_message')
      .eq('id', agentId)
      .single();

    if (agentError) {
      console.error('Error fetching agent:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (agent.visibility === 'private') {
      console.log(`Agent ${agentId} is PRIVATE`);
      return new Response(
        JSON.stringify({ visibility: 'private' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Agent ${agentId} is PUBLIC, fetching chat interface settings and lead settings`);

    // Get chat interface settings
    const { data: settings, error: settingsError } = await supabase
      .from('chat_interface_settings')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching chat interface settings:', settingsError);
    }

    // Get lead settings
    const { data: leadSettings, error: leadSettingsError } = await supabase
      .from('lead_settings')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (leadSettingsError && leadSettingsError.code !== 'PGRST116') {
      console.error('Error fetching lead settings:', leadSettingsError);
    }

    console.log('Lead settings fetched:', leadSettings);

    // Parse suggested_messages if it exists and is a string
    let parsedSuggestedMessages = [];
    if (settings?.suggested_messages) {
      try {
        if (typeof settings.suggested_messages === 'string') {
          parsedSuggestedMessages = JSON.parse(settings.suggested_messages);
        } else if (Array.isArray(settings.suggested_messages)) {
          parsedSuggestedMessages = settings.suggested_messages;
        }
      } catch (parseError) {
        console.error('Error parsing suggested_messages:', parseError);
        parsedSuggestedMessages = [];
      }
    }

    // Construct response with all settings including rate limiting and lead settings
    const response = {
      visibility: agent.visibility,
      rate_limit_enabled: agent.rate_limit_enabled,
      rate_limit_messages: agent.rate_limit_messages,
      rate_limit_time_window: agent.rate_limit_time_window,
      rate_limit_message: agent.rate_limit_message,
      // Chat interface settings
      display_name: settings?.display_name || 'AI Assistant',
      initial_message: settings?.initial_message || '👋 Hi! How can I help you today?',
      bubble_color: settings?.bubble_color,
      user_message_color: settings?.user_message_color,
      sync_colors: settings?.sync_colors || false,
      theme: settings?.theme || 'light',
      profile_picture: settings?.profile_picture,
      chat_icon: settings?.chat_icon,
      bubble_position: settings?.bubble_position || 'right',
      footer: settings?.footer,
      primary_color: settings?.primary_color,
      show_feedback: settings?.show_feedback ?? true,
      allow_regenerate: settings?.allow_regenerate ?? true,
      suggested_messages: parsedSuggestedMessages,
      show_suggestions_after_chat: settings?.show_suggestions_after_chat ?? true,
      auto_show_delay: settings?.auto_show_delay ?? 1,
      message_placeholder: settings?.message_placeholder || 'Write message here...',
      // Lead settings
      lead_settings: {
        enabled: leadSettings?.enabled || false,
        title: leadSettings?.title || 'Get in touch with us',
        collect_name: leadSettings?.collect_name || false,
        collect_email: leadSettings?.collect_email || false,
        collect_phone: leadSettings?.collect_phone || false,
        name_placeholder: leadSettings?.name_placeholder || 'Full name',
        email_placeholder: leadSettings?.email_placeholder || 'Email',
        phone_placeholder: leadSettings?.phone_placeholder || 'Phone'
      }
    };

    console.log('Response with lead settings:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in chat-settings function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

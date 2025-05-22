
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configure CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the agent ID from the URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const agentId = pathParts[pathParts.length - 1];
    
    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'Agent ID is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // First check if the agent exists and is public
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('visibility')
      .eq('id', agentId)
      .maybeSingle(); // Changed from .single() to .maybeSingle()

    // If agent doesn't exist or there's an error fetching it
    if (agentError) {
      console.error('Error fetching agent:', agentError);
      return new Response(
        JSON.stringify({ 
          visibility: 'private',
          error: 'Agent not found or is private'
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // If no agent data found
    if (!agentData) {
      return new Response(
        JSON.stringify({ 
          visibility: 'private',
          error: 'Agent not found'
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // If the agent is private, return an appropriate response
    if (agentData.visibility === 'private') {
      return new Response(
        JSON.stringify({ 
          visibility: 'private',
          error: 'This agent is set to private'
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Fetch the chat interface settings for the agent
    const { data: settings, error: settingsError } = await supabase
      .from('chat_interface_settings')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle(); // Changed from .single() to .maybeSingle()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ 
          error: 'Error fetching chat settings',
          bubble_color: '#3B82F6',
          user_message_color: '#3B82F6',
          sync_colors: false
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // If no settings exist yet, return default values
    if (!settings) {
      return new Response(
        JSON.stringify({
          bubble_color: '#3B82F6',
          user_message_color: '#3B82F6',
          sync_colors: false
        }),
        { headers: corsHeaders }
      );
    }

    // Parse suggested messages from JSON if needed
    let parsedSuggestedMessages = [];
    if (settings.suggested_messages) {
      try {
        if (typeof settings.suggested_messages === 'string') {
          parsedSuggestedMessages = JSON.parse(settings.suggested_messages);
        } else if (Array.isArray(settings.suggested_messages)) {
          parsedSuggestedMessages = settings.suggested_messages;
        }
      } catch (error) {
        console.error('Error parsing suggested messages:', error);
      }
    }

    // Make sure to format the response properly
    const formattedSettings = {
      ...settings,
      suggested_messages: parsedSuggestedMessages
    };

    return new Response(
      JSON.stringify(formattedSettings),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        bubble_color: '#3B82F6',
        user_message_color: '#3B82F6', 
        sync_colors: false
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

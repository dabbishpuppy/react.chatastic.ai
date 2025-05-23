
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configure CORS headers for browser access from any domain
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store'
};

serve(async (req) => {
  // Log the full URL for debugging
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the agent ID from the URL
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    
    console.log('Extracted agentId:', agentId);
    
    if (!agentId || agentId.length < 10) {
      console.log('Invalid or missing agent ID');
      return new Response(
        JSON.stringify({ 
          error: 'Agent ID is missing or invalid', 
          visibility: 'private',
          bubble_color: '#3B82F6',
          user_message_color: '#3B82F6',
          sync_colors: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client with service role for better access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking agent visibility for:', agentId);

    // First check if the agent exists and is public
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('visibility')
      .eq('id', agentId)
      .maybeSingle();

    // If agent doesn't exist or there's an error fetching it
    if (agentError) {
      console.error('Error fetching agent:', agentError);
      return new Response(
        JSON.stringify({ 
          visibility: 'private',
          error: 'Error fetching agent',
          bubble_color: '#3B82F6',
          user_message_color: '#3B82F6',
          sync_colors: false
        }),
        { status: 200, headers: corsHeaders } // Return 200 instead of 500 to avoid 406 errors
      );
    }

    // If no agent data found
    if (!agentData) {
      console.log('Agent not found:', agentId);
      return new Response(
        JSON.stringify({ 
          visibility: 'private',
          error: 'Agent not found',
          bubble_color: '#3B82F6',
          user_message_color: '#3B82F6',
          sync_colors: false
        }),
        { status: 200, headers: corsHeaders } // Return 200 instead of 404
      );
    }

    // If the agent is private, return an appropriate response
    if (agentData.visibility === 'private') {
      console.log(`Agent ${agentId} is PRIVATE`);
      return new Response(
        JSON.stringify({ 
          visibility: 'private',
          error: 'This agent is set to private'
        }),
        { status: 200, headers: corsHeaders } // Return 200 instead of 403
      );
    }

    console.log(`Agent ${agentId} is PUBLIC, fetching settings`);

    // Fetch the chat interface settings for the agent
    const { data: settings, error: settingsError } = await supabase
      .from('chat_interface_settings')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ 
          visibility: 'public',
          error: 'Error fetching chat settings',
          bubble_color: '#3B82F6',
          user_message_color: '#3B82F6',
          sync_colors: false
        }),
        { status: 200, headers: corsHeaders } // Always return 200 for successful API calls
      );
    }

    // If no settings exist yet, return default values
    if (!settings) {
      console.log('No settings found, returning defaults');
      return new Response(
        JSON.stringify({
          visibility: 'public',
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

    // Make sure to format the response properly and include the visibility
    const formattedSettings = {
      ...settings,
      visibility: 'public',
      suggested_messages: parsedSuggestedMessages
    };

    console.log('Returning settings:', formattedSettings);

    return new Response(
      JSON.stringify(formattedSettings),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        visibility: 'private', // Default to private on error for security
        error: 'Internal server error',
        bubble_color: '#3B82F6',
        user_message_color: '#3B82F6', 
        sync_colors: false
      }),
      { status: 200, headers: corsHeaders } // Return 200 instead of 500 to avoid client errors
    );
  }
});

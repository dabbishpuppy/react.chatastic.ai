
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadNotificationRequest {
  agentId: string;
  leadData: {
    name?: string;
    email?: string;
    phone?: string;
    agent_id: string;
    conversation_id?: string;
  };
  conversationId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, leadData, conversationId }: LeadNotificationRequest = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get notification settings for this agent
    const { data: notificationSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      // Continue without notifications if settings don't exist
      return new Response(JSON.stringify({ success: true, message: "Lead saved, no notifications configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if notifications are enabled and there are email addresses
    if (!notificationSettings.daily_leads_enabled || !notificationSettings.leads_emails || notificationSettings.leads_emails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Lead saved, notifications disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get agent name for the email
    const { data: agentData } = await supabase
      .from('agents')
      .select('name')
      .eq('id', agentId)
      .single();

    const agentName = agentData?.name || 'Unknown Agent';

    // Format lead information
    const leadInfo = [];
    if (leadData.name) leadInfo.push(`Name: ${leadData.name}`);
    if (leadData.email) leadInfo.push(`Email: ${leadData.email}`);
    if (leadData.phone) leadInfo.push(`Phone: ${leadData.phone}`);

    // Create email content
    const emailContent = `
      <h2>New Lead Notification</h2>
      <p>A new lead has been submitted for your agent: <strong>${agentName}</strong></p>
      
      <h3>Lead Information:</h3>
      <ul>
        ${leadInfo.map(info => `<li>${info}</li>`).join('')}
      </ul>
      
      <p><small>Conversation ID: ${conversationId || 'N/A'}</small></p>
      <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
    `;

    // Send email to all configured addresses
    const emailPromises = notificationSettings.leads_emails.map(async (email: string) => {
      return resend.emails.send({
        from: "WonderWave <noreply@resend.dev>",
        to: [email],
        subject: `New Lead for ${agentName}`,
        html: emailContent,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Log results
    emailResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Email sent successfully to ${notificationSettings.leads_emails[index]}`);
      } else {
        console.error(`Failed to send email to ${notificationSettings.leads_emails[index]}:`, result.reason);
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Lead notification emails sent",
      emailsSent: emailResults.filter(r => r.status === 'fulfilled').length,
      totalEmails: notificationSettings.leads_emails.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-lead-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

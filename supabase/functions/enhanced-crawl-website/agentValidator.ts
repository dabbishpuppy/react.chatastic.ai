
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function validateAgent(agentId: string) {
  let agent;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔍 Fetching agent data (attempt ${retryCount + 1}/${maxRetries})`);
      
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id, team_id')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error(`❌ Agent lookup error (attempt ${retryCount + 1}):`, agentError);
        if (retryCount === maxRetries - 1) {
          throw new Error(`Agent not found: ${agentError.message}`);
        }
      } else {
        agent = agentData;
        console.log('✅ Agent found:', { id: agent.id, team_id: agent.team_id });
        break;
      }
    } catch (lookupError) {
      console.error(`❌ Agent lookup failed (attempt ${retryCount + 1}):`, lookupError);
      if (retryCount === maxRetries - 1) {
        throw new Error('Agent lookup failed after multiple attempts');
      }
    }
    
    retryCount++;
    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
  }

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Validate that we have valid UUIDs
  if (typeof agent.team_id !== 'string') {
    throw new Error(`Invalid team_id type: expected string, got ${typeof agent.team_id}`);
  }

  return agent;
}

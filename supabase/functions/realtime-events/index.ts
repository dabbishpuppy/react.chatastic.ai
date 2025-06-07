
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SourceEvent {
  topic: string;
  type: 'STATUS_CHANGED' | 'PAGE_COMPLETED' | 'SOURCE_COMPLETED' | 'CRAWL_PROGRESS';
  sourceId: string;
  pageId?: string;
  status?: string;
  progress?: number;
  metadata?: any;
}

class RealtimeEventBus {
  private connectedClients: Map<string, WebSocket> = new Map();
  private sourceSubscriptions: Map<string, Set<string>> = new Map();

  addClient(clientId: string, socket: WebSocket, sourceId?: string): void {
    this.connectedClients.set(clientId, socket);
    
    if (sourceId) {
      if (!this.sourceSubscriptions.has(sourceId)) {
        this.sourceSubscriptions.set(sourceId, new Set());
      }
      this.sourceSubscriptions.get(sourceId)!.add(clientId);
    }

    socket.onclose = () => {
      this.removeClient(clientId, sourceId);
    };
  }

  removeClient(clientId: string, sourceId?: string): void {
    this.connectedClients.delete(clientId);
    
    if (sourceId && this.sourceSubscriptions.has(sourceId)) {
      this.sourceSubscriptions.get(sourceId)!.delete(clientId);
      
      if (this.sourceSubscriptions.get(sourceId)!.size === 0) {
        this.sourceSubscriptions.delete(sourceId);
      }
    }
  }

  broadcast(event: SourceEvent): void {
    const targetClients = this.sourceSubscriptions.get(event.sourceId) || new Set();
    
    targetClients.forEach(clientId => {
      const socket = this.connectedClients.get(clientId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify(event));
        } catch (error) {
          console.error(`Failed to send event to client ${clientId}:`, error);
          this.removeClient(clientId, event.sourceId);
        }
      }
    });
  }
}

const eventBus = new RealtimeEventBus();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { headers } = req;
    const upgradeHeader = headers.get("upgrade") || "";

    if (upgradeHeader.toLowerCase() === "websocket") {
      // Handle WebSocket upgrade
      const { socket, response } = Deno.upgradeWebSocket(req);
      const url = new URL(req.url);
      const sourceId = url.searchParams.get('sourceId');
      const clientId = crypto.randomUUID();

      console.log(`WebSocket connection established for source: ${sourceId}, client: ${clientId}`);

      socket.onopen = () => {
        eventBus.addClient(clientId, socket, sourceId || undefined);
        console.log(`Client ${clientId} connected to source ${sourceId}`);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`Received message from client ${clientId}:`, message);
          
          // Handle client messages (ping/pong, subscribe to additional sources, etc.)
          if (message.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error('Error processing client message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      };

      return response;
    }

    // Handle HTTP requests for broadcasting events
    if (req.method === 'POST') {
      const event: SourceEvent = await req.json();
      
      console.log('Broadcasting event:', event);
      eventBus.broadcast(event);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Health check
    return new Response(JSON.stringify({ 
      status: 'healthy',
      connectedClients: eventBus['connectedClients'].size,
      sourceSubscriptions: eventBus['sourceSubscriptions'].size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in realtime-events:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

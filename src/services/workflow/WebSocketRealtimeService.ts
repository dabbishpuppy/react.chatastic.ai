interface SourceEvent {
  topic: string;
  type: 'STATUS_CHANGED' | 'PAGE_COMPLETED' | 'SOURCE_COMPLETED' | 'CRAWL_PROGRESS';
  sourceId: string;
  pageId?: string;
  status?: string;
  progress?: number;
  metadata?: any;
}

export class WebSocketRealtimeService {
  private static connections: Map<string, WebSocket> = new Map();
  private static listeners: Map<string, Set<(event: SourceEvent) => void>> = new Map();
  private static reconnectAttempts: Map<string, number> = new Map();
  private static maxReconnectAttempts = 5;

  /**
   * Subscribe to real-time events for a specific source
   */
  static subscribeToSource(
    sourceId: string,
    onEvent: (event: SourceEvent) => void
  ): () => void {
    console.log(`🔗 WebSocket: Subscribing to source ${sourceId}`);

    // Add listener
    if (!this.listeners.has(sourceId)) {
      this.listeners.set(sourceId, new Set());
    }
    this.listeners.get(sourceId)!.add(onEvent);

    // Create or reuse WebSocket connection
    this.ensureConnection(sourceId);

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromSource(sourceId, onEvent);
    };
  }

  private static ensureConnection(sourceId: string): void {
    if (this.connections.has(sourceId)) {
      const ws = this.connections.get(sourceId)!;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        return; // Connection already exists and is healthy
      }
    }

    this.createConnection(sourceId);
  }

  private static createConnection(sourceId: string): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/realtime-events?sourceId=${sourceId}`;
    
    console.log(`🔌 WebSocket: Connecting to ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`✅ WebSocket: Connected to source ${sourceId}`);
      this.reconnectAttempts.set(sourceId, 0);
      
      // Send ping to keep connection alive
      this.startHeartbeat(sourceId);
    };

    ws.onmessage = (event) => {
      try {
        const sourceEvent: SourceEvent = JSON.parse(event.data);
        console.log(`📨 WebSocket: Event received for ${sourceId}:`, sourceEvent);
        
        // Notify all listeners for this source
        const listeners = this.listeners.get(sourceId);
        if (listeners) {
          listeners.forEach(listener => {
            try {
              listener(sourceEvent);
            } catch (error) {
              console.error('Error in event listener:', error);
            }
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket: Connection closed for source ${sourceId}`, event.code, event.reason);
      this.connections.delete(sourceId);
      
      // Attempt reconnection if there are still listeners
      if (this.listeners.has(sourceId) && this.listeners.get(sourceId)!.size > 0) {
        this.scheduleReconnect(sourceId);
      }
    };

    ws.onerror = (error) => {
      console.error(`❌ WebSocket: Error for source ${sourceId}:`, error);
    };

    this.connections.set(sourceId, ws);
  }

  private static scheduleReconnect(sourceId: string): void {
    const attempts = this.reconnectAttempts.get(sourceId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ WebSocket: Max reconnection attempts reached for source ${sourceId}`);
      return;
    }

    const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
    console.log(`🔄 WebSocket: Scheduling reconnect for source ${sourceId} in ${delay}ms (attempt ${attempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts.set(sourceId, attempts + 1);
      this.createConnection(sourceId);
    }, delay);
  }

  private static startHeartbeat(sourceId: string): void {
    const ws = this.connections.get(sourceId);
    if (!ws) return;

    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // Send ping every 30 seconds
  }

  private static unsubscribeFromSource(
    sourceId: string,
    onEvent: (event: SourceEvent) => void
  ): void {
    const listeners = this.listeners.get(sourceId);
    if (listeners) {
      listeners.delete(onEvent);
      
      if (listeners.size === 0) {
        // No more listeners, close connection
        this.listeners.delete(sourceId);
        const ws = this.connections.get(sourceId);
        if (ws) {
          ws.close();
          this.connections.delete(sourceId);
        }
        console.log(`🔌 WebSocket: Disconnected from source ${sourceId} (no more listeners)`);
      }
    }
  }

  /**
   * Get connection status for a source
   */
  static getConnectionStatus(sourceId: string): 'connected' | 'connecting' | 'disconnected' {
    const ws = this.connections.get(sourceId);
    if (!ws) return 'disconnected';
    
    switch (ws.readyState) {
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CONNECTING:
        return 'connecting';
      default:
        return 'disconnected';
    }
  }

  /**
   * Force reconnection for a source
   */
  static reconnectSource(sourceId: string): void {
    const ws = this.connections.get(sourceId);
    if (ws) {
      ws.close();
    }
    this.ensureConnection(sourceId);
  }

  /**
   * Disconnect all WebSocket connections
   */
  static disconnectAll(): void {
    console.log('🔌 WebSocket: Disconnecting all connections');
    
    this.connections.forEach((ws, sourceId) => {
      ws.close();
      console.log(`🔌 WebSocket: Disconnected from source ${sourceId}`);
    });
    
    this.connections.clear();
    this.listeners.clear();
    this.reconnectAttempts.clear();
  }

  /**
   * Get current connection statistics
   */
  static getStats(): {
    activeConnections: number;
    totalListeners: number;
    connectionsBySource: Record<string, 'connected' | 'connecting' | 'disconnected'>;
  } {
    const connectionsBySource: Record<string, 'connected' | 'connecting' | 'disconnected'> = {};
    let totalListeners = 0;

    this.listeners.forEach((listeners, sourceId) => {
      connectionsBySource[sourceId] = this.getConnectionStatus(sourceId);
      totalListeners += listeners.size;
    });

    return {
      activeConnections: this.connections.size,
      totalListeners,
      connectionsBySource
    };
  }
}

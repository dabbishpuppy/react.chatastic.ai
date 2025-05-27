
declare global {
  interface Window {
    wonderwaveConfig?: {
      supabaseUrl?: string;
      supabaseKey?: string;
      agentId?: string;
      debug?: boolean;
      [key: string]: any;
    };
  }
}

export {};

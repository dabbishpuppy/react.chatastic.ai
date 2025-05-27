
export interface Conversation {
  id: string;
  agent_id: string;
  session_id: string;
  title: string | null;
  status: 'active' | 'ended';
  source: 'iframe' | 'bubble';
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  is_agent: boolean;
  timestamp: string;
  created_at: string;
  feedback?: 'like' | 'dislike' | null;
}

// Helper function to safely type-guard feedback values
export const validateFeedback = (feedback: any): 'like' | 'dislike' | null => {
  if (feedback === 'like' || feedback === 'dislike') {
    return feedback;
  }
  return null;
};

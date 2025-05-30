
import { supabase } from "@/integrations/supabase/client";

export interface UserInfo {
  id: string;
  email?: string;
  display_name?: string;
}

export class UserService {
  static async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      // Try to get user email from team_members by joining with auth.users
      // Since we can't access auth.users directly, we'll check if there's a way
      // to get user info through the team_members table or use RPC functions
      
      // For now, we'll return the user ID and indicate we need more data
      // In a production app, you'd want to create a profiles table or use RPC
      return {
        id: userId,
        email: `user-${userId.slice(0, 8)}@example.com`, // Temporary fallback
        display_name: `User ${userId.slice(0, 8)}`
      };
    } catch (error) {
      console.error('Error in getUserInfo:', error);
      return {
        id: userId,
        email: 'Unknown User',
        display_name: 'Unknown User'
      };
    }
  }

  static async getUsersInfo(userIds: string[]): Promise<UserInfo[]> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const results = await Promise.all(
      uniqueIds.map(id => this.getUserInfo(id))
    );
    return results.filter(Boolean) as UserInfo[];
  }

  // Method to get team members for the current user's teams
  static async getTeamMembers(): Promise<{ user_id: string; email?: string }[]> {
    try {
      // Get current user's teams
      const { data: userTeams, error: teamsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (teamsError || !userTeams?.length) {
        return [];
      }

      const teamIds = userTeams.map(t => t.team_id);

      // Get all team members for those teams
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        return [];
      }

      // For now, return user IDs - in production you'd join with profiles table
      return members?.map(m => ({ 
        user_id: m.user_id,
        email: `user-${m.user_id.slice(0, 8)}@wonderwave.no` // Fallback for demo
      })) || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }
}


import { supabase } from "@/integrations/supabase/client";

export interface UserInfo {
  id: string;
  email?: string;
  display_name?: string;
}

export class UserService {
  static async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      // Use the new database function to get the actual user email
      const { data, error } = await supabase
        .rpc('get_user_email', { user_id_param: userId });

      if (error) {
        console.error('Error fetching user email:', error);
        return {
          id: userId,
          email: 'Unknown User',
          display_name: 'Unknown User'
        };
      }

      return {
        id: userId,
        email: data || 'Unknown User',
        display_name: data ? data.split('@')[0] : 'Unknown User'
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
    try {
      const uniqueIds = [...new Set(userIds.filter(Boolean))];
      
      if (uniqueIds.length === 0) {
        return [];
      }

      // Use the new database function to get multiple user emails at once
      const { data, error } = await supabase
        .rpc('get_users_emails', { user_ids: uniqueIds });

      if (error) {
        console.error('Error fetching users emails:', error);
        // Fallback to individual calls if the batch function fails
        const results = await Promise.all(
          uniqueIds.map(id => this.getUserInfo(id))
        );
        return results.filter(Boolean) as UserInfo[];
      }

      return data?.map((user: { id: string; email: string }) => ({
        id: user.id,
        email: user.email || 'Unknown User',
        display_name: user.email ? user.email.split('@')[0] : 'Unknown User'
      })) || [];
    } catch (error) {
      console.error('Error in getUsersInfo:', error);
      return [];
    }
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

      if (!members?.length) {
        return [];
      }

      // Get actual emails for all team members
      const userIds = members.map(m => m.user_id);
      const { data: usersWithEmails, error: emailError } = await supabase
        .rpc('get_users_emails', { user_ids: userIds });

      if (emailError) {
        console.error('Error fetching team member emails:', emailError);
        return members.map(m => ({ 
          user_id: m.user_id,
          email: 'Unknown User'
        }));
      }

      return usersWithEmails?.map((user: { id: string; email: string }) => ({ 
        user_id: user.id,
        email: user.email || 'Unknown User'
      })) || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }
}

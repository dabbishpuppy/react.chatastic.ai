
import { supabase } from "@/integrations/supabase/client";

export interface UserInfo {
  id: string;
  email?: string;
  display_name?: string;
}

export class UserService {
  static async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      // Try to get user from auth.users (this might not work due to RLS)
      // So we'll use a more reliable approach by creating a user profiles view
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, display_name')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching user info:', error);
        return null;
      }

      if (data) {
        return data;
      }

      // Fallback: return just the ID
      return {
        id: userId,
        email: 'Unknown User',
        display_name: 'Unknown User'
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
}

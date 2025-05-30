
import { supabase } from "@/integrations/supabase/client";

export interface UserInfo {
  id: string;
  email?: string;
  display_name?: string;
}

export class UserService {
  static async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      // Since we can't directly access auth.users table from client,
      // we'll return basic info with the user ID and fallback values
      // In a real app, you'd want to create a user_profiles table
      
      return {
        id: userId,
        email: 'User',
        display_name: 'User'
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

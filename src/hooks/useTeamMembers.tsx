
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TeamMember {
  user_id: string;
  email: string;
  memberSince: string;
  role: "owner" | "admin" | "member";
  teams: string[];
}

export const useTeamMembers = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTeamMembers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all team members and their teams
      const { data: teamMembersData, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          role,
          created_at,
          teams (
            name
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by user_id and aggregate team information
      const membersMap = new Map<string, TeamMember>();

      teamMembersData?.forEach((member) => {
        const userId = member.user_id;
        const teamName = (member.teams as any)?.name || 'Unknown Team';

        if (membersMap.has(userId)) {
          const existingMember = membersMap.get(userId)!;
          existingMember.teams.push(teamName);
        } else {
          // For the current user, use their actual email, for others use a placeholder
          const email = userId === user.id 
            ? user.email || 'unknown@example.com'
            : `user-${userId.slice(0, 8)}@wonderwave.no`;

          membersMap.set(userId, {
            user_id: userId,
            email,
            memberSince: new Date(member.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            role: member.role as "owner" | "admin" | "member",
            teams: [teamName]
          });
        }
      });

      setMembers(Array.from(membersMap.values()));
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error loading members",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [user]);

  return { members, loading, refetch: fetchTeamMembers };
};

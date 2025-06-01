
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
  status?: "active" | "pending";
  invitation_id?: string;
}

export const useTeamMembers = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTeamMembers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching team members...');
      
      // First, get all teams where the current user is a member
      const { data: userTeams, error: userTeamsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (userTeamsError) throw userTeamsError;

      if (!userTeams || userTeams.length === 0) {
        console.log('User is not a member of any teams');
        setMembers([]);
        setLoading(false);
        return;
      }

      const teamIds = userTeams.map(t => t.team_id);
      console.log('User teams:', teamIds);

      // Get all team members for these teams
      const { data: teamMembersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          role,
          created_at,
          teams (
            name
          )
        `)
        .in('team_id', teamIds)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      // Get all user emails for the team members
      const userIds = [...new Set(teamMembersData?.map(m => m.user_id) || [])];
      const { data: usersData, error: usersError } = await supabase.rpc('get_users_emails', {
        user_ids: userIds
      });

      if (usersError) {
        console.warn('Could not fetch user emails, using fallback approach');
      }

      // Create a map of user emails
      const emailMap = new Map<string, string>();
      if (usersData) {
        usersData.forEach((userData: { id: string; email: string }) => {
          emailMap.set(userData.id, userData.email);
        });
      }

      // Get pending invitations for these teams
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select(`
          id,
          email,
          role,
          created_at,
          teams (
            name
          )
        `)
        .in('team_id', teamIds)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (invitationsError) {
        console.warn('Could not fetch invitations:', invitationsError);
      }

      // Group active members by user_id and aggregate team information
      const membersMap = new Map<string, TeamMember>();

      teamMembersData?.forEach((member) => {
        const userId = member.user_id;
        const teamName = (member.teams as any)?.name || 'Unknown Team';
        const userEmail = emailMap.get(userId) || `user-${userId.slice(0, 8)}@example.com`;

        if (membersMap.has(userId)) {
          const existingMember = membersMap.get(userId)!;
          if (!existingMember.teams.includes(teamName)) {
            existingMember.teams.push(teamName);
          }
        } else {
          membersMap.set(userId, {
            user_id: userId,
            email: userEmail,
            memberSince: new Date(member.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            role: member.role as "owner" | "admin" | "member",
            teams: [teamName],
            status: "active"
          });
        }
      });

      // Add pending invitations
      invitationsData?.forEach((invitation) => {
        const teamName = (invitation.teams as any)?.name || 'Unknown Team';
        const invitationId = `invitation-${invitation.id}`;

        membersMap.set(invitationId, {
          user_id: invitationId,
          email: invitation.email,
          memberSince: new Date(invitation.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          role: invitation.role as "owner" | "admin" | "member",
          teams: [teamName],
          status: "pending",
          invitation_id: invitation.id
        });
      });

      const finalMembers = Array.from(membersMap.values());
      console.log('Fetched members:', finalMembers);
      setMembers(finalMembers);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error loading members",
        description: error.message,
        variant: "destructive",
      });
      setMembers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [user]);

  return { members, loading, refetch: fetchTeamMembers };
};

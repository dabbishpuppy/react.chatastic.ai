
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "owner" | "admin" | "member";

export interface RolePermissions {
  canManageTeamMembers: boolean;
  canManageAgents: boolean;
  canManageTeamSettings: boolean;
  canViewBilling: boolean;
  canManageBilling: boolean;
  canDeleteTeam: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeOtherRoles: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageIntegrations: boolean;
}

export const useRolePermissions = (teamId: string | null) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions>({
    canManageTeamMembers: false,
    canManageAgents: false,
    canManageTeamSettings: false,
    canViewBilling: false,
    canManageBilling: false,
    canDeleteTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeOtherRoles: false,
    canManageContent: false,
    canViewAnalytics: false,
    canManageIntegrations: false,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!teamId || !user) {
      setLoading(false);
      return;
    }

    fetchUserRole();
  }, [teamId, user]);

  useEffect(() => {
    if (userRole) {
      setPermissions(getRolePermissions(userRole));
    }
  }, [userRole]);

  const fetchUserRole = async () => {
    if (!teamId || !user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_team_role', {
        team_id_param: teamId
      });

      if (error) throw error;
      setUserRole(data);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const getRolePermissions = (role: UserRole): RolePermissions => {
    switch (role) {
      case 'owner':
        return {
          canManageTeamMembers: true,
          canManageAgents: true,
          canManageTeamSettings: true,
          canViewBilling: true,
          canManageBilling: true,
          canDeleteTeam: true,
          canInviteMembers: true,
          canRemoveMembers: true,
          canChangeOtherRoles: true,
          canManageContent: true,
          canViewAnalytics: true,
          canManageIntegrations: true,
        };
      case 'admin':
        return {
          canManageTeamMembers: true,
          canManageAgents: true,
          canManageTeamSettings: false,
          canViewBilling: false,
          canManageBilling: false,
          canDeleteTeam: false,
          canInviteMembers: true,
          canRemoveMembers: true,
          canChangeOtherRoles: false, // Can only manage members, not other admins/owners
          canManageContent: true,
          canViewAnalytics: true,
          canManageIntegrations: true,
        };
      case 'member':
        return {
          canManageTeamMembers: false,
          canManageAgents: false,
          canManageTeamSettings: false,
          canViewBilling: false,
          canManageBilling: false,
          canDeleteTeam: false,
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeOtherRoles: false,
          canManageContent: false,
          canViewAnalytics: true, // Basic analytics only
          canManageIntegrations: false,
        };
      default:
        return {
          canManageTeamMembers: false,
          canManageAgents: false,
          canManageTeamSettings: false,
          canViewBilling: false,
          canManageBilling: false,
          canDeleteTeam: false,
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeOtherRoles: false,
          canManageContent: false,
          canViewAnalytics: false,
          canManageIntegrations: false,
        };
    }
  };

  const canPerformAction = (action: keyof RolePermissions): boolean => {
    return permissions[action];
  };

  const canManageUser = (targetUserRole: UserRole): boolean => {
    if (!userRole) return false;
    
    // Owners can manage everyone
    if (userRole === 'owner') return true;
    
    // Admins can only manage members
    if (userRole === 'admin' && targetUserRole === 'member') return true;
    
    return false;
  };

  return {
    userRole,
    permissions,
    loading,
    canPerformAction,
    canManageUser,
    refetch: fetchUserRole,
  };
};

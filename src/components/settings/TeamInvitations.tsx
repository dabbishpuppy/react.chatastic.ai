
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  teams: {
    name: string;
  };
}

interface AcceptInvitationResponse {
  success: boolean;
  error?: string;
  team_id?: string;
  role?: string;
  message?: string;
}

const TeamInvitations: React.FC = () => {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.email) return;

      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          id,
          team_id,
          email,
          role,
          status,
          expires_at,
          teams:team_id(name)
        `)
        .eq('email', user.user.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      toast({
        title: "Error loading invitations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const { data, error } = await supabase.rpc('accept_team_invitation', {
        invitation_id: invitationId
      });

      if (error) throw error;

      const response = data as unknown as AcceptInvitationResponse;

      if (response.success) {
        toast({
          title: "Invitation accepted",
          description: "You've successfully joined the team!",
        });
        
        // Remove the accepted invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        toast({
          title: "Error accepting invitation",
          description: response.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error accepting invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-gray-500">Loading invitations...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show the card if there are no invitations
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={20} />
          Pending Invitations ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">{invitation.teams?.name}</span>
                  <Badge className={getRoleColor(invitation.role)}>
                    {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Expires on {formatDate(invitation.expires_at)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleAcceptInvitation(invitation.id)}
                  disabled={processingId === invitation.id}
                  size="sm"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {processingId === invitation.id ? "Accepting..." : "Accept"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamInvitations;

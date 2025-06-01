
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  team_name: string;
  inviter_email: string;
  expires_at: string;
}

const AcceptInvitation: React.FC = () => {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invitationId) {
      fetchInvitationDetails();
    }
  }, [invitationId]);

  const fetchInvitationDetails = async () => {
    try {
      const { data, error } = await supabase.rpc('get_invitation_details', {
        invitation_id_param: invitationId
      });

      if (error) throw error;

      if (data.success) {
        setInvitation(data.invitation);
      } else {
        setError(data.error);
      }
    } catch (error: any) {
      console.error('Error fetching invitation:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "destructive",
      });
      return;
    }

    setAccepting(true);
    try {
      // First, check if user already exists
      const { data: existingUser } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      });

      if (existingUser.user) {
        // User exists and signed in successfully, just accept the invitation
        const { data: acceptData, error: acceptError } = await supabase.rpc('accept_team_invitation', {
          invitation_id: invitationId
        });

        if (acceptError) throw acceptError;

        toast({
          title: "Welcome back!",
          description: `You've successfully joined ${invitation.team_name}`,
        });
        
        navigate('/dashboard');
        return;
      }

      // User doesn't exist or wrong password, create new account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // Accept the invitation for the new user
        const { data: acceptData, error: acceptError } = await supabase.rpc('accept_invitation_with_signup', {
          invitation_id_param: invitationId,
          password_param: password
        });

        if (acceptError) throw acceptError;

        // Add user to team
        const { error: teamError } = await supabase
          .from('team_members')
          .insert({
            team_id: acceptData.team_id,
            user_id: signUpData.user.id,
            role: acceptData.role
          });

        if (teamError && !teamError.message.includes('duplicate')) {
          throw teamError;
        }

        toast({
          title: "Account created successfully!",
          description: `Welcome to ${invitation.team_name}! You've been assigned the ${invitation.role} role.`,
        });
        
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error accepting invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              {error || "This invitation is no longer valid or has expired."}
            </p>
            <Button onClick={() => navigate('/signin')} variant="outline">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>You're Invited!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              <strong>{invitation.inviter_email}</strong> has invited you to join
            </p>
            <h3 className="text-lg font-semibold">{invitation.team_name}</h3>
            <p className="text-sm text-gray-600">
              as a <strong>{invitation.role}</strong>
            </p>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={accepting || !password || !confirmPassword}
              className="w-full"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Accept Invitation & Join Team"
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By accepting this invitation, you'll create an account and join {invitation.team_name}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;


import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Team {
  id: string;
  name: string;
}

interface InviteMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTeams();
    }
  }, [isOpen]);

  const fetchAvailableTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name');

      if (error) throw error;
      setAvailableTeams(teams || []);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error loading teams",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTeamId) {
      toast({
        title: "Error",
        description: "Please select a team for the new member.",
        variant: "destructive"
      });
      return;
    }

    // Here you would normally send an invitation
    toast({
      title: "Invitation sent",
      description: `Invitation sent to ${inviteEmail} for the selected team`
    });
    
    setInviteEmail("");
    setSelectedTeamId("");
    onClose();
  };

  const handleClose = () => {
    setInviteEmail("");
    setSelectedTeamId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="team">Team access</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleInvite}>Send invitation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;

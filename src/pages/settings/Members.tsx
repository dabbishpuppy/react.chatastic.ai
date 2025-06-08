
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import MembersTable from "@/components/settings/MembersTable";
import InviteMemberDialog from "@/components/settings/InviteMemberDialog";

const MembersSettings = () => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Members</h2>
          <p className="text-gray-600 mt-1">Manage team members and their permissions</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          Invite Member
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            View and manage all members of your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable />
        </CardContent>
      </Card>

      <InviteMemberDialog 
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
};

export default MembersSettings;

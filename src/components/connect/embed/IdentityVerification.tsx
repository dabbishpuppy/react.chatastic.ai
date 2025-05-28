
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IdentityVerificationProps {
  agentId?: string;
}

const IdentityVerification: React.FC<IdentityVerificationProps> = ({ agentId }) => {
  const [domain, setDomain] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  const handleVerification = async () => {
    if (!domain) {
      toast({
        title: "Domain required",
        description: "Please enter a domain to verify",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    
    // Simulate verification process
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      toast({
        title: "Domain verified",
        description: `${domain} has been successfully verified`
      });
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Domain Verification
        </CardTitle>
        <CardDescription>
          Verify your domain to enable advanced security features and prevent unauthorized embedding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={isVerified}
          />
          <Button 
            onClick={handleVerification}
            disabled={isVerifying || isVerified}
          >
            {isVerifying ? "Verifying..." : isVerified ? <Check className="h-4 w-4" /> : "Verify"}
          </Button>
        </div>
        
        {isVerified && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Check className="h-4 w-4" />
            Domain verified successfully
          </div>
        )}
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Security Notice</p>
              <p>Without domain verification, your agent can be embedded on any website. Verify your domain to restrict embedding to authorized sites only.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IdentityVerification;

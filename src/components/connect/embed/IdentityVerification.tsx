import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface IdentityVerificationProps {
  agentId?: string;
}

export const IdentityVerification: React.FC<IdentityVerificationProps> = ({ agentId }) => {
  const { toast } = useToast();

  const handleCopyVerification = () => {
    const verificationCode = document.querySelector(".verification-code code")?.textContent;
    if (verificationCode) {
      navigator.clipboard.writeText(verificationCode);
      toast({
        title: "Code copied",
        description: "The verification code has been copied to your clipboard."
      });
    }
  };

  return (
    <div className="mt-4 border p-4 rounded-md">
      <h4 className="font-medium mb-2">For Identity Verification</h4>
      <p className="text-sm text-gray-600 mb-2">
        On the server side, generate an HMAC hash using your secret key and the user ID:
      </p>
      
      <div className="verification-code bg-gray-50 p-3 rounded-md text-xs overflow-x-auto mb-3">
        <code>{`
const crypto = require('crypto');
const secret = '********'; // Your verification secret key
const userId = current_user.id // A string UUID to identify your user
const hash = crypto.createHmac('sha256', secret).update(userId).digest('hex');
        `}</code>
        
        <Button 
          variant="outline" 
          size="sm"
          className="mt-2"
          onClick={handleCopyVerification}
        >
          Copy
        </Button>
      </div>
      
      <p className="text-sm text-gray-600 mb-2">
        Then, include this hash in your chat bubble configuration:
      </p>
      
      <div className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
        <code>{`
<script>
  window.wonderwaveConfig = {
    agentId: "${agentId}",
    identityHash: "YOUR_GENERATED_HASH", // Add the hash here
    userId: "USER_UUID" // The same user ID used to generate the hash
  };
</script>
        `}</code>
      </div>
      
      <div className="mt-3 text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
        <strong>Important:</strong> Keep your secret key safe! Never commit it directly to your repository, client-side code, or anywhere a third party can find it.
      </div>
    </div>
  );
};


import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import IdentityVerification from "./IdentityVerification";

interface ChatBubbleTabProps {
  agentId?: string;
  onCopy?: (text: string) => Promise<void>;
}

export const ChatBubbleTab: React.FC<ChatBubbleTabProps> = ({
  agentId,
  onCopy
}) => {
  const [showIdentityVerification, setShowIdentityVerification] = useState(false);
  
  return (
    <div className="p-4 border rounded-md">
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          <h3 className="font-medium mb-2">
            Embed a chat bubble <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Recommended</span>
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Embed a chat bubble on your website that opens a chatbot when clicked. Customize the appearance in your <Link to={`/agent/${agentId}/settings/chat-interface`} className="text-blue-600 hover:underline">chat interface settings</Link>.
          </p>
          
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowIdentityVerification(!showIdentityVerification)}>
              {showIdentityVerification ? "Hide" : "Show"} Identity Verification
            </Button>
          </div>

          {showIdentityVerification && <IdentityVerification agentId={agentId} />}
        </div>
      </div>
    </div>
  );
};

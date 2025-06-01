
import React from "react";
import { Link } from "react-router-dom";
import EmbedCodeDisplay from "./EmbedCodeDisplay";

interface IframeTabProps {
  agentId?: string;
  onCopy?: (text: string) => Promise<void>;
}

export const IframeTab: React.FC<IframeTabProps> = ({
  agentId,
  onCopy
}) => {
  // Generate iframe embed code
  const generateIframeCode = () => {
    if (!agentId) return '';
    
    return `<iframe
  src="https://query-spark-start.lovable.app/chat/${agentId}?source=iframe"
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
  title="AI Chat Assistant">
</iframe>`;
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-md">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <h3 className="font-medium mb-2">
              Embed the iframe directly
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Add the agent anywhere on your website as an embedded chat window. Customize the appearance in your <Link to={`/agent/${agentId}/settings/chat-interface`} className="text-blue-600 hover:underline">chat interface settings</Link>.
            </p>
          </div>
        </div>
      </div>

      {agentId && (
        <EmbedCodeDisplay
          title="Iframe Embed Code"
          description="Copy and paste this iframe code directly into your website's HTML where you want the chat to appear."
          code={generateIframeCode()}
        />
      )}
    </div>
  );
};

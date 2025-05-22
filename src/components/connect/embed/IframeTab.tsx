
import React from "react";
import { Link, useParams } from "react-router-dom";

interface IframeTabProps {
  agentId?: string;
}

export const IframeTab: React.FC<IframeTabProps> = ({ agentId }) => {
  return (
    <div className="p-4 border rounded-md">
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          <h3 className="font-medium mb-2">
            Embed the iframe directly
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Add the agent anywhere on your website as an embedded chat window. Customize the appearance in your <Link to={`/agent/${agentId}/settings/chat-interface`} className="text-blue-600 hover:underline">chat interface settings</Link>.
          </p>
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200 mb-4">
            <strong>Dynamic Settings:</strong> All appearance settings are automatically loaded from your configuration. Changes in your chat interface settings will automatically apply to all embedded iframes without needing to update the embed code.
          </div>
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
            <strong>Note:</strong> The iframe will automatically resize its height based on content.
          </div>
        </div>
      </div>
    </div>
  );
};

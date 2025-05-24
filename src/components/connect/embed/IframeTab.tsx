import React from "react";
import { Link, useParams } from "react-router-dom";
interface IframeTabProps {
  agentId?: string;
}
export const IframeTab: React.FC<IframeTabProps> = ({
  agentId
}) => {
  return <div className="p-4 border rounded-md">
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
    </div>;
};
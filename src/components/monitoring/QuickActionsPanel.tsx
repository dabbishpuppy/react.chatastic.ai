
import React from 'react';
import { AgentSelector } from './AgentSelector';
import { TestingIntegration } from './TestingIntegration';
import { AgentManagementShortcuts } from './AgentManagementShortcuts';

interface QuickActionsPanelProps {
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  selectedAgentId,
  onAgentSelect
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <AgentSelector 
        selectedAgentId={selectedAgentId}
        onAgentSelect={onAgentSelect}
      />
      <TestingIntegration />
      <AgentManagementShortcuts selectedAgentId={selectedAgentId} />
    </div>
  );
};

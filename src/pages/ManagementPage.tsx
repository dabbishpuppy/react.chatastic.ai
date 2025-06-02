
import React from 'react';
import { useParams } from 'react-router-dom';
import AgentPageLayout from './AgentPageLayout';
import RAGManagementDashboard from '@/components/management/RAGManagementDashboard';

const ManagementPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();

  if (!agentId) {
    return <div>Agent ID not found</div>;
  }

  return (
    <AgentPageLayout
      defaultActiveTab="management"
      defaultPageTitle="Management"
    >
      <RAGManagementDashboard agentId={agentId} />
    </AgentPageLayout>
  );
};

export default ManagementPage;

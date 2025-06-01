
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';

// Page imports
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';
import SignIn from '@/pages/SignIn';
import Register from '@/pages/Register';
import AcceptInvitation from '@/pages/AcceptInvitation';
import NotFound from '@/pages/NotFound';
import AgentPageLayout from '@/pages/AgentPageLayout';
import UsagePage from '@/pages/Usage';

// Settings page components
import GeneralSettings from '@/pages/settings/General';
import MembersSettings from '@/pages/settings/Members';
import PlansSettings from '@/pages/settings/Plans';
import BillingSettings from '@/pages/settings/Billing';
import ApiKeysSettings from '@/pages/settings/ApiKeys';
import UsageSettings from '@/pages/settings/Usage';

// Agent page components
import AgentEnvironment from '@/pages/AgentEnvironment';
import SourcesPage from '@/pages/SourcesPage';
import SourceDetailPage from '@/pages/SourceDetailPage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import AgentSettingsPage from '@/pages/AgentSettingsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import ActionsPage from '@/pages/ActionsPage';
import ActivityPage from '@/pages/ActivityPage';
import LeadsPage from '@/pages/LeadsPage';
import EmbeddedChat from '@/pages/EmbeddedChat';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/register" element={<Register />} />
              <Route path="/accept-invitation/:invitationId" element={<AcceptInvitation />} />
              
              {/* Embedded chat route */}
              <Route path="/chat/:agentId" element={<EmbeddedChat />} />
              
              {/* Main dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Settings routes */}
              <Route path="/settings" element={<Settings />}>
                <Route path="general" element={<GeneralSettings />} />
                <Route path="members" element={<MembersSettings />} />
                <Route path="plans" element={<PlansSettings />} />
                <Route path="billing" element={<BillingSettings />} />
                <Route path="api-keys" element={<ApiKeysSettings />} />
                <Route path="usage" element={<UsageSettings />} />
              </Route>
              
              {/* Usage page */}
              <Route path="/usage" element={<UsagePage />} />
              
              {/* Agent routes */}
              <Route path="/agent/:agentId" element={<AgentPageLayout />}>
                <Route index element={<AgentEnvironment />} />
                <Route path="sources" element={<SourcesPage />} />
                <Route path="sources/:sourceId" element={<SourceDetailPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="settings/*" element={<AgentSettingsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="actions" element={<ActionsPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="activity/leads" element={<LeadsPage />} />
              </Route>
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

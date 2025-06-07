
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Pages
import Index from '@/pages/Index';
import SignIn from '@/pages/SignIn';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import AgentEnvironment from '@/pages/AgentEnvironment';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SourcesPage from '@/pages/SourcesPage';
import SourceDetailPage from '@/pages/SourceDetailPage';
import ActionsPage from '@/pages/ActionsPage';
import ActivityPage from '@/pages/ActivityPage';
import LeadsPage from '@/pages/LeadsPage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import AgentSettingsPage from '@/pages/AgentSettingsPage';
import ManagementPage from '@/pages/ManagementPage';
import Settings from '@/pages/Settings';
import EmbeddedChat from '@/pages/EmbeddedChat';
import NotFound from '@/pages/NotFound';
import AcceptInvitation from '@/pages/AcceptInvitation';
import SystemTestingPage from '@/pages/SystemTestingPage';

// Settings Pages
import GeneralSettings from '@/pages/settings/General';
import MembersSettings from '@/pages/settings/Members';
import PlansSettings from '@/pages/settings/Plans';
import BillingSettings from '@/pages/settings/Billing';
import ApiKeysSettings from '@/pages/settings/ApiKeys';
import UsageSettings from '@/pages/settings/Usage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Register />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/register" element={<Register />} />
              <Route path="/accept-invitation/:invitationId" element={<AcceptInvitation />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/system-testing" element={
                <ProtectedRoute>
                  <SystemTestingPage />
                </ProtectedRoute>
              } />
              
              {/* Agent routes - each specific route */}
              <Route path="/agent/:agentId" element={
                <ProtectedRoute>
                  <AgentEnvironment />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/analytics" element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/sources" element={
                <ProtectedRoute>
                  <SourcesPage />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/sources/:sourceId" element={
                <ProtectedRoute>
                  <SourceDetailPage />
                </ProtectedRoute>
              } />
              
              {/* New route for website source details */}
              <Route path="/agent/:agentId/sources/website/:sourceId" element={
                <ProtectedRoute>
                  <SourceDetailPage />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/actions" element={
                <ProtectedRoute>
                  <ActionsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/activity" element={
                <ProtectedRoute>
                  <ActivityPage />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/activity/leads" element={
                <ProtectedRoute>
                  <LeadsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/integrations" element={
                <ProtectedRoute>
                  <IntegrationsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/management" element={
                <ProtectedRoute>
                  <ManagementPage />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/settings/*" element={
                <ProtectedRoute>
                  <AgentSettingsPage />
                </ProtectedRoute>
              } />
              
              {/* Settings routes */}
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }>
                <Route index element={<GeneralSettings />} />
                <Route path="general" element={<GeneralSettings />} />
                <Route path="members" element={<MembersSettings />} />
                <Route path="plans" element={<PlansSettings />} />
                <Route path="billing" element={<BillingSettings />} />
                <Route path="api-keys" element={<ApiKeysSettings />} />
                <Route path="usage" element={<UsageSettings />} />
              </Route>
              
              <Route path="/chat/:agentId" element={<EmbeddedChat />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;


import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { TrainingNotificationProvider } from './components/layout/TrainingNotificationProvider';
import LoginPage from './pages/SignIn';
import DashboardPage from './pages/Dashboard';
import AgentPage from './pages/AgentEnvironment';
import ManagementPage from './pages/ManagementPage';
import SettingsPage from './pages/Settings';
import SourcesPage from './pages/SourcesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import WebsitesSourcePage from './pages/SourcesPage';
import DocumentsSourcePage from './pages/SourcesPage';
import KnowledgeBaseSourcePage from './pages/SourcesPage';
import ChatHistoryPage from './pages/ActivityPage';
import AgentSettingsPage from './pages/AgentSettingsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import LeadsPage from './pages/LeadsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MonitoringDashboard } from './components/monitoring/MonitoringDashboard';

const queryClient = new QueryClient();

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TrainingNotificationProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <AuthProvider>
                    <Navigate to="/dashboard" replace />
                  </AuthProvider>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <AuthProvider>
                    <DashboardPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/agent/:agentId"
                element={
                  <AuthProvider>
                    <AgentPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/agent/:agentId/analytics"
                element={
                  <AuthProvider>
                    <AnalyticsPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/agent/:agentId/activity"
                element={
                  <AuthProvider>
                    <ChatHistoryPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/agent/:agentId/activity/leads"
                element={
                  <AuthProvider>
                    <LeadsPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/agent/:agentId/integrations"
                element={
                  <AuthProvider>
                    <IntegrationsPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/agent/:agentId/sources"
                element={
                  <AuthProvider>
                    <SourcesPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/agent/:agentId/settings/*"
                element={
                  <AuthProvider>
                    <AgentSettingsPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/agent/:agentId/management"
                element={
                  <AuthProvider>
                    <ManagementPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/settings/*"
                element={
                  <AuthProvider>
                    <SettingsPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/sources/:agentId"
                element={
                  <AuthProvider>
                    <SourcesPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/sources/:agentId/websites"
                element={
                  <AuthProvider>
                    <WebsitesSourcePage />
                  </AuthProvider>
                }
              />
              <Route
                path="/sources/:agentId/documents"
                element={
                  <AuthProvider>
                    <DocumentsSourcePage />
                  </AuthProvider>
                }
              />
              <Route
                path="/sources/:agentId/knowledge-base"
                element={
                  <AuthProvider>
                    <KnowledgeBaseSourcePage />
                  </AuthProvider>
                }
              />
              <Route
                path="/chat-history"
                element={
                  <AuthProvider>
                    <ChatHistoryPage />
                  </AuthProvider>
                }
              />
              <Route path="/monitoring" element={<MonitoringDashboard />} />
              {/* System testing route removed - functionality moved to monitoring dashboard */}
            </Routes>
          </BrowserRouter>
        </TrainingNotificationProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;

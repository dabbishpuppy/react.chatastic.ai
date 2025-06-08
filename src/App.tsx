import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { TrainingNotificationProvider } from './contexts/TrainingNotificationContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AgentPage from './pages/AgentPage';
import ManagementPage from './pages/ManagementPage';
import SettingsPage from './pages/SettingsPage';
import SourcesPage from './pages/SourcesPage';
import WebsitesSourcePage from './pages/sources/WebsitesSourcePage';
import DocumentsSourcePage from './pages/sources/DocumentsSourcePage';
import KnowledgeBaseSourcePage from './pages/sources/KnowledgeBaseSourcePage';
import ChatHistoryPage from './pages/ChatHistoryPage';
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
                path="/agent/:agentId/management"
                element={
                  <AuthProvider>
                    <ManagementPage />
                  </AuthProvider>
                }
              />
              <Route
                path="/settings"
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
              {/* Remove the system testing route */}
              {/* <Route path="/system-testing" element={<SystemTestingPage />} /> */}
            </Routes>
          </BrowserRouter>
        </TrainingNotificationProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;

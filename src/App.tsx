
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { TrainingNotificationProvider } from "@/components/layout/TrainingNotificationProvider";

// Import pages
import DashboardPage from "@/pages/Dashboard";
import SourcesPage from "@/pages/SourcesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ActionsPage from "@/pages/ActionsPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import ActivityPage from "@/pages/ActivityPage";
import Settings from "@/pages/Settings";
import AgentSettingsPage from "@/pages/AgentSettingsPage";
import ManagementPage from "@/pages/ManagementPage";
import MonitoringPage from "@/pages/MonitoringPage";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TrainingNotificationProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                
                {/* Agent Routes */}
                <Route path="/agent/:agentId/sources" element={
                  <ProtectedRoute>
                    <SourcesPage />
                  </ProtectedRoute>
                } />
                <Route path="/agent/:agentId/analytics" element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                } />
                <Route path="/agent/:agentId/actions" element={
                  <ProtectedRoute>
                    <ActionsPage />
                  </ProtectedRoute>
                } />
                <Route path="/agent/:agentId/integrations" element={
                  <ProtectedRoute>
                    <IntegrationsPage />
                  </ProtectedRoute>
                } />
                <Route path="/agent/:agentId/activity" element={
                  <ProtectedRoute>
                    <ActivityPage />
                  </ProtectedRoute>
                } />
                <Route path="/agent/:agentId/management" element={
                  <ProtectedRoute>
                    <ManagementPage />
                  </ProtectedRoute>
                } />
                
                {/* Agent Settings Routes */}
                <Route path="/agent/:agentId/settings/*" element={
                  <ProtectedRoute>
                    <AgentSettingsPage />
                  </ProtectedRoute>
                } />
                
                {/* Settings Routes */}
                <Route path="/settings/*" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                
                {/* Monitoring Route */}
                <Route path="/monitoring" element={
                  <ProtectedRoute>
                    <MonitoringPage />
                  </ProtectedRoute>
                } />
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
            <Toaster />
          </Router>
        </TrainingNotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

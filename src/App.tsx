
import React from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

// Import pages
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Usage from "./pages/Usage";
import NotFound from "./pages/NotFound";
import EmbeddedChat from "./pages/EmbeddedChat";
import AgentEnvironment from "./pages/AgentEnvironment";
import ActivityPage from "./pages/ActivityPage";
import LeadsPage from "./pages/LeadsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SourcesPage from "./pages/SourcesPage";
import SourceDetailPage from "./pages/SourceDetailPage";
import ActionsPage from "./pages/ActionsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import AgentSettingsPage from "./pages/AgentSettingsPage";

// Import settings components
import GeneralSettings from "./pages/settings/General";
import MembersSettings from "./pages/settings/Members";
import PlansSettings from "./pages/settings/Plans";
import BillingSettings from "./pages/settings/Billing";
import ApiKeysSettings from "./pages/settings/ApiKeys";
import UsageSettings from "./pages/settings/Usage";

// Import components
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-gray-50">
            <Toaster />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/embed/:agentId" element={<EmbeddedChat />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              
              {/* Settings Routes with nested structure */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>}>
                <Route path="general" element={<GeneralSettings />} />
                <Route path="members" element={<MembersSettings />} />
                <Route path="plans" element={<PlansSettings />} />
                <Route path="billing" element={<BillingSettings />} />
                <Route path="api-keys" element={<ApiKeysSettings />} />
                <Route path="usage" element={<UsageSettings />} />
              </Route>
              
              <Route path="/usage" element={<ProtectedRoute><Usage /></ProtectedRoute>} />
              
              {/* Agent Routes */}
              <Route path="/agent/:agentId" element={<ProtectedRoute><AgentEnvironment /></ProtectedRoute>} />
              <Route path="/agent/:agentId/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
              <Route path="/agent/:agentId/activity/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
              <Route path="/agent/:agentId/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/agent/:agentId/sources" element={<ProtectedRoute><SourcesPage /></ProtectedRoute>} />
              <Route path="/agent/:agentId/sources/:sourceId" element={<ProtectedRoute><SourceDetailPage /></ProtectedRoute>} />
              <Route path="/agent/:agentId/actions" element={<ProtectedRoute><ActionsPage /></ProtectedRoute>} />
              <Route path="/agent/:agentId/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
              <Route path="/agent/:agentId/settings/*" element={<ProtectedRoute><AgentSettingsPage /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

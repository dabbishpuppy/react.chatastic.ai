
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import GeneralSettings from "./pages/settings/General";
import MembersSettings from "./pages/settings/Members";
import PlansSettings from "./pages/settings/Plans";
import BillingSettings from "./pages/settings/Billing";
import ApiKeys from "./pages/settings/ApiKeys";
import AgentEnvironment from "./pages/AgentEnvironment";
import ActivityPage from "./pages/ActivityPage";
import LeadsPage from "./pages/LeadsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SourcesPage from "./pages/SourcesPage";
import ActionsPage from "./pages/ActionsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import AgentSettingsPage from "./pages/AgentSettingsPage";
import ChatbotDemo from "./pages/ChatbotDemo";
import EmbeddedChat from "./pages/EmbeddedChat"; // Add import for the new page

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/signin" element={<SignIn />} />
              
              {/* All dashboard routes are now protected */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* All agent routes */}
              <Route path="/agent/:agentId" element={
                <ProtectedRoute>
                  <AgentEnvironment />
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
              
              {/* Agent Settings Routes - Using wildcard for nested routes */}
              <Route path="/agent/:agentId/settings/*" element={
                <ProtectedRoute>
                  <AgentSettingsPage />
                </ProtectedRoute>
              } />
              
              {/* Admin Settings Routes */}
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
                <Route path="api-keys" element={<ApiKeys />} />
              </Route>
              
              {/* Public demo route */}
              <Route path="/chatbot" element={<ChatbotDemo />} />
              
              {/* Embedded chat route - public, no authentication required */}
              <Route path="/embed/:agentId" element={<EmbeddedChat />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

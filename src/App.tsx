
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import GeneralSettings from "./pages/settings/General";
import MembersSettings from "./pages/settings/Members";
import PlansSettings from "./pages/settings/Plans";
import BillingSettings from "./pages/settings/Billing";
import ApiKeys from "./pages/settings/ApiKeys";
import UsageSettings from "./pages/settings/Usage";
import AgentEnvironment from "./pages/AgentEnvironment";
import UsagePage from "./pages/Usage";
import ActivityPage from "./pages/ActivityPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SourcesPage from "./pages/SourcesPage";
import ActionsPage from "./pages/ActionsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import AgentSettingsPage from "./pages/AgentSettingsPage";
import CreateTeamPage from "./pages/CreateTeamPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/register" element={<Register />} />
            <Route path="/create-team" element={
              <ProtectedRoute>
                <CreateTeamPage />
              </ProtectedRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/usage" element={
              <ProtectedRoute>
                <UsagePage />
              </ProtectedRoute>
            } />
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
              <Route path="usage" element={<UsageSettings />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

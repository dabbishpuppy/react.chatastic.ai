
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageTransition from "@/components/layout/PageTransition";
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
                <PageTransition>
                  <CreateTeamPage />
                </PageTransition>
              </ProtectedRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              </ProtectedRoute>
            } />
            
            {/* Team-specific dashboard route */}
            <Route path="/dashboard/:teamName" element={
              <ProtectedRoute>
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              </ProtectedRoute>
            } />
            
            <Route path="/usage" element={
              <ProtectedRoute>
                <PageTransition>
                  <UsagePage />
                </PageTransition>
              </ProtectedRoute>
            } />
            <Route path="/agent/:agentId" element={
              <ProtectedRoute>
                <PageTransition>
                  <AgentEnvironment />
                </PageTransition>
              </ProtectedRoute>
            } />
            <Route path="/agent/:agentId/activity" element={
              <ProtectedRoute>
                <PageTransition>
                  <ActivityPage />
                </PageTransition>
              </ProtectedRoute>
            } />
            <Route path="/agent/:agentId/analytics" element={
              <ProtectedRoute>
                <PageTransition>
                  <AnalyticsPage />
                </PageTransition>
              </ProtectedRoute>
            } />
            <Route path="/agent/:agentId/sources" element={
              <ProtectedRoute>
                <PageTransition>
                  <SourcesPage />
                </PageTransition>
              </ProtectedRoute>
            } />
            <Route path="/agent/:agentId/actions" element={
              <ProtectedRoute>
                <PageTransition>
                  <ActionsPage />
                </PageTransition>
              </ProtectedRoute>
            } />
            <Route path="/agent/:agentId/integrations" element={
              <ProtectedRoute>
                <PageTransition>
                  <IntegrationsPage />
                </PageTransition>
              </ProtectedRoute>
            } />
            
            {/* Agent Settings Routes - Using wildcard for nested routes */}
            <Route path="/agent/:agentId/settings/*" element={
              <ProtectedRoute>
                <PageTransition>
                  <AgentSettingsPage />
                </PageTransition>
              </ProtectedRoute>
            } />
            
            {/* Admin Settings Routes */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <PageTransition>
                  <Settings />
                </PageTransition>
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

            {/* Redirect /signout to /signin and handle the logout logic in the component */}
            <Route path="/signout" element={<Navigate to="/signin" replace />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

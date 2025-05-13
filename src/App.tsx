
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import UsagePage from "./pages/Usage";
import ActivityPage from "./pages/ActivityPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SourcesPage from "./pages/SourcesPage";
import ActionsPage from "./pages/ActionsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import AgentSettingsPage from "./pages/AgentSettingsPage";
import GeneralSettings as AgentGeneralSettings from "./components/agent/settings/GeneralSettings";
import AISettings from "./components/agent/settings/AISettings";
import ChatInterfaceSettings from "./components/agent/settings/ChatInterfaceSettings";
import SecuritySettings from "./components/agent/settings/SecuritySettings";
import LeadsSettings from "./components/agent/settings/LeadsSettings";
import NotificationsSettings from "./components/agent/settings/NotificationsSettings";
import CustomDomainsSettings from "./components/agent/settings/CustomDomainsSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/agent/:agentId" element={<AgentEnvironment />} />
          <Route path="/agent/:agentId/activity" element={<ActivityPage />} />
          <Route path="/agent/:agentId/analytics" element={<AnalyticsPage />} />
          <Route path="/agent/:agentId/sources" element={<SourcesPage />} />
          <Route path="/agent/:agentId/actions" element={<ActionsPage />} />
          <Route path="/agent/:agentId/integrations" element={<IntegrationsPage />} />
          
          {/* Agent Settings Routes */}
          <Route path="/agent/:agentId/settings" element={<AgentSettingsPage />}>
            <Route index element={<AgentGeneralSettings />} />
            <Route path="general" element={<AgentGeneralSettings />} />
            <Route path="ai" element={<AISettings />} />
            <Route path="chat-interface" element={<ChatInterfaceSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="leads" element={<LeadsSettings />} />
            <Route path="notifications" element={<NotificationsSettings />} />
            <Route path="custom-domains" element={<CustomDomainsSettings />} />
          </Route>
          
          {/* Admin Settings Routes */}
          <Route path="/settings" element={<Settings />}>
            <Route index element={<GeneralSettings />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="members" element={<MembersSettings />} />
            <Route path="plans" element={<PlansSettings />} />
            <Route path="billing" element={<BillingSettings />} />
            <Route path="api-keys" element={<ApiKeys />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

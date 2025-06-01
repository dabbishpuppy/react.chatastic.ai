
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
import Settings from '@/pages/Settings';
import EmbeddedChat from '@/pages/EmbeddedChat';
import NotFound from '@/pages/NotFound';
import AcceptInvitation from '@/pages/AcceptInvitation';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/register" element={<Register />} />
              <Route path="/accept-invitation/:invitationId" element={<AcceptInvitation />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/agent/:agentId/*" element={
                <ProtectedRoute>
                  <AgentEnvironment />
                </ProtectedRoute>
              } />
              
              <Route path="/settings/*" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              
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

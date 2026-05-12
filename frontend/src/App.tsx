import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemeColorProvider } from "@/hooks/use-theme-color";
import { TranslationProvider } from "@/hooks/use-translation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { DocumentTypeProvider } from "./pages/context/DocumentTypeContext";
import { VerificationProvider } from './components/contexts/VerificationContext';
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from './components/contexts/AuthContext';
import { AppearanceProvider } from './components/contexts/AppearanceContext';
import { AppearanceCSSInjector } from './components/AppearanceCSSInjector';
import { RoleGuard } from './components/RoleGuard';
import Login from './pages/Login';

import Index from "./pages/Index";
import Verification from "./pages/Verification";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import ManageId from "./pages/ManageId";
import DocumentDetails from "./pages/DocumentDetails";
import VerificationLogs from "./pages/VerificationLogs";
import NotFound from "./pages/NotFound";
import ManageConfiguration from "./pages/ManageConfiguration";
import ManageSubscriptions from "./pages/ManageSubscriptions";
import ManageTenants from "./pages/ManageTenants";
import UsageDashboard from "./pages/UsageDashboard";
import { useAuth } from './components/contexts/AuthContext';

const BASE_URL = import.meta.env.VITE_BASE_URL || '/projects/acufi-qa/frontend';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Wrapper component to handle auth redirects
function AuthWrapper() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Store the attempted URL to redirect back after login
    const redirectPath = location.pathname.replace(BASE_URL, '');
    return <Navigate to="/login" state={{ from: redirectPath }} replace />;
  }
  
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

// Component for routing logic that needs auth context
function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const from = location.state?.from || '/';

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {/* Login route with redirect if already authenticated */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to={from} replace /> : 
              <Login />
          } 
        />
        
        {/* Protected routes wrapped with AuthWrapper */}
        <Route element={<AuthWrapper />}>
          {/* Default route - accessible by all authenticated users */}
          <Route
            path="/"
            element={
              <RoleGuard allowedRoles={['product_owner', 'admin', 'operator']}>
                <DocumentTypeProvider>
                  <VerificationProvider>
                    <Verification />
                  </VerificationProvider>
                </DocumentTypeProvider>
              </RoleGuard>
            }
          />

          {/* Routes accessible by product_owner and admin only */}
          <Route
            path="/manage-id"
            element={
              <RoleGuard allowedRoles={['product_owner', 'admin']}>
                <DocumentTypeProvider>
                  <ManageId />
                </DocumentTypeProvider>
              </RoleGuard>
            }
          />
          
          <Route
            path="/document-details/:id"
            element={
              <RoleGuard allowedRoles={['product_owner', 'admin']}>
                <DocumentTypeProvider>
                  <DocumentDetails />
                </DocumentTypeProvider>
              </RoleGuard>
            }
          />
          
          <Route
            path="/manage-configuration"
            element={
              <RoleGuard allowedRoles={['product_owner', 'admin']}>
                <DocumentTypeProvider>
                  <ManageConfiguration />
                </DocumentTypeProvider>
              </RoleGuard>
            }
          />
          
          <Route
            path="/usage-dashboard"
            element={
              <RoleGuard allowedRoles={['product_owner', 'admin']}>
                <UsageDashboard />
              </RoleGuard>
            }
          />
          
          <Route
            path="/verification-logs"
            element={
              <RoleGuard allowedRoles={['product_owner', 'admin']}>
                <DocumentTypeProvider>
                  <VerificationLogs />
                </DocumentTypeProvider>
              </RoleGuard>
            }
          />
          
          {/* Routes accessible by product_owner only */}
          <Route
            path="/settings"
            element={
              <RoleGuard allowedRoles={['product_owner']}>
                <Settings />
              </RoleGuard>
            }
          />
          
          <Route
            path="/manage-subscriptions"
            element={
              <RoleGuard allowedRoles={['product_owner']}>
                <ManageSubscriptions />
              </RoleGuard>
            }
          />
          
          <Route
            path="/manage-tenants"
            element={
              <RoleGuard allowedRoles={['product_owner']}>
                <ManageTenants />
              </RoleGuard>
            }
          />
          
          {/* Routes accessible by all authenticated users */}
          <Route
            path="/verification"
            element={
              <RoleGuard allowedRoles={['product_owner', 'admin', 'operator']}>
                <DocumentTypeProvider>
                  <VerificationProvider>
                    <Verification />
                  </VerificationProvider>
                </DocumentTypeProvider>
              </RoleGuard>
            }
          />
          
          <Route
            path="/help"
            element={
              <RoleGuard allowedRoles={['product_owner', 'admin', 'operator']}>
                <Help />
              </RoleGuard>
            }
          />
        </Route>

        {/* Catch all route - redirect to login if not authenticated */}
        <Route 
          path="*" 
          element={
            isAuthenticated ? 
              <NotFound /> : 
              <Navigate to="/login" state={{ from: location.pathname.replace(BASE_URL, '') }} replace />
          } 
        />
      </Routes>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TranslationProvider>
        <AuthProvider>
          <AppearanceProvider>
            <ThemeColorProvider>
              <AppearanceCSSInjector />
              <BrowserRouter basename={BASE_URL}>
                <AppRoutes />
                <Toaster />
              </BrowserRouter>
            </ThemeColorProvider>
          </AppearanceProvider>
        </AuthProvider>
      </TranslationProvider>
    </ThemeProvider>
  );
}

export default App;

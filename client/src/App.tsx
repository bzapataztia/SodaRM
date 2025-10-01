import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import ProtectedRoute from "./components/protected-route";

// Auth pages
import LoginPage from "./pages/auth/login";
import SignupPage from "./pages/auth/signup";

// App pages
import DashboardPage from "./pages/dashboard";
import ContractsPage from "./pages/contracts";
import InvoicesPage from "./pages/invoices";
import InvoiceDetailPage from "./pages/invoice-detail";
import PaymentsPage from "./pages/payments";
import PropertiesPage from "./pages/properties";
import ContactsPage from "./pages/contacts";
import InsurersPage from "./pages/insurers";
import OCRInboxPage from "./pages/ocr-inbox";
import SettingsPage from "./pages/settings";
import NotFound from "./pages/not-found";

function AppRouter() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {token ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/signup">
        {token ? <Redirect to="/" /> : <SignupPage />}
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/contracts">
        <ProtectedRoute>
          <ContractsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/invoices">
        <ProtectedRoute>
          <InvoicesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/invoices/:id">
        <ProtectedRoute>
          <InvoiceDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/payments">
        <ProtectedRoute>
          <PaymentsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/properties">
        <ProtectedRoute>
          <PropertiesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/contacts">
        <ProtectedRoute>
          <ContactsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/insurers">
        <ProtectedRoute>
          <InsurersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/ocr-inbox">
        <ProtectedRoute>
          <OCRInboxPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useAuth } from "./hooks/useAuth";

// Pages
import LandingPage from "./pages/landing";
import OnboardingPage from "./pages/onboarding";
import DashboardPage from "./pages/dashboard";
import ContractsPage from "./pages/contracts";
import InvoicesPage from "./pages/invoices";
import InvoiceDetailPage from "./pages/invoice-detail";
import PaymentsPage from "./pages/payments";
import PropertiesPage from "./pages/properties";
import ContactsPage from "./pages/contacts";
import InsurersPage from "./pages/insurers";
import PoliciesPage from "./pages/policies";
import OCRInboxPage from "./pages/ocr-inbox";
import SettingsPage from "./pages/settings";
import SearchPage from "./pages/search";
import NotFound from "./pages/not-found";

function AppRouter() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (needsOnboarding) {
    return <OnboardingPage />;
  }

  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/contracts" component={ContractsPage} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/invoices/:id" component={InvoiceDetailPage} />
      <Route path="/payments" component={PaymentsPage} />
      <Route path="/properties" component={PropertiesPage} />
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/insurers" component={InsurersPage} />
      <Route path="/policies" component={PoliciesPage} />
      <Route path="/ocr-inbox" component={OCRInboxPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SidebarProvider>
          <AppRouter />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ChartProvider } from "./contexts/ChartContext";
import { TradingProvider } from "./contexts/TradingContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPortal from "./pages/AdminPortal";
import UserDetails from "./pages/UserDetails";
import Deposit from "./pages/Deposit";
import Trade from "./pages/Trade";
import BinaryOptions from "./pages/BinaryOptions";
import Withdrawal from "./pages/Withdrawal";
import Saque from "./pages/Saque";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import History from "./pages/History";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/login" component={Login} />
      <Route path="/terms" component={Terms} />
      <Route path="/admin-portal" component={AdminPortal} />
      <Route path="/user-details" component={UserDetails} />

      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/admin">
        {() => (
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/trade">
        {() => (
          <ProtectedRoute>
            <Trade />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/binary">
        {() => (
          <ProtectedRoute>
            <BinaryOptions />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/deposit">
        {() => (
          <ProtectedRoute>
            <Deposit />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/withdrawal">
        {() => (
          <ProtectedRoute>
            <Withdrawal />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/saque">
        {() => (
          <ProtectedRoute>
            <Saque />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/history">
        {() => (
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TradingProvider>
            <ChartProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </ChartProvider>
          </TradingProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

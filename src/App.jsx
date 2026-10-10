import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/Layout';
import { MachineProvider } from '@/services/machineStore';
import Dashboard from '@/pages/Dashboard';
import ManualControl from '@/pages/ManualControl';

import Station3D from '@/pages/Station3D';
import Drone from '@/pages/Drone';
import Charging from '@/pages/Charging';
import Sensors from '@/pages/Sensors';
import ConsolePage from '@/pages/Console';
import Jobs from '@/pages/Jobs';
import History from '@/pages/History';
import Alarms from '@/pages/Alarms';
import Calibration from '@/pages/Calibration';
import Connection from '@/pages/Connection';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <MachineProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/manual" element={<ManualControl />} />

            <Route path="/station3d" element={<Station3D />} />
            <Route path="/drone" element={<Drone />} />
            <Route path="/charging" element={<Charging />} />
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/console" element={<ConsolePage />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/history" element={<History />} />
            <Route path="/alarms" element={<Alarms />} />
            <Route path="/calibration" element={<Calibration />} />
            <Route path="/connection" element={<Connection />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </MachineProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import LoadingScreen from "./components/LoadingScreen";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Doctors = lazy(() => import("./pages/Doctors"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Transfer = lazy(() => import("./pages/Transfer"));
const Deposit = lazy(() => import("./pages/Deposit"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Consultation = lazy(() => import("./pages/Consultation"));
const AIChat = lazy(() => import("./pages/AIChat"));
const DoctorApplication = lazy(() => import("./pages/DoctorApplication"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Anlize = lazy(() => import("./pages/anlize"));
const Volunteer = lazy(() => import("./pages/Volunteer")); // 👈 تمت الإضافة

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/consultation" element={<Consultation />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/doctor-application" element={<DoctorApplication />} />
            <Route path="/anlize" element={<Anlize />} />
            <Route path="/volunteer" element={<Volunteer />} /> {/* 👈 هنا الرابط الجديد */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
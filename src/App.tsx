import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthContext, useAuthState } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Alumnos from "./pages/Alumnos";
import Niveles from "./pages/Niveles";
import Representantes from "./pages/Representantes";
import Horarios from "./pages/Horarios";
import Pagos from "./pages/Pagos";
import Evaluaciones from "./pages/Evaluaciones";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import ConfiguracionAvanzada from "./pages/ConfiguracionAvanzada";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UnlockAccount from "./pages/UnlockAccount";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unlock-account" element={<UnlockAccount />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alumnos" element={<Alumnos />} />
            <Route path="/niveles" element={<Niveles />} />
            <Route path="/representantes" element={<Representantes />} />
            <Route path="/horarios" element={<Horarios />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/evaluaciones" element={<Evaluaciones />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/configuracion-avanzada" element={<ConfiguracionAvanzada />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

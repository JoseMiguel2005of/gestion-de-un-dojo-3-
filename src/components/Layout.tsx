import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { toast } from "@/hooks/use-toast";

export function Layout() {
  const navigate = useNavigate();
  const { user, loading, logout, isAuthenticated } = useAuth();
  const { loadTheme } = useTheme();
  const { isEnglish } = useLanguage();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [loading, isAuthenticated, navigate]);

  // Cargar tema al montar el componente
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const handleLogout = async () => {
    try {
      logout();
      toast({
        title: isEnglish ? "Session closed" : "Sesión cerrada",
        description: isEnglish ? "See you soon" : "Hasta pronto",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: isEnglish ? "Could not close session" : "No se pudo cerrar sesión",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-950">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                {isEnglish ? "Dojo Management System" : "Sistema de Gestión de Dojo"}
              </h1>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="gap-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
              {isEnglish ? "Sign Out" : "Cerrar Sesión"}
            </Button>
          </header>
          <main className="flex-1 p-8 overflow-auto bg-gray-50 dark:bg-gray-950">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
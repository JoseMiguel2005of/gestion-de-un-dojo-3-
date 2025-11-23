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
      <div className="flex min-h-screen w-full bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900 dark:from-black dark:via-indigo-950 dark:to-black">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between backdrop-blur-xl bg-white/10 dark:bg-black/20 border-b border-white/20 px-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-white hover:bg-white/20" />
              <h1 className="text-xl font-bold text-white">{isEnglish ? "Dojo Management System" : "Sistema de Gestión de Dojo"}</h1>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
            >
              <LogOut className="h-4 w-4" />
              {isEnglish ? "Sign Out" : "Cerrar Sesión"}
            </Button>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
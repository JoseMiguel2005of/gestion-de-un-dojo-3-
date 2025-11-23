import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, logout, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/auth");
    } else if (user) {
      setProfile({
        id: user.id,
        username: user.username,
        nombre_completo: user.nombre_completo,
        rol: user.rol
      });
    }
  }, [user, loading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    try {
      logout();
      toast({
        title: "Sesión cerrada",
        description: "Hasta pronto",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión",
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">¡Bienvenido al Dojo!</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Sistema de Gestión y Administración
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>

        {/* Profile Card */}
        {profile && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Información del Usuario
              </CardTitle>
              <CardDescription>
                Detalles de tu cuenta y permisos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium">Nombre Completo</h4>
                  <p className="text-muted-foreground">{profile.nombre_completo}</p>
                </div>
                <div>
                  <h4 className="font-medium">Usuario</h4>
                  <p className="text-muted-foreground">{profile.username}</p>
                </div>
                <div>
                  <h4 className="font-medium">Rol</h4>
                  <p className="text-muted-foreground capitalize">{profile.rol}</p>
                </div>
                <div>
                  <h4 className="font-medium">ID</h4>
                  <p className="text-muted-foreground">{profile.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate("/alumnos")}>
            <CardHeader>
              <CardTitle>Gestionar Alumnos</CardTitle>
              <CardDescription>
                Administra la información de los estudiantes
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate("/niveles")}>
            <CardHeader>
              <CardTitle>Niveles y Cintas</CardTitle>
              <CardDescription>
                Configura los niveles de judo y cintas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate("/representantes")}>
            <CardHeader>
              <CardTitle>Representantes</CardTitle>
              <CardDescription>
                Gestiona padres y tutores
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate("/evaluaciones")}>
            <CardHeader>
              <CardTitle>Evaluaciones</CardTitle>
              <CardDescription>
                Crea y gestiona evaluaciones
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate("/reportes")}>
            <CardHeader>
              <CardTitle>Reportes</CardTitle>
              <CardDescription>
                Visualiza estadísticas y reportes
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate("/configuracion")}>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
              <CardDescription>
                Ajustes del sistema
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/api";
import dojoBackground from "@/assets/dojo-bg.jpg";

const UnlockAccount = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isEnglish } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [unlockCode, setUnlockCode] = useState("");

  useEffect(() => {
    // Si viene email por parámetro, usarlo
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Forzar tema oscuro siempre en la página de desbloqueo
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Forzar tema oscuro inmediatamente
    root.classList.add('dark');
    body.classList.add('dark');
    
    // Crear un observer para mantener el tema oscuro incluso si otros efectos lo cambian
    const observer = new MutationObserver(() => {
      if (!root.classList.contains('dark')) {
        root.classList.add('dark');
      }
      if (!body.classList.contains('dark')) {
        body.classList.add('dark');
      }
    });
    
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Verificar periódicamente
    const interval = setInterval(() => {
      if (!root.classList.contains('dark')) {
        root.classList.add('dark');
      }
      if (!body.classList.contains('dark')) {
        body.classList.add('dark');
      }
    }, 100);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const unlockSchema = z.object({
    email: z.string().email({ 
      message: isEnglish ? "Email must be valid" : "Email debe ser válido" 
    }),
    unlockCode: z.string().length(6, { 
      message: isEnglish ? "Code must be 6 digits" : "El código debe tener 6 dígitos" 
    }),
  });

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = unlockSchema.parse({
        email,
        unlockCode,
      });

      setLoading(true);

      // Verificar el código de desbloqueo
      await api.verifyUnlockCode(validated.email, validated.unlockCode);

      toast({
        title: isEnglish ? "Account unlocked!" : "¡Cuenta desbloqueada!",
        description: isEnglish 
          ? "Your account has been unlocked. You can now log in." 
          : "Tu cuenta ha sido desbloqueada. Ahora puedes iniciar sesión.",
      });

      // Redirigir al login después de desbloquear
      setTimeout(() => {
        navigate(`/auth?email=${encodeURIComponent(email)}`);
      }, 1500);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: isEnglish ? "Validation error" : "Error de validación",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: isEnglish ? "Error" : "Error",
          description: error instanceof Error ? error.message : (isEnglish ? "Could not verify code" : "No se pudo verificar el código"),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast({
        title: isEnglish ? "Email required" : "Email requerido",
        description: isEnglish ? "Please enter your email first" : "Por favor ingresa tu email primero",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await api.resendUnlockCode(email);
      toast({
        title: isEnglish ? "Code sent" : "Código enviado",
        description: isEnglish ? "Unlock code has been resent to your email" : "Se ha reenviado el código de desbloqueo a tu correo",
      });
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not resend code" : "No se pudo reenviar el código"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${dojoBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-red-900/40" />
      </div>

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 text-6xl opacity-10 select-none">🔒</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-10 select-none">🔒</div>

      {/* Unlock Account Card */}
      <Card className="w-full max-w-md mx-4 backdrop-blur-sm bg-card/95 border-border/50 shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="flex justify-center mb-4">
            <Lock className="h-12 w-12 text-amber-500" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            {isEnglish ? "Unlock Account" : "Desbloquear Cuenta"}
          </CardTitle>
          <CardDescription className="text-base">
            {isEnglish 
              ? "Your account has been locked. Enter your email and unlock code to continue."
              : "Tu cuenta ha sido bloqueada. Ingresa tu email y código de desbloqueo para continuar."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={isEnglish ? "your@email.com" : "tu@email.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unlockCode">
                {isEnglish ? "Unlock Code" : "Código de Desbloqueo"}
              </Label>
              <Input
                id="unlockCode"
                type="text"
                placeholder={isEnglish ? "Enter 6-digit code" : "Ingresa código de 6 dígitos"}
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                disabled={loading}
                className="text-center text-3xl tracking-widest font-mono h-16"
              />
              <p className="text-xs text-muted-foreground">
                {isEnglish 
                  ? "Enter the 6-digit code sent to your email"
                  : "Ingresa el código de 6 dígitos enviado a tu correo"
                }
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEnglish ? "Unlock Account" : "Desbloquear Cuenta"}
            </Button>

            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={loading || !email}
                className="w-full text-xs"
              >
                {isEnglish ? "Resend code" : "Reenviar código"}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/auth")}
                disabled={loading}
              >
                {isEnglish ? "Back to Login" : "Volver al Login"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnlockAccount;


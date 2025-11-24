import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/api";
import dojoBackground from "@/assets/dojo-bg.jpg";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isEnglish } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Si viene email por parámetro, usarlo
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Forzar tema oscuro siempre en la página de verificación
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const verificationSchema = z.object({
    email: z.string().email({
      message: isEnglish ? "Invalid email format" : "Formato de email inválido",
    }),
    code: z.string().length(6, {
      message: isEnglish ? "Code must be 6 digits" : "El código debe tener 6 dígitos",
    }),
  });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = verificationSchema.parse({
        email,
        code: verificationCode,
      });

      setLoading(true);

      // Verificar el código de email
      await api.verifyEmail(validated.email, validated.code);

      setVerified(true);

      toast({
        title: isEnglish ? "Email verified!" : "¡Email verificado!",
        description: isEnglish 
          ? "Your email has been verified. You can now log in." 
          : "Tu email ha sido verificado. Ahora puedes iniciar sesión.",
      });

      // Redirigir al login después de verificar
      setTimeout(() => {
        navigate(`/auth?email=${encodeURIComponent(email)}`);
      }, 2000);
      
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
        description: isEnglish ? "Please enter your email address" : "Por favor, ingresa tu dirección de email",
        variant: "destructive",
      });
      return;
    }

    try {
      setResending(true);
      await api.resendVerificationCode(email);
      
      toast({
        title: isEnglish ? "Code resent!" : "¡Código reenviado!",
        description: isEnglish 
          ? "A new verification code has been sent to your email" 
          : "Se ha enviado un nuevo código de verificación a tu email",
      });
    } catch (error) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error instanceof Error ? error.message : (isEnglish ? "Could not resend code" : "No se pudo reenviar el código"),
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${dojoBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Card className="w-full max-w-md bg-gray-900/95 border-gray-700 text-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">
              {isEnglish ? "Email Verified!" : "¡Email Verificado!"}
            </CardTitle>
            <CardDescription className="text-gray-300">
              {isEnglish 
                ? "Your email has been successfully verified. Redirecting to login..." 
                : "Tu email ha sido verificado exitosamente. Redirigiendo al login..."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${dojoBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Card className="w-full max-w-md bg-gray-900/95 border-gray-700 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-16 w-16 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">
            {isEnglish ? "Verify Your Email" : "Verifica Tu Email"}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {isEnglish 
              ? "We've sent a verification code to your email. Please enter it below." 
              : "Hemos enviado un código de verificación a tu email. Por favor, ingrésalo a continuación."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                {isEnglish ? "Email" : "Email"}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isEnglish ? "your@email.com" : "tu@email.com"}
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">
                {isEnglish ? "Verification Code" : "Código de Verificación"}
              </Label>
              <Input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={isEnglish ? "000000" : "000000"}
                maxLength={6}
                className="bg-gray-800 border-gray-600 text-white text-center text-2xl tracking-widest font-mono"
                required
              />
              <p className="text-xs text-gray-400">
                {isEnglish 
                  ? "Enter the 6-digit code sent to your email" 
                  : "Ingresa el código de 6 dígitos enviado a tu email"}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEnglish ? "Verifying..." : "Verificando..."}
                </>
              ) : (
                isEnglish ? "Verify Email" : "Verificar Email"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending || !email}
                className="text-sm text-amber-400 hover:text-amber-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <>
                    <Loader2 className="inline mr-2 h-3 w-3 animate-spin" />
                    {isEnglish ? "Sending..." : "Enviando..."}
                  </>
                ) : (
                  isEnglish ? "Resend Code" : "Reenviar Código"
                )}
              </button>
            </div>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-sm text-gray-400 hover:text-gray-300 underline"
              >
                {isEnglish ? "Back to Login" : "Volver al Login"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;


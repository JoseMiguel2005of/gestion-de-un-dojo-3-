import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const createRepresentanteSchema = (isEnglish: boolean) => z.object({
  cedula: z.string().min(1, isEnglish ? "ID is required" : "La cédula es requerida"),
  nombre: z.string().min(2, isEnglish ? "Name must have at least 2 characters" : "El nombre debe tener al menos 2 caracteres"),
  apellido: z.string().min(2, isEnglish ? "Last name must have at least 2 characters" : "El apellido debe tener al menos 2 caracteres"),
  telefono: z.string().optional(),
  email: z.string().email(isEnglish ? "Invalid email" : "Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
});

type RepresentanteFormData = z.infer<ReturnType<typeof createRepresentanteSchema>>;

interface RepresentanteFormProps {
  onSuccess: () => void;
}

export function RepresentanteForm({ onSuccess }: RepresentanteFormProps) {
  const { isEnglish } = useLanguage();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RepresentanteFormData>({
    resolver: zodResolver(createRepresentanteSchema(isEnglish)),
  });

  const onSubmit = async (data: RepresentanteFormData) => {
    setLoading(true);
    try {
      await apiClient.createRepresentante({
        cedula: data.cedula,
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
      });

      toast({
        title: isEnglish ? "Success" : "Éxito",
        description: isEnglish ? "Representative registered successfully" : "Representante registrado correctamente",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cedula">{isEnglish ? "ID *" : "Cédula *"}</Label>
        <Input id="cedula" {...register("cedula")} placeholder={isEnglish ? "Ex: 123-45-6789" : "Ej: V-12345678"} />
        {errors.cedula && (
          <p className="text-sm text-destructive">{errors.cedula.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">{isEnglish ? "Name *" : "Nombre *"}</Label>
          <Input id="nombre" {...register("nombre")} />
          {errors.nombre && (
            <p className="text-sm text-destructive">{errors.nombre.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="apellido">{isEnglish ? "Last Name *" : "Apellido *"}</Label>
          <Input id="apellido" {...register("apellido")} />
          {errors.apellido && (
            <p className="text-sm text-destructive">{errors.apellido.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono">{isEnglish ? "Phone" : "Teléfono"}</Label>
          <Input id="telefono" {...register("telefono")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion">{isEnglish ? "Address" : "Dirección"}</Label>
        <Input id="direccion" {...register("direccion")} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEnglish ? "Register Representative" : "Registrar Representante"}
      </Button>
    </form>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { useState, useEffect } from "react";

const representanteSchema = z.object({
  cedula: z.string().min(1, "La cédula es requerida"),
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
});

type RepresentanteFormData = z.infer<typeof representanteSchema>;

interface RepresentanteEditFormProps {
  representanteId: string;
  onSuccess: () => void;
}

export function RepresentanteEditForm({ representanteId, onSuccess }: RepresentanteEditFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RepresentanteFormData>({
    resolver: zodResolver(representanteSchema),
  });

  useEffect(() => {
    fetchRepresentante();
  }, [representanteId]);

  const fetchRepresentante = async () => {
    try {
      const data = await apiClient.getRepresentante(representanteId);

      if (data) {
        setValue("cedula", data.cedula || "");
        setValue("nombre", data.nombre);
        setValue("apellido", data.apellido || "");
        setValue("telefono", data.telefono || "");
        setValue("email", data.email || "");
        setValue("direccion", data.direccion || "");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: RepresentanteFormData) => {
    setLoading(true);
    try {
      await apiClient.updateRepresentante(representanteId, {
        cedula: data.cedula,
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
      });

      toast({
        title: "Éxito",
        description: "Representante actualizado correctamente",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="cedula">Cédula *</Label>
        <Input id="cedula" {...register("cedula")} />
        {errors.cedula && <p className="text-sm text-destructive">{errors.cedula.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" {...register("nombre")} />
          {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
        </div>

        <div>
          <Label htmlFor="apellido">Apellido *</Label>
          <Input id="apellido" {...register("apellido")} />
          {errors.apellido && <p className="text-sm text-destructive">{errors.apellido.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" {...register("telefono")} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" {...register("direccion")} />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Actualizar Representante"}
      </Button>
    </form>
  );
}

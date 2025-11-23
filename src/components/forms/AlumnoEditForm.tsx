import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { useState, useEffect } from "react";

const alumnoSchema = z.object({
  cedula: z.string().min(1, "La cédula es requerida"),
  nombre: z.string().min(1, "El nombre es requerido"),
  fecha_nacimiento: z.string().min(1, "La fecha de nacimiento es requerida"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")).nullable(),
  direccion: z.string().optional(),
  categoria_edad_id: z.string().optional(),
  cinta_id: z.string().optional(),
  representante_id: z.string().optional(),
  estado: z.union([z.boolean(), z.number()]).default(true),
});

type AlumnoFormData = z.infer<typeof alumnoSchema>;

interface AlumnoEditFormProps {
  alumnoId: string;
  onSuccess: () => void;
}

export function AlumnoEditForm({ alumnoId, onSuccess }: AlumnoEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [categoriasEdad, setCategoriasEdad] = useState<any[]>([]);
  const [cintas, setCintas] = useState<any[]>([]);
  const [representantes, setRepresentantes] = useState<any[]>([]);
  const [categoriasPermitidas, setCategoriasPermitidas] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AlumnoFormData>({
    resolver: zodResolver(alumnoSchema),
  });


  const fechaNacimiento = watch("fecha_nacimiento");

  useEffect(() => {
    fetchData();
  }, [alumnoId]);

  useEffect(() => {
    if (fechaNacimiento) {
      filtrarCategoriasPorEdad(fechaNacimiento);
    } else {
      setCategoriasPermitidas([]);
    }
  }, [fechaNacimiento, categoriasEdad]);

  const formatearFecha = (fecha: string): string => {
    // Convertir fecha ISO o cualquier formato a yyyy-MM-dd
    if (!fecha) return '';
    const date = new Date(fecha);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchData = async () => {
    try {
      const alumno = await apiClient.getAlumno(alumnoId);
      const categoriasData = await apiClient.getCategoriasEdad();
      setCategoriasEdad(categoriasData || []);
      const cintasData = await apiClient.getCintas();
      setCintas(cintasData || []);
      const representantesData = await apiClient.getRepresentantes();
      setRepresentantes(representantesData || []);

      if (alumno) {
        const fechaFormateada = formatearFecha(alumno.fecha_nacimiento);
        const edad = calcularEdad(fechaFormateada);

        setValue("cedula", alumno.cedula || "");
        setValue("nombre", alumno.nombre);
        setValue("fecha_nacimiento", fechaFormateada);
        setValue("telefono", alumno.telefono || "");
        setValue("email", alumno.email || "");
        setValue("direccion", alumno.direccion || "");
        setValue("cinta_id", String(alumno.id_cinta || ""));
        setValue("representante_id", String(alumno.representante_id || ""));
        setValue("estado", alumno.estado);

        if (fechaFormateada && categoriasData && categoriasData.length > 0) {
          const filtradas = categoriasData.filter((cat: any) => 
            edad >= (cat.edad_min || 0) && edad <= (cat.edad_max || 150)
          );
          setCategoriasPermitidas(filtradas);

          if ((!alumno.id_categoria_edad || alumno.id_categoria_edad === null) && filtradas.length > 0) {
            setValue("categoria_edad_id", String(filtradas[0].id));
          } else if (alumno.id_categoria_edad) {
            setValue("categoria_edad_id", String(alumno.id_categoria_edad));
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  const calcularEdad = (fechaNac: string): number => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const filtrarCategoriasPorEdad = (fechaNac: string) => {
    if (!fechaNac || categoriasEdad.length === 0) {
      setCategoriasPermitidas([]);
      return;
    }

    const edad = calcularEdad(fechaNac);
    const filtradas = categoriasEdad.filter(cat => 
      edad >= (cat.edad_min || 0) && edad <= (cat.edad_max || 150)
    );
    
    setCategoriasPermitidas(filtradas);

    const categoriaSeleccionada = watch("categoria_edad_id");
    
    if (!categoriaSeleccionada || categoriaSeleccionada === "" || categoriaSeleccionada === "null") {
      if (filtradas.length > 0) {
        setValue("categoria_edad_id", String(filtradas[0].id));
      }
    } else if (categoriaSeleccionada && !filtradas.find(c => String(c.id) === categoriaSeleccionada)) {
      if (filtradas.length > 0) {
        setValue("categoria_edad_id", String(filtradas[0].id));
      } else {
        setValue("categoria_edad_id", "");
      }
      toast({
        title: "Atención",
        description: `La categoría se actualizó automáticamente para la edad del alumno (${edad} años)`,
        variant: "default",
      });
    }
  };

  const onSubmit = async (data: AlumnoFormData) => {
    setLoading(true);
    try {
      const payload = {
        cedula: data.cedula,
        nombre: data.nombre,
        fecha_nacimiento: data.fecha_nacimiento,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
        id_categoria_edad: data.categoria_edad_id ? parseInt(data.categoria_edad_id) : null,
        id_cinta: data.cinta_id ? parseInt(data.cinta_id) : null,
        id_representante: data.representante_id ? parseInt(data.representante_id) : null,
        estado: data.estado === true || data.estado === 1 ? 1 : 0,
      };
      
      await apiClient.updateAlumno(alumnoId, payload);
      
      toast({
        title: "Éxito",
        description: "Alumno actualizado correctamente",
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cedula">Cédula *</Label>
          <Input id="cedula" {...register("cedula")} />
          {errors.cedula && <p className="text-sm text-destructive">{errors.cedula.message}</p>}
        </div>

        <div>
          <Label htmlFor="estado">Estado *</Label>
          <Select value={watch("estado") ? "true" : "false"} onValueChange={(val) => setValue("estado", val === "true")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Activo</SelectItem>
              <SelectItem value="false">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="nombre">Nombre Completo *</Label>
        <Input id="nombre" {...register("nombre")} placeholder="Ej: Juan Pérez" />
        {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
      </div>

      <div>
        <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
        <Input id="fecha_nacimiento" type="date" {...register("fecha_nacimiento")} />
        {errors.fecha_nacimiento && <p className="text-sm text-destructive">{errors.fecha_nacimiento.message}</p>}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoria_edad_id">Categoría de Edad</Label>
          <Select 
            value={watch("categoria_edad_id") || ""} 
            onValueChange={(value) => setValue("categoria_edad_id", value)}
            disabled={!fechaNacimiento || categoriasPermitidas.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !fechaNacimiento 
                  ? "Primero ingrese la fecha de nacimiento" 
                  : categoriasPermitidas.length === 0 
                    ? "No hay categorías disponibles para esta edad"
                    : "Seleccionar categoría"
              } />
            </SelectTrigger>
            <SelectContent>
              {categoriasPermitidas.map((categoria) => (
                <SelectItem key={categoria.id} value={String(categoria.id)}>
                  {categoria.nombre} ({categoria.edad_min}-{categoria.edad_max} años)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fechaNacimiento && categoriasPermitidas.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {calcularEdad(fechaNacimiento)} años - Categorías disponibles para esta edad
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="cinta_id">Cinta</Label>
          <Select 
            value={watch("cinta_id") || ""} 
            onValueChange={(value) => setValue("cinta_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cinta" />
            </SelectTrigger>
            <SelectContent>
              {cintas.map((cinta) => (
                <SelectItem key={cinta.id} value={String(cinta.id)}>
                  {cinta.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div>
          <Label htmlFor="representante_id">Representante</Label>
          <Select value={watch("representante_id") || ""} onValueChange={(value) => setValue("representante_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar representante" />
            </SelectTrigger>
            <SelectContent>
              {representantes.map((rep) => (
                <SelectItem key={rep.id} value={String(rep.id)}>
                  {rep.nombre} {rep.apellido}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Actualizar Alumno"}
      </Button>
    </form>
  );
}

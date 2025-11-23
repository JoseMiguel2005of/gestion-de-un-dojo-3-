import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const createAlumnoSchema = (isEnglish: boolean) => z.object({
  cedula: z.string()
    .min(1, isEnglish ? "ID is required" : "La cédula es requerida")
    .refine((val) => {
      if (isEnglish) {
        return /^\d{3}-?\d{2}-?\d{4}$|^\d{9}$/.test(val);
      } else {
        return /^[VvEeJjGgPp]-?\d{7,8}$/.test(val);
      }
    }, isEnglish ? "Invalid ID format (e.g: 123-45-6789 or 123456789)" : "Formato de cédula inválido (ej: V-12345678 o V12345678)"),
  nombre: z.string()
    .min(2, isEnglish ? "Name must have at least 2 characters" : "El nombre debe tener al menos 2 caracteres")
    .max(100, isEnglish ? "Name cannot exceed 100 characters" : "El nombre no puede exceder 100 caracteres"),
  fecha_nacimiento: z.string()
    .min(1, isEnglish ? "Birth date is required" : "La fecha de nacimiento es requerida")
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const minDate = new Date('1935-01-01');
      const maxDate = new Date(today.getFullYear() - 1, 11, 31);
      
      return birthDate >= minDate && birthDate <= maxDate;
    }, isEnglish ? "Date must be between 1935 and last year (maximum 100 years)" : "La fecha debe estar entre 1935 y el año pasado (máximo 100 años)"),
  telefono: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      if (isEnglish) {
        return /^\(\d{3}\)\s?\d{3}-?\d{4}$|^\d{3}-?\d{3}-?\d{4}$|^\d{10}$/.test(val);
      } else {
        return /^0\d{3}-?\d{7}$/.test(val);
      }
    }, isEnglish ? "Invalid phone format (e.g: (555) 123-4567 or 555-123-4567)" : "Formato de teléfono inválido (ej: 04121234567 o 0412-1234567)"),
  email: z.string()
    .email(isEnglish ? "Invalid email" : "Email inválido")
    .optional()
    .or(z.literal("")),
  direccion: z.string()
    .optional()
    .refine((val) => !val || val.length >= 10, isEnglish ? "Address must have at least 10 characters" : "La dirección debe tener al menos 10 caracteres"),
  categoria_edad_id: z.string().optional(),
  cinta_id: z.string().optional(),
  representante_id: z.string().optional(),
  contacto_emergencia: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, isEnglish ? "Emergency contact must have at least 2 characters" : "El contacto de emergencia debe tener al menos 2 caracteres"),
  telefono_emergencia: z.string()
    .optional()
    .refine((val) => !val || /^0\d{3}-?\d{7}$/.test(val), isEnglish ? "Invalid phone format (e.g: 04121234567 or 0412-1234567)" : "Formato de teléfono inválido (ej: 04121234567 o 0412-1234567)"),
  nombre_padre: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, isEnglish ? "Father's name must have at least 2 characters" : "El nombre del padre debe tener al menos 2 caracteres"),
  telefono_padre: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      if (isEnglish) {
        return /^\(\d{3}\)\s?\d{3}-?\d{4}$|^\d{3}-?\d{3}-?\d{4}$|^\d{10}$/.test(val);
      } else {
        return /^0\d{3}-?\d{7}$/.test(val);
      }
    }, isEnglish ? "Invalid phone format (e.g: (555) 123-4567 or 555-123-4567)" : "Formato de teléfono inválido (ej: 04121234567 o 0412-1234567)"),
  nombre_madre: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, isEnglish ? "Mother's name must have at least 2 characters" : "El nombre de la madre debe tener al menos 2 caracteres"),
  telefono_madre: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      if (isEnglish) {
        return /^\(\d{3}\)\s?\d{3}-?\d{4}$|^\d{3}-?\d{3}-?\d{4}$|^\d{10}$/.test(val);
      } else {
        return /^0\d{3}-?\d{7}$/.test(val);
      }
    }, isEnglish ? "Invalid phone format (e.g: (555) 123-4567 or 555-123-4567)" : "Formato de teléfono inválido (ej: 04121234567 o 0412-1234567)"),
});

type AlumnoFormData = z.infer<ReturnType<typeof createAlumnoSchema>>;

interface AlumnoFormProps {
  onSuccess: () => void;
}

export function AlumnoForm({ onSuccess }: AlumnoFormProps) {
  const { isEnglish } = useLanguage();
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
    resolver: zodResolver(createAlumnoSchema(isEnglish)),
  });

  const fechaNacimiento = watch("fecha_nacimiento");

  useEffect(() => {
    fetchCategoriasEdad();
    fetchCintas();
    fetchRepresentantes();
  }, []);

  useEffect(() => {
    if (fechaNacimiento) {
      filtrarCategoriasPorEdad(fechaNacimiento);
    } else {
      setCategoriasPermitidas([]);
    }
  }, [fechaNacimiento, categoriasEdad]);

  const fetchCategoriasEdad = async () => {
    try {
      const categorias = await apiClient.getCategoriasEdad();
      setCategoriasEdad(categorias || []);
    } catch (error) {
      console.error('Error cargando categorías de edad:', error);
    }
  };

  const fetchCintas = async () => {
    try {
      const cintas = await apiClient.getCintas();
      setCintas(cintas || []);
    } catch (error) {
      console.error('Error cargando cintas:', error);
    }
  };

  const fetchRepresentantes = async () => {
    try {
      const representantes = await apiClient.getRepresentantes();
      setRepresentantes(representantes || []);
    } catch (error) {
      console.error('Error cargando representantes:', error);
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
    if (categoriaSeleccionada && !filtradas.find(c => String(c.id) === categoriaSeleccionada)) {
      setValue("categoria_edad_id", "");
      toast({
        title: isEnglish ? "Attention" : "Atención",
        description: isEnglish 
          ? `The selected category does not match the student's age (${edad} years)`
          : `La categoría seleccionada no corresponde a la edad del alumno (${edad} años)`,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: AlumnoFormData) => {
    setLoading(true);
    try {
      const edad = calcularEdad(data.fecha_nacimiento);
      const esMayorEdad = edad >= 18;
      
      await apiClient.createAlumno({
        cedula: data.cedula,
        nombre: data.nombre,
        fecha_nacimiento: data.fecha_nacimiento,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
        id_categoria_edad: data.categoria_edad_id ? parseInt(data.categoria_edad_id) : null,
        id_cinta: data.cinta_id ? parseInt(data.cinta_id) : null,
        id_representante: esMayorEdad ? null : (data.representante_id ? parseInt(data.representante_id) : null),
        contacto_emergencia: data.contacto_emergencia || null,
        telefono_emergencia: data.telefono_emergencia || null,
        nombre_padre: data.nombre_padre || null,
        telefono_padre: data.telefono_padre || null,
        nombre_madre: data.nombre_madre || null,
        telefono_madre: data.telefono_madre || null,
      });

      toast({
        title: isEnglish ? "Success" : "Éxito",
        description: isEnglish ? "Student registered successfully" : "Alumno registrado correctamente",
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
        <Input 
          id="cedula" 
          {...register("cedula")} 
          placeholder={isEnglish ? "123-45-6789" : "V-12345678"}
          pattern={isEnglish ? "\\d{3}-?\\d{2}-?\\d{4}|\\d{9}" : "[VvEeJjGgPp]-?\\d{7,8}"}
          title="Formato: V-12345678 o V12345678 (V, E, J, G o P seguido de 7-8 dígitos)"
        />
        {errors.cedula && (
          <p className="text-sm text-destructive">{errors.cedula.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">{isEnglish ? "Full Name *" : "Nombre Completo *"}</Label>
        <Input 
          id="nombre" 
          {...register("nombre")} 
          placeholder="Ej: Juan Pérez"
          minLength={2}
          maxLength={100}
          title="Entre 2 y 100 caracteres"
        />
        {errors.nombre && (
          <p className="text-sm text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fecha_nacimiento">{isEnglish ? "Birth Date *" : "Fecha de Nacimiento *"}</Label>
        <Input 
          id="fecha_nacimiento" 
          type="date" 
          {...register("fecha_nacimiento")}
          min="1935-01-01"
          max={new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split('T')[0]}
          title="Fecha entre 1935 y el año pasado"
        />
        {errors.fecha_nacimiento && (
          <p className="text-sm text-destructive">{errors.fecha_nacimiento.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono">{isEnglish ? "Phone" : "Teléfono"}</Label>
          <Input 
            id="telefono" 
            {...register("telefono")} 
            placeholder={isEnglish ? "(555) 123-4567" : "04121234567"}
            pattern={isEnglish ? "\\(\\d{3}\\)\\s?\\d{3}-?\\d{4}|\\d{3}-?\\d{3}-?\\d{4}|\\d{10}" : "0\\d{3}-?\\d{7}"}
            title="Formato: 04121234567 o 0412-1234567 (11 dígitos comenzando con 0)"
            inputMode="numeric"
          />
          {errors.telefono && (
            <p className="text-sm text-destructive">{errors.telefono.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{isEnglish ? "Email" : "Email"}</Label>
          <Input 
            id="email" 
            type="email" 
            {...register("email")} 
            placeholder="ejemplo@correo.com"
            title="Formato de email válido"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion">{isEnglish ? "Address" : "Dirección"}</Label>
        <Input 
          id="direccion" 
          {...register("direccion")} 
          placeholder="Ej: Av. Principal, Edificio ABC, Piso 2"
          minLength={10}
          title="Mínimo 10 caracteres"
        />
        {errors.direccion && (
          <p className="text-sm text-destructive">{errors.direccion.message}</p>
        )}
      </div>

      {/* Campos de Contacto de Emergencia */}
      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3 text-sm">{isEnglish ? "Emergency Contact" : "Contacto de Emergencia"}</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contacto_emergencia">{isEnglish ? "Contact Name" : "Nombre del Contacto"}</Label>
            <Input 
              id="contacto_emergencia" 
              {...register("contacto_emergencia")} 
              placeholder={isEnglish ? "Ex: Maria Gonzalez" : "Ej: María González"}
              minLength={2}
              title={isEnglish ? "Minimum 2 characters" : "Mínimo 2 caracteres"}
            />
            {errors.contacto_emergencia && (
              <p className="text-sm text-destructive">{errors.contacto_emergencia.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono_emergencia">{isEnglish ? "Emergency Phone" : "Teléfono de Emergencia"}</Label>
            <Input 
              id="telefono_emergencia" 
              {...register("telefono_emergencia")} 
              placeholder={isEnglish ? "(555) 123-4567" : "04121234567"}
              pattern={isEnglish ? "\\(\\d{3}\\)\\s?\\d{3}-?\\d{4}|\\d{3}-?\\d{3}-?\\d{4}|\\d{10}" : "0\\d{3}-?\\d{7}"}
              title={isEnglish ? "Format: (555) 123-4567 or 555-123-4567" : "Formato: 04121234567 o 0412-1234567 (11 dígitos comenzando con 0)"}
              inputMode="numeric"
            />
            {errors.telefono_emergencia && (
              <p className="text-sm text-destructive">{errors.telefono_emergencia.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Campos de Padres */}
      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3 text-sm">{isEnglish ? "Parents Information" : "Información de Padres"}</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_padre">{isEnglish ? "Father's Name" : "Nombre del Padre"}</Label>
            <Input 
              id="nombre_padre" 
              {...register("nombre_padre")} 
              placeholder={isEnglish ? "Ex: John Perez" : "Ej: Juan Pérez"}
              minLength={2}
              title={isEnglish ? "Minimum 2 characters" : "Mínimo 2 caracteres"}
            />
            {errors.nombre_padre && (
              <p className="text-sm text-destructive">{errors.nombre_padre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono_padre">{isEnglish ? "Father's Phone" : "Teléfono del Padre"}</Label>
            <Input 
              id="telefono_padre" 
              {...register("telefono_padre")} 
              placeholder={isEnglish ? "(555) 123-4567" : "04121234567"}
              pattern={isEnglish ? "\\(\\d{3}\\)\\s?\\d{3}-?\\d{4}|\\d{3}-?\\d{3}-?\\d{4}|\\d{10}" : "0\\d{3}-?\\d{7}"}
              title={isEnglish ? "Format: (555) 123-4567 or 555-123-4567" : "Formato: 04121234567 o 0412-1234567 (11 dígitos comenzando con 0)"}
              inputMode="numeric"
            />
            {errors.telefono_padre && (
              <p className="text-sm text-destructive">{errors.telefono_padre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre_madre">{isEnglish ? "Mother's Name" : "Nombre de la Madre"}</Label>
            <Input 
              id="nombre_madre" 
              {...register("nombre_madre")} 
              placeholder={isEnglish ? "Ex: Maria Gonzalez" : "Ej: María González"}
              minLength={2}
              title={isEnglish ? "Minimum 2 characters" : "Mínimo 2 caracteres"}
            />
            {errors.nombre_madre && (
              <p className="text-sm text-destructive">{errors.nombre_madre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono_madre">{isEnglish ? "Mother's Phone" : "Teléfono de la Madre"}</Label>
            <Input 
              id="telefono_madre" 
              {...register("telefono_madre")} 
              placeholder={isEnglish ? "(555) 123-4567" : "04121234567"}
              pattern={isEnglish ? "\\(\\d{3}\\)\\s?\\d{3}-?\\d{4}|\\d{3}-?\\d{3}-?\\d{4}|\\d{10}" : "0\\d{3}-?\\d{7}"}
              title={isEnglish ? "Format: (555) 123-4567 or 555-123-4567" : "Formato: 04121234567 o 0412-1234567 (11 dígitos comenzando con 0)"}
              inputMode="numeric"
            />
            {errors.telefono_madre && (
              <p className="text-sm text-destructive">{errors.telefono_madre.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoria_edad_id">{isEnglish ? "Age Category" : "Categoría de Edad"}</Label>
          <Select
            onValueChange={(value) => setValue("categoria_edad_id", value)}
            value={watch("categoria_edad_id") || ""}
            disabled={!fechaNacimiento || categoriasPermitidas.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !fechaNacimiento 
                  ? (isEnglish ? "First enter birth date" : "Primero ingrese la fecha de nacimiento")
                  : categoriasPermitidas.length === 0 
                    ? (isEnglish ? "No categories available for this age" : "No hay categorías disponibles para esta edad")
                    : (isEnglish ? "Select category" : "Seleccionar categoría")
              } />
            </SelectTrigger>
            <SelectContent>
              {categoriasPermitidas.map((categoria) => (
                <SelectItem key={categoria.id} value={String(categoria.id)}>
                  {categoria.nombre} ({categoria.edad_min}-{categoria.edad_max} {isEnglish ? "years" : "años"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fechaNacimiento && categoriasPermitidas.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {calcularEdad(fechaNacimiento)} {isEnglish ? "years" : "años"} - {isEnglish ? "Categories available for this age" : "Categorías disponibles para esta edad"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cinta_id">{isEnglish ? "Belt" : "Cinta"}</Label>
          <Select
            onValueChange={(value) => setValue("cinta_id", value)}
            value={watch("cinta_id") || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder={isEnglish ? "Select belt" : "Seleccionar cinta"} />
            </SelectTrigger>
            <SelectContent>
              {cintas.map((cinta) => (
                <SelectItem key={cinta.id} value={String(cinta.id)}>
                  {isEnglish && cinta.nombre_en ? cinta.nombre_en : cinta.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Representante - Solo mostrar si es menor de edad */}
      {fechaNacimiento && calcularEdad(fechaNacimiento) < 18 && (
        <div className="space-y-2">
          <Label htmlFor="representante_id">{isEnglish ? "Representative *" : "Representante *"}</Label>
          <Select
            onValueChange={(value) => setValue("representante_id", value)}
            value={watch("representante_id") || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder={isEnglish ? "Select representative" : "Seleccionar representante"} />
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
      )}

      {/* Mensaje informativo para mayores de edad */}
      {fechaNacimiento && calcularEdad(fechaNacimiento) >= 18 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>{isEnglish ? "Adult:" : "Mayor de edad:"}</strong> {isEnglish ? "No representative required for this student." : "No se requiere representante para este alumno."}
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEnglish ? "Register Student" : "Registrar Alumno"}
      </Button>
    </form>
  );
}

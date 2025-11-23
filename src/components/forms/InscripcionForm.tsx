import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

const createInscripcionSchema = (isEnglish: boolean) => z.object({
  cedula: z.string()
    .min(1, isEnglish ? "ID is required" : "La cédula es requerida")
    .refine((val) => {
      if (isEnglish) {
        return /^\d{3}-?\d{2}-?\d{4}$|^\d{9}$/.test(val);
      } else {
        return /^[VvEeJjGgPp]-?\d{7,8}$/.test(val);
      }
    }, isEnglish ? "Invalid ID format (e.g: 123-45-6789 or 123456789)" : "Formato de cédula inválido (ej: V-12345678 o V12345678)"),
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
    .min(1, isEnglish ? "Phone is required" : "El teléfono es requerido")
    .refine((val) => {
      if (isEnglish) {
        return /^\(\d{3}\)\s?\d{3}-?\d{4}$|^\d{3}-?\d{3}-?\d{4}$|^\d{10}$/.test(val);
      } else {
        return /^0\d{3}-?\d{7}$/.test(val);
      }
    }, isEnglish ? "Invalid phone format (e.g: (555) 123-4567 or 555-123-4567)" : "Formato de teléfono inválido (ej: 04121234567 o 0412-1234567)"),
  direccion: z.string()
    .min(1, isEnglish ? "Address is required" : "La dirección es requerida")
    .min(10, isEnglish ? "Address must have at least 10 characters" : "La dirección debe tener al menos 10 caracteres"),
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
  contacto_emergencia: z.string()
    .min(1, isEnglish ? "Emergency contact is required" : "El contacto de emergencia es requerido")
    .min(2, isEnglish ? "Emergency contact must have at least 2 characters" : "El contacto de emergencia debe tener al menos 2 caracteres"),
  telefono_emergencia: z.string()
    .min(1, isEnglish ? "Emergency phone is required" : "El teléfono de emergencia es requerido")
    .refine((val) => {
      if (isEnglish) {
        return /^\(\d{3}\)\s?\d{3}-?\d{4}$|^\d{3}-?\d{3}-?\d{4}$|^\d{10}$/.test(val);
      } else {
        return /^0\d{3}-?\d{7}$/.test(val);
      }
    }, isEnglish ? "Invalid phone format (e.g: (555) 123-4567 or 555-123-4567)" : "Formato de teléfono inválido (ej: 04121234567 o 0412-1234567)"),
});

type InscripcionFormData = z.infer<ReturnType<typeof createInscripcionSchema>>;

interface InscripcionFormProps {
  onSuccess: () => void;
}

export function InscripcionForm({ onSuccess }: InscripcionFormProps) {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [edad, setEdad] = useState<number | null>(null);
  const [categoria, setCategoria] = useState<string>("");
  const [montoPago, setMontoPago] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<InscripcionFormData>({
    resolver: zodResolver(createInscripcionSchema(isEnglish)),
  });

  const fechaNacimiento = watch("fecha_nacimiento");

  useEffect(() => {
    if (fechaNacimiento) {
      calcularEdadYCategoria(fechaNacimiento);
    }
  }, [fechaNacimiento]);

  const calcularEdadYCategoria = async (fechaNac: string) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edadCalculada--;
    }
    
    setEdad(edadCalculada);

    let categoriaAsignada = "";
    if (edadCalculada <= 7) categoriaAsignada = isEnglish ? "Benjamin" : "Benjamín";
    else if (edadCalculada <= 9) categoriaAsignada = isEnglish ? "Alevin" : "Alevín";
    else if (edadCalculada <= 11) categoriaAsignada = isEnglish ? "Infant" : "Infantil";
    else if (edadCalculada <= 13) categoriaAsignada = isEnglish ? "Cadet" : "Cadete";
    else if (edadCalculada <= 15) categoriaAsignada = isEnglish ? "Junior" : "Junior";
    else if (edadCalculada <= 34) categoriaAsignada = isEnglish ? "Senior" : "Senior";
    else categoriaAsignada = isEnglish ? "Veteran" : "Veterano";

    setCategoria(categoriaAsignada);

    try {
      // Obtener categorías de edad desde la base de datos
      const categoriasEdad = await apiClient.getCategoriasEdad();
      
      // Buscar la categoría que corresponde a la edad calculada
      const categoriaEncontrada = categoriasEdad.find((cat: any) => 
        edadCalculada >= (cat.edad_min || 0) && edadCalculada <= (cat.edad_max || 999)
      ) || categoriasEdad.find((cat: any) => 
        cat.nombre?.toLowerCase().includes(categoriaAsignada.toLowerCase())
      );
      
      const precioMensualidad = categoriaEncontrada?.precio_mensualidad || 50;
      const precioInscripcion = 15;
      setMontoPago(precioMensualidad + precioInscripcion);
    } catch (error) {
      console.error('Error obteniendo precio:', error);
      setMontoPago(65);
    }
  };

  const onSubmit = async (data: InscripcionFormData) => {
    setLoading(true);
    try {
      // Calcular edad para encontrar la categoría correcta
      const hoy = new Date();
      const nacimiento = new Date(data.fecha_nacimiento);
      let edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edadCalculada--;
      }

      console.log('📝 Iniciando inscripción con datos:', {
        cedula: data.cedula,
        nombre: user?.nombre_completo || '',
        fecha_nacimiento: data.fecha_nacimiento,
        edad: edadCalculada,
        telefono: data.telefono,
        email: user?.email || '',
        direccion: data.direccion,
        categoria: categoria,
        usuario_id: user?.id,
      });

      // Obtener categorías de edad desde la base de datos
      const categoriasEdad = await apiClient.getCategoriasEdad();
      console.log('📋 Categorías de edad disponibles:', categoriasEdad);
      
      // Buscar la categoría que corresponde a la edad calculada
      const categoriaEncontrada = categoriasEdad.find((cat: any) => 
        edadCalculada >= (cat.edad_min || 0) && edadCalculada <= (cat.edad_max || 999)
      ) || categoriasEdad.find((cat: any) => 
        cat.nombre?.toLowerCase().includes(categoria.toLowerCase())
      );

      console.log('✅ Categoría de edad encontrada:', categoriaEncontrada);
      
      if (!categoriaEncontrada) {
        console.warn('⚠️ No se encontró categoría para edad', edadCalculada, 'Usando null');
      }

      const datosAlumno = {
        cedula: data.cedula,
        nombre: user?.nombre_completo || '',
        fecha_nacimiento: data.fecha_nacimiento,
        telefono: data.telefono,
        email: user?.email || '',
        direccion: data.direccion,
        id_categoria_edad: categoriaEncontrada?.id || null, // Usar el ID de la categoría encontrada
        id_cinta: 1, // ID de cinta blanca por defecto
        usuario_id: user?.id,
        contacto_emergencia: data.contacto_emergencia,
        telefono_emergencia: data.telefono_emergencia,
        nombre_padre: data.nombre_padre,
        telefono_padre: data.telefono_padre,
        nombre_madre: data.nombre_madre,
        telefono_madre: data.telefono_madre,
      };

      console.log('🚀 Enviando datos al backend:', datosAlumno);

      const alumno = await apiClient.createAlumno(datosAlumno);
      
      console.log('✅ Alumno creado exitosamente:', alumno);

      if (data.nombre_padre || data.nombre_madre) {
        await apiClient.createRepresentante({
          nombre: data.nombre_padre || data.nombre_madre,
          cedula: data.cedula + '-REP',
          telefono: data.telefono_padre || data.telefono_madre,
          parentesco: data.nombre_padre ? 'Padre' : 'Madre',
        });
      }

      toast({
        title: isEnglish ? "Registration completed!" : "¡Inscripción completada!",
        description: isEnglish ? `Now you must make the payment of $${Number(montoPago).toFixed(2)} (Monthly + Registration)` : `Ahora debes realizar el pago de $${Number(montoPago).toFixed(2)} (Mensualidad + Inscripción)`,
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('❌ ERROR EN INSCRIPCIÓN:', error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        status: error.status,
        data: error.data,
        response: error.response,
        sqlMessage: error.data?.sqlMessage,
        sql: error.data?.sql,
      });
      
      // Mostrar mensaje de error más descriptivo
      let errorMessage = error.message || (isEnglish ? "Could not complete registration" : "No se pudo completar la inscripción");
      
      if (error.data?.sqlMessage) {
        errorMessage += ` (${error.data.sqlMessage})`;
        console.error('🔍 Error SQL:', error.data.sqlMessage);
      }
      
      if (error.data?.message) {
        errorMessage = error.data.message;
      }

      toast({
        title: isEnglish ? "Error" : "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📋 {isEnglish ? "Important Information" : "Información Importante"}
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {isEnglish ? "Complete this form to register in the dojo. Registration payment is" : "Complete este formulario para inscribirse en el dojo. El pago de inscripción es de"} <strong>$15</strong> {isEnglish ? "additional to the first monthly payment." : "adicional a la primera mensualidad."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cedula">{isEnglish ? "ID *" : "Cédula *"}</Label>
          <Input 
            id="cedula" 
            {...register("cedula")} 
            placeholder={isEnglish ? "123-45-6789" : "V-12345678"}
            pattern={isEnglish ? "\\d{3}-?\\d{2}-?\\d{4}|\\d{9}" : "[VvEeJjGgPp]-?\\d{7,8}"}
            title={isEnglish ? "Format: 123-45-6789 or 123456789 (9 digits)" : "Formato: V-12345678 o V12345678 (V, E, J, G o P seguido de 7-8 dígitos)"}
          />
          {errors.cedula && (
            <p className="text-sm text-destructive">{errors.cedula.message}</p>
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
      </div>

      {edad !== null && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm">
            <span className="font-semibold">{isEnglish ? "Age:" : "Edad:"}</span> {edad} {isEnglish ? "years" : "años"} |{' '}
            <span className="font-semibold">{isEnglish ? "Category:" : "Categoría:"}</span> {categoria} |{' '}
            <span className="font-semibold">{isEnglish ? "Total Payment:" : "Pago Total:"}</span> ${Number(montoPago).toFixed(2)} (${Number(montoPago - 15).toFixed(2)} {isEnglish ? "monthly" : "mensualidad"} + $15.00 {isEnglish ? "registration" : "inscripción"})
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono">{isEnglish ? "Phone *" : "Teléfono *"}</Label>
          <Input 
            id="telefono" 
            {...register("telefono")} 
            placeholder={isEnglish ? "(555) 123-4567" : "04121234567"}
            pattern={isEnglish ? "\\(\\d{3}\\)\\s?\\d{3}-?\\d{4}|\\d{3}-?\\d{3}-?\\d{4}|\\d{10}" : "0\\d{3}-?\\d{7}"}
            title={isEnglish ? "Format: (555) 123-4567 or 555-123-4567" : "Formato: 04121234567 o 0412-1234567 (11 dígitos comenzando con 0)"}
            inputMode="numeric"
          />
          {errors.telefono && (
            <p className="text-sm text-destructive">{errors.telefono.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="direccion">{isEnglish ? "Address *" : "Dirección *"}</Label>
          <Input 
            id="direccion" 
            {...register("direccion")} 
            placeholder={isEnglish ? "Ex: 123 Main St, Apt 2B, City, State 12345" : "Ej: Av. Principal, Edificio ABC, Piso 2, Apartamento 3"}
            minLength={10}
            title={isEnglish ? "Minimum 10 characters" : "Mínimo 10 caracteres"}
          />
          {errors.direccion && (
            <p className="text-sm text-destructive">{errors.direccion.message}</p>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3">{isEnglish ? "Parents/Representatives Information" : "Información de Padres/Representantes"}</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="space-y-2">
            <Label htmlFor="nombre_padre">{isEnglish ? "Father's Name" : "Nombre del Padre"}</Label>
            <Input id="nombre_padre" {...register("nombre_padre")} placeholder={isEnglish ? "Full name" : "Nombre completo"} />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_madre">{isEnglish ? "Mother's Name" : "Nombre de la Madre"}</Label>
            <Input id="nombre_madre" {...register("nombre_madre")} placeholder={isEnglish ? "Full name" : "Nombre completo"} />
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

      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3">{isEnglish ? "Emergency Contact *" : "Contacto de Emergencia *"}</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contacto_emergencia">{isEnglish ? "Contact Name *" : "Nombre del Contacto *"}</Label>
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
            <Label htmlFor="telefono_emergencia">{isEnglish ? "Emergency Phone *" : "Teléfono de Emergencia *"}</Label>
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

      <Button type="submit" className="w-full" disabled={loading || !edad}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
{isEnglish ? "Complete Registration" : "Completar Inscripción"}
      </Button>
    </form>
  );
}


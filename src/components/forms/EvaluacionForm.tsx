import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage, translateBelt } from "@/hooks/useLanguage";

// Definición de exámenes oficiales
const getExamenesOficiales = (isEnglish: boolean) => [
  { id: 'blanco-amarillo', nombre: isEnglish ? 'White → Yellow (6th Kyu)' : 'Blanco → Amarillo (6º Kyu)', categoria_origen: 'Blanco', categoria_destino: 'Amarillo' },
  { id: 'amarillo-naranja', nombre: isEnglish ? 'Yellow → Orange (5th Kyu)' : 'Amarillo → Naranja (5º Kyu)', categoria_origen: 'Amarillo', categoria_destino: 'Naranja' },
  { id: 'naranja-verde', nombre: isEnglish ? 'Orange → Green (4th Kyu)' : 'Naranja → Verde (4º Kyu)', categoria_origen: 'Naranja', categoria_destino: 'Verde' },
  { id: 'verde-azul', nombre: isEnglish ? 'Green → Blue (3rd Kyu)' : 'Verde → Azul (3º Kyu)', categoria_origen: 'Verde', categoria_destino: 'Azul' },
  { id: 'azul-marron', nombre: isEnglish ? 'Blue → Brown (2nd Kyu)' : 'Azul → Marrón (2º Kyu)', categoria_origen: 'Azul', categoria_destino: 'Marrón' },
  { id: 'marron-negro', nombre: isEnglish ? 'Brown → Black (1st Dan)' : 'Marrón → Negro (1º Dan)', categoria_origen: 'Marrón', categoria_destino: 'Negro' },
  { id: 'dan-avanzado', nombre: isEnglish ? 'Advanced Dan (2nd, 3rd, etc.)' : 'Dan Avanzado (2º, 3º, etc.)', categoria_origen: 'Negro', categoria_destino: 'Negro' },
];

const createEvaluacionSchema = (isEnglish: boolean) => z.object({
  examen_tipo: z.string().min(1, isEnglish ? "You must select an exam type" : "Debes seleccionar un tipo de examen"),
  fecha: z.string().min(1, isEnglish ? "Date is required" : "La fecha es requerida").refine((fecha) => {
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaSeleccionada >= hoy;
  }, isEnglish ? "You cannot create an evaluation with a date before today" : "No puedes crear una evaluación con una fecha anterior a hoy"),
  hora: z.string().min(1, isEnglish ? "Time is required" : "La hora es requerida"),
  instructor_id: z.string().min(1, isEnglish ? "You must select an instructor" : "Debes seleccionar un instructor"),
  descripcion: z.string().optional(),
});

type EvaluacionFormData = z.infer<ReturnType<typeof createEvaluacionSchema>>;

interface EvaluacionFormProps {
  onSuccess: () => void;
}

export function EvaluacionForm({ onSuccess }: EvaluacionFormProps) {
  const { isEnglish } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [instructores, setInstructores] = useState<any[]>([]);
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<string[]>([]);
  const [alumnosFiltrados, setAlumnosFiltrados] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EvaluacionFormData>({
    resolver: zodResolver(createEvaluacionSchema(isEnglish)),
  });

  const examenSeleccionado = watch("examen_tipo");

  useEffect(() => {
    fetchAlumnos();
    fetchInstructores();
  }, []);

  useEffect(() => {
    if (examenSeleccionado && alumnos.length > 0) {
      filtrarAlumnosPorCategoria();
    }
  }, [examenSeleccionado, alumnos]);

  const fetchAlumnos = async () => {
    try {
      const alumnosData = await apiClient.getAlumnos();
      setAlumnos(alumnosData || []);
    } catch (error) {
      console.error('Error cargando alumnos:', error);
    }
  };

  const fetchInstructores = async () => {
    try {
      const instructoresData = await apiClient.getInstructores();
      setInstructores(instructoresData || []);
    } catch (error) {
      console.error('Error cargando instructores:', error);
    }
  };

  const filtrarAlumnosPorCategoria = () => {
    const examen = getExamenesOficiales(isEnglish).find(e => e.id === examenSeleccionado);
    if (!examen) {
      setAlumnosFiltrados([]);
      return;
    }

    // Filtrar alumnos que tienen la cinta de origen del examen
    const filtrados = alumnos.filter(alumno => {
      if (alumno.estado !== 1) return false;
      
      const cintaNombre = alumno.cinta_nombre?.toLowerCase() || '';
      const categoriaOrigen = examen.categoria_origen.toLowerCase();
      
      // Validación estricta: la cinta debe coincidir exactamente con la categoría de origen
      // Esto previene que alumnos con cinta incorrecta sean incluidos
      // Por ejemplo: Solo alumnos con cinta "Negro" pueden tomar examen de "Dan Avanzado"
      if (categoriaOrigen === 'blanco') {
        return cintaNombre === 'blanco' || cintaNombre === 'blanca';
      } else if (categoriaOrigen === 'amarillo') {
        return cintaNombre === 'amarillo' || cintaNombre === 'amarilla';
      } else if (categoriaOrigen === 'naranja') {
        return cintaNombre === 'naranja';
      } else if (categoriaOrigen === 'verde') {
        return cintaNombre === 'verde';
      } else if (categoriaOrigen === 'azul') {
        return cintaNombre === 'azul';
      } else if (categoriaOrigen === 'marrón') {
        return cintaNombre === 'marrón' || cintaNombre === 'marron';
      } else if (categoriaOrigen === 'negro') {
        return cintaNombre === 'negro' || cintaNombre === 'negra';
      }
      
      return false;
    });

    setAlumnosFiltrados(filtrados);
    // Seleccionar automáticamente todos los alumnos filtrados
    setAlumnosSeleccionados(filtrados.map(a => a.id.toString()));
  };

  const toggleAlumno = (alumnoId: string) => {
    setAlumnosSeleccionados(prev => {
      if (prev.includes(alumnoId)) {
        return prev.filter(id => id !== alumnoId);
      } else {
        return [...prev, alumnoId];
      }
    });
  };

  const seleccionarTodos = () => {
    if (alumnosSeleccionados.length === alumnosFiltrados.length) {
      setAlumnosSeleccionados([]);
    } else {
      setAlumnosSeleccionados(alumnosFiltrados.map(a => a.id.toString()));
    }
  };

  const onSubmit = async (data: EvaluacionFormData) => {
    if (alumnosSeleccionados.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un alumno para la evaluación",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const examen = getExamenesOficiales(isEnglish).find(e => e.id === data.examen_tipo);
      
      await apiClient.createEvaluacion({
        nombre: examen?.nombre || data.examen_tipo,
        fecha: data.fecha,
        hora: data.hora,
        descripcion: data.descripcion || null,
        instructor_id: data.instructor_id,
        alumnos_ids: alumnosSeleccionados,
      });

      toast({
        title: isEnglish ? "Success" : "Éxito",
        description: isEnglish 
          ? `Evaluation created with ${alumnosSeleccionados.length} student(s) enabled`
          : `Evaluación creada con ${alumnosSeleccionados.length} alumno(s) habilitado(s)`,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label htmlFor="examen_tipo">{isEnglish ? "Exam Type *" : "Tipo de Examen *"}</Label>
        <Select
          onValueChange={(value) => setValue("examen_tipo", value)}
          value={watch("examen_tipo")}
        >
          <SelectTrigger>
            <SelectValue placeholder={isEnglish ? "Select exam" : "Seleccionar examen"} />
          </SelectTrigger>
          <SelectContent>
            {getExamenesOficiales(isEnglish).map((examen) => (
              <SelectItem key={examen.id} value={examen.id}>
                {examen.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.examen_tipo && (
          <p className="text-sm text-destructive">{errors.examen_tipo.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fecha">{isEnglish ? "Date *" : "Fecha *"}</Label>
        <Input 
          id="fecha" 
          type="date" 
          min={new Date().toISOString().split('T')[0]}
          {...register("fecha")} 
        />
        {errors.fecha && (
          <p className="text-sm text-destructive">{errors.fecha.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="hora">{isEnglish ? "Time *" : "Hora *"}</Label>
        <Input 
          id="hora" 
          type="time" 
          {...register("hora")} 
        />
        {errors.hora && (
          <p className="text-sm text-destructive">{errors.hora.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructor_id">{isEnglish ? "Instructor *" : "Instructor *"}</Label>
        <Select
          onValueChange={(value) => setValue("instructor_id", value)}
          value={watch("instructor_id")}
        >
          <SelectTrigger>
            <SelectValue placeholder={isEnglish ? "Select instructor" : "Seleccionar instructor"} />
          </SelectTrigger>
          <SelectContent>
            {instructores.map((instructor) => (
              <SelectItem key={instructor.id} value={instructor.id.toString()}>
                {instructor.nombre_completo || instructor.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.instructor_id && (
          <p className="text-sm text-destructive">{errors.instructor_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">{isEnglish ? "Description" : "Descripción"}</Label>
        <Textarea
          id="descripcion"
          placeholder={isEnglish ? "Evaluation description..." : "Descripción de la evaluación..."}
          rows={2}
          {...register("descripcion")}
        />
      </div>

      {/* Lista de alumnos elegibles */}
      {examenSeleccionado && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label>
              {isEnglish ? "Eligible Students" : "Alumnos Elegibles"} 
              <span className="text-sm text-muted-foreground ml-2">
                ({alumnosFiltrados.length} {isEnglish ? (alumnosFiltrados.length !== 1 ? 'available' : 'available') : (alumnosFiltrados.length !== 1 ? 'disponibles' : 'disponible')})
              </span>
            </Label>
            {alumnosFiltrados.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={seleccionarTodos}
              >
                {alumnosSeleccionados.length === alumnosFiltrados.length ? (isEnglish ? 'Deselect' : 'Deseleccionar') : (isEnglish ? 'Select' : 'Seleccionar')} {isEnglish ? 'all' : 'todos'}
              </Button>
            )}
          </div>

          {/* Indicador de cinta requerida */}
          {(() => {
            const examen = getExamenesOficiales(isEnglish).find(e => e.id === examenSeleccionado);
            return examen ? (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-semibold">ℹ️ {isEnglish ? "Required belt:" : "Cinta requerida:"}</span> {translateBelt(examen.categoria_origen, isEnglish)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {isEnglish 
                    ? "Only students with this exact belt can take this exam" 
                    : "Solo los alumnos con esta cinta exacta pueden presentar este examen"}
                </p>
              </div>
            ) : null;
          })()}

          {alumnosFiltrados.length === 0 ? (
            <div className="text-center py-6 text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="font-semibold">⚠️ {isEnglish ? "No eligible students" : "No hay alumnos elegibles"}</p>
              <p className="text-xs mt-1">
                {isEnglish ? "No students with the required belt for this exam" : "No hay alumnos con la cinta requerida para este examen"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-muted/30">
              {alumnosFiltrados.map((alumno) => (
                <div
                  key={alumno.id}
                  className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
                >
                  <Checkbox
                    id={`alumno-${alumno.id}`}
                    checked={alumnosSeleccionados.includes(alumno.id.toString())}
                    onCheckedChange={() => toggleAlumno(alumno.id.toString())}
                  />
                  <label
                    htmlFor={`alumno-${alumno.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <span className="font-medium">{alumno.nombre}</span>
                    <span className="text-muted-foreground ml-2">
                      ({alumno.cinta_nombre ? translateBelt(alumno.cinta_nombre, isEnglish) : (isEnglish ? 'No belt' : 'Sin cinta')})
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
          
          {alumnosSeleccionados.length > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ {alumnosSeleccionados.length} alumno(s) seleccionado(s)
            </p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading || !examenSeleccionado}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEnglish ? "Create Evaluation" : "Crear Evaluación"}
      </Button>
    </form>
  );
}

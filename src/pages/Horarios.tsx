import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Users, MapPin, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage, getTranslation } from "@/hooks/useLanguage";

interface Horario {
  id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  categoria_edad_nombre?: string;
  capacidad_maxima?: number;
  instructor?: string;
  activo: boolean;
}

interface DiaFestivo {
  id: number;
  fecha: string;
  descripcion: string;
}

const diasOrden = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo'
];

const diasOrdenEn = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const diasColores: { [key: string]: string } = {
  'lunes': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'martes': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'miércoles': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'jueves': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'viernes': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  'sábado': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'domingo': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'monday': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'tuesday': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'wednesday': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'thursday': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'friday': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  'saturday': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'sunday': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

// Lista predefinida de días festivos comunes
const diasFestivosComunes = [
  { id: 'año_nuevo', nombre: 'Año Nuevo', fecha: '01-01' },
  { id: 'carnaval_lunes', nombre: 'Carnaval (Lunes)', fecha: 'variable' },
  { id: 'carnaval_martes', nombre: 'Carnaval (Martes)', fecha: 'variable' },
  { id: 'lunes_pascua', nombre: 'Lunes de Pascua', fecha: 'variable' },
  { id: 'declaracion_independencia', nombre: 'Declaración de la Independencia', fecha: '19-04' },
  { id: 'dia_trabajador', nombre: 'Día del Trabajador', fecha: '01-05' },
  { id: 'batalla_carabobo', nombre: 'Batalla de Carabobo', fecha: '24-06' },
  { id: 'independencia', nombre: 'Día de la Independencia', fecha: '05-07' },
  { id: 'natalicio_bolivar', nombre: 'Natalicio de Simón Bolívar', fecha: '24-07' },
  { id: 'resistencia_indigena', nombre: 'Día de la Resistencia Indígena', fecha: '12-10' },
  { id: 'navidad', nombre: 'Navidad', fecha: '25-12' },
  { id: 'personalizado', nombre: 'Día Personalizado', fecha: 'personalizado' }
];

export default function Horarios() {
  const { isEnglish } = useLanguage();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [diasFestivos, setDiasFestivos] = useState<DiaFestivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [diasFestivosExpandidos, setDiasFestivosExpandidos] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [horariosData, festivosData] = await Promise.all([
        apiClient.getHorarios(),
        apiClient.getDiasFestivos()
      ]);
      // Filtrar duplicados por ID antes de establecer el estado
      const horariosUnicos = (horariosData || []).filter((horario, index, self) => 
        index === self.findIndex((h) => h.id === horario.id)
      );
      setHorarios(horariosUnicos);
      setDiasFestivos(festivosData);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      toast({
        title: isEnglish ? "Error" : "Error",
        description: isEnglish ? "Could not load schedules" : "No se pudieron cargar los horarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Agrupar horarios por día
  const diasActuales = isEnglish ? diasOrdenEn : diasOrden;
  const horariosPorDia = diasActuales.reduce((acc, dia) => {
    acc[dia] = horarios
      .filter(h => h.dia_semana.toLowerCase() === dia && h.activo)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    return acc;
  }, {} as { [key: string]: Horario[] });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2">
          <Clock className="h-8 w-8" />
          {isEnglish ? "Class Schedules" : "Horarios de Clases"}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {isEnglish ? "Check available schedules and holidays" : "Consulta los horarios disponibles y días festivos"}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">{isEnglish ? "Loading schedules..." : "Cargando horarios..."}</p>
        </div>
      ) : (
        <>
          {/* Horarios por Día */}
          <div className="space-y-4">
            {diasActuales.map((dia) => {
              const horariosDelDia = horariosPorDia[dia];
              if (horariosDelDia.length === 0) return null;

              return (
                <Card
                  key={dia}
                  className="border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl capitalize flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-gray-800 dark:text-gray-200">{dia}</span>
                      </CardTitle>
                      <Badge className={diasColores[dia]}>
                        {horariosDelDia.length} {horariosDelDia.length === 1 ? (isEnglish ? 'class' : 'clase') : (isEnglish ? 'classes' : 'clases')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {horariosDelDia.map((horario, index) => {
                        // Crear una clave única combinando ID, índice y otros campos para evitar duplicados
                        const uniqueKey = `${horario.id}-${index}-${horario.dia_semana}-${horario.hora_inicio}-${horario.hora_fin}`;
                        return (
                        <div
                          key={uniqueKey}
                          className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Horario */}
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{isEnglish ? "Schedule" : "Horario"}</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">
                                  {horario.hora_inicio.substring(0, 5)} - {horario.hora_fin.substring(0, 5)}
                                </p>
                              </div>
                            </div>

                            {/* Nivel/Categoría */}
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{isEnglish ? "Category" : "Categoría"}</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">
                                  {horario.categoria_edad_nombre || (isEnglish ? 'All levels' : 'Todos los niveles')}
                                </p>
                              </div>
                            </div>

                            {/* Instructor */}
                            {horario.instructor && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{isEnglish ? "Instructor" : "Instructor"}</p>
                                  <p className="font-medium text-gray-800 dark:text-gray-200">
                                    {horario.instructor}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Capacidad */}
                            {horario.capacidad_maxima && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{isEnglish ? "Capacity" : "Capacidad"}</p>
                                  <p className="font-medium text-gray-800 dark:text-gray-200">
                                    {horario.capacidad_maxima} {isEnglish ? "people" : "personas"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Días Festivos */}
          <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100/30 dark:from-orange-950/30 dark:to-orange-900/20">
            <CardHeader 
              className="cursor-pointer"
              onClick={() => setDiasFestivosExpandidos(!diasFestivosExpandidos)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  <CardTitle className="text-orange-800 dark:text-orange-400">
                    {isEnglish ? "Holidays / Non-working Days" : "Días Festivos / No Laborables"}
                  </CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {diasFestivos.length}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm">
                  {diasFestivosExpandidos ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardDescription className="dark:text-gray-300">
                {isEnglish ? "The dojo will be closed on the following dates" : "El dojo permanecerá cerrado en las siguientes fechas"}
              </CardDescription>
            </CardHeader>
            {diasFestivosExpandidos && (
              <CardContent>
                {diasFestivos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{isEnglish ? "No holidays registered" : "No hay días festivos registrados"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {diasFestivos.map((festivo) => (
                      <div
                        key={festivo.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {festivo.descripcion}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {(() => {
                                const fecha = new Date(festivo.fecha);
                                if (isNaN(fecha.getTime())) {
                                  return festivo.fecha; // Mostrar la fecha original si es inválida
                                }
                                return fecha.toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>


          {/* Información adicional */}
          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    <strong>{isEnglish ? "Important:" : "Importante:"}</strong> {isEnglish ? "Arrive at least 10 minutes before class starts." : "Llega al menos 10 minutos antes del inicio de la clase."}
                  </p>
                  <p>
                    {isEnglish ? "If you cannot attend, please notify your instructor in advance." : "Si no puedes asistir, por favor notifica con anticipación a tu instructor."}
                  </p>
                  <p>
                    {isEnglish ? "For more information, contact the dojo administration." : "Para más información, contacta a la administración del dojo."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


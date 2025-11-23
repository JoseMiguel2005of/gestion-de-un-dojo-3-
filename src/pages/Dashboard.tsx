import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, FileText, BarChart3, Clock, DollarSign, Calendar, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InscripcionForm } from "@/components/forms/InscripcionForm";
import { Button } from "@/components/ui/button";
import { calculateExamTimeInfo } from "@/utils/timeUtils";
import { useLanguage, getTranslation, translateBelt } from "@/hooks/useLanguage";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const [stats, setStats] = useState({
    alumnos: 0,
    niveles: 0,
    evaluaciones: 0,
    representantes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(true);
  const [dialogInscripcion, setDialogInscripcion] = useState(false);
  const [miAlumno, setMiAlumno] = useState<any>(null);
  const [primerExamenMinimizado, setPrimerExamenMinimizado] = useState(false);
  
  // Determinar si el usuario es admin o tiene permisos avanzados
  const isAdmin = user?.rol === 'admin';
  const hasAdvancedAccess = isAdmin || user?.rol === 'asistente' || user?.rol === 'instructor';
  const isRegularUser = user?.rol === 'usuario';

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (isRegularUser) {
      fetchAlumnos();
    }
  }, [isRegularUser]);

  // También cargar información del alumno para usuarios normales
  useEffect(() => {
    if (isRegularUser && user?.id) {
      fetchAlumnos();
    }
  }, [user?.id, isRegularUser]);

  const fetchStats = async () => {
    try {
      // Solo cargar estadísticas si el usuario tiene permisos avanzados
      if (hasAdvancedAccess) {
        const [alumnos, niveles, evaluaciones, representantes] = await Promise.all([
          apiClient.getAlumnos(),
          apiClient.getNiveles(),
          apiClient.getEvaluaciones(),
          apiClient.getRepresentantes(),
        ]);

        setStats({
          alumnos: alumnos.length || 0,
          niveles: niveles.length || 0,
          evaluaciones: evaluaciones.length || 0,
          representantes: representantes.length || 0,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumnos = async () => {
    try {
      const alumnosData = await apiClient.getAlumnos();
      setAlumnos(alumnosData);
      
      // Buscar el alumno asociado al usuario actual
      const alumnoAsociado = alumnosData.find((alumno: any) => alumno.usuario_id === user?.id);
      
      if (alumnoAsociado) {
        setMiAlumno(alumnoAsociado);
      }
    } catch (error) {
      console.error('Error cargando alumnos:', error);
    } finally {
      setLoadingAlumnos(false);
    }
  };

  // Vista para usuarios normales
  if (isRegularUser) {
    // Si no tiene alumnos asociados, mostrar formulario de inscripción
    if (!loadingAlumnos && alumnos.length === 0) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground">{isEnglish ? "Welcome, " : "¡Bienvenido, "}{user?.nombre_completo}{isEnglish ? "!" : "!"}</h2>
            <p className="text-muted-foreground mt-1">{isEnglish ? "Complete your dojo registration" : "Completa tu inscripción al dojo"}</p>
          </div>

          <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100/30 dark:from-orange-950/30 dark:to-orange-900/20">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-400">
                📝 {isEnglish ? "Pending Registration" : "Inscripción Pendiente"}
              </CardTitle>
              <CardDescription>
                {isEnglish ? "To start your classes at the dojo, you need to complete your registration" : "Para comenzar tus clases en el dojo, necesitas completar tu inscripción"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{isEnglish ? "Steps to register:" : "Pasos para inscribirte:"}</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>{isEnglish ? "Complete the form with your personal data" : "Completa el formulario con tus datos personales"}</li>
                  <li>{isEnglish ? "Your category will be calculated according to your age" : "Se calculará tu categoría según tu edad"}</li>
                  <li>{isEnglish ? "Make the monthly payment + $15 registration fee" : "Realiza el pago de mensualidad + $15 de inscripción"}</li>
                  <li>{isEnglish ? "Send payment verification" : "Envía la verificación del pago"}</li>
                  <li>{isEnglish ? "Wait for sensei confirmation and start training!" : "¡Espera la confirmación del sensei y comienza a entrenar!"}</li>
                </ol>
              </div>

              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={() => setDialogInscripcion(true)}
              >
                {isEnglish ? "Start Registration" : "Iniciar Inscripción"}
              </Button>
            </CardContent>
          </Card>

          <Dialog open={dialogInscripcion} onOpenChange={setDialogInscripcion}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{isEnglish ? "Registration Form" : "Formulario de Inscripción"}</DialogTitle>
                <DialogDescription>
                  {isEnglish ? "Complete your personal data to register in the dojo" : "Complete sus datos personales para inscribirse en el dojo"}
                </DialogDescription>
              </DialogHeader>
              <InscripcionForm
                onSuccess={async () => {
                  setDialogInscripcion(false);
                  // Actualizar datos sin recargar la página para mantener la sesión
                  await fetchAlumnos();
                  if (hasAdvancedAccess) {
                    await fetchStats();
                  }
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Información del usuario */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>{isEnglish ? "Personal Information" : "Información Personal"}</CardTitle>
              <CardDescription>{isEnglish ? "Your account data" : "Datos de tu cuenta"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{isEnglish ? "Username" : "Nombre de Usuario"}</p>
                  <p className="text-lg font-semibold">{user?.username}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{isEnglish ? "Belt" : "Cinta"}</p>
                  <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {isEnglish ? "Not assigned" : "Sin asignar"}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{isEnglish ? "Category" : "Categoría"}</p>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {isEnglish ? "No category" : "Sin categoría"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Si ya tiene alumnos, mostrar dashboard normal
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">{isEnglish ? "Welcome, " : "¡Bienvenido, "}{user?.nombre_completo}{isEnglish ? "!" : "!"}</h2>
          <p className="text-muted-foreground mt-1">{isEnglish ? "Your space in the Dojo" : "Tu espacio en el Dojo"}</p>
        </div>

        {/* Accesos rápidos para usuarios normales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ver Evaluaciones */}
          <Card 
            className="border-yellow-200 dark:border-yellow-800 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
            onClick={() => navigate("/evaluaciones")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-yellow-700 dark:text-yellow-400">{isEnglish ? "Evaluations" : "Evaluaciones"}</CardTitle>
                <div className="bg-yellow-600 dark:bg-yellow-500 p-3 rounded-2xl">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">{isEnglish ? "Check your evaluations" : "Consultar tus evaluaciones"}</CardDescription>
            </CardContent>
          </Card>

          {/* Ver Horarios */}
          <Card 
            className="border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
            onClick={() => navigate("/horarios")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-blue-700 dark:text-blue-400">{isEnglish ? "Schedules" : "Horarios"}</CardTitle>
                <div className="bg-blue-600 dark:bg-blue-500 p-3 rounded-2xl">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">{isEnglish ? "View class schedules" : "Ver horarios de clases"}</CardDescription>
            </CardContent>
          </Card>

          {/* Ver Pagos */}
          <Card 
            className="border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
            onClick={() => navigate("/pagos")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-green-700 dark:text-green-400">{isEnglish ? "Payments" : "Pagos"}</CardTitle>
                <div className="bg-green-600 dark:bg-green-500 p-3 rounded-2xl">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">{isEnglish ? "Manage your payments" : "Gestionar tus pagos"}</CardDescription>
            </CardContent>
          </Card>

          {/* Configuración */}
          <Card 
            className="border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
            onClick={() => navigate("/configuracion")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-purple-700 dark:text-purple-400">{isEnglish ? "Settings" : "Configuración"}</CardTitle>
                <div className="bg-purple-600 dark:bg-purple-500 p-3 rounded-2xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">{isEnglish ? "Customize interface" : "Personalizar interfaz"}</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Información del usuario */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>{isEnglish ? "Personal Information" : "Información Personal"}</CardTitle>
            <CardDescription>{isEnglish ? "Your data in the system" : "Tus datos en el sistema"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{isEnglish ? "Username" : "Nombre de Usuario"}</p>
                <p className="text-lg font-semibold">{user?.username}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{isEnglish ? "Belt" : "Cinta"}</p>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  {miAlumno?.cinta_nombre ? translateBelt(miAlumno.cinta_nombre, isEnglish) : (isEnglish ? 'Not assigned' : 'Sin asignar')}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{isEnglish ? "Category" : "Categoría"}</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {miAlumno?.categoria_edad_nombre || (isEnglish ? 'No category' : 'Sin categoría')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicador de tiempo hasta primer examen */}
        {miAlumno && (
          <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-indigo-950/30 dark:to-indigo-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 dark:bg-indigo-500 p-3 rounded-2xl">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-indigo-700 dark:text-indigo-400">{isEnglish ? "Your First Exam" : "Tu Primer Examen"}</CardTitle>
                    <CardDescription className="text-indigo-600 dark:text-indigo-300">
                      {isEnglish ? "Time remaining until you can take your first exam" : "Tiempo restante hasta poder presentar tu primer examen"}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrimerExamenMinimizado(!primerExamenMinimizado)}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/20"
                >
                  {primerExamenMinimizado ? (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      {isEnglish ? "Expand" : "Expandir"}
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      {isEnglish ? "Collapse" : "Colapsar"}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!primerExamenMinimizado && (() => {
                const examInfo = calculateExamTimeInfo(miAlumno, isEnglish);
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{examInfo.icon}</span>
                      <div>
                        <p className={`text-lg font-semibold ${examInfo.color}`}>
                          {examInfo.mensaje}
                        </p>
                        {examInfo.proximoExamenFecha && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {isEnglish ? "Estimated date: " : "Fecha estimada: "}{new Date(examInfo.proximoExamenFecha).toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {examInfo.tiempoPreparacionMeses && examInfo.proximoExamenFecha && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isEnglish ? "Preparation progress" : "Progreso de preparación"}
                          </span>
                          <div className="text-right">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {examInfo.tiempoPreparacionMeses} {isEnglish ? "months" : "meses"}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: (() => {
                                // Calcular progreso basado en días transcurridos
                                const fechaInicio = new Date(miAlumno.fecha_inscripcion || miAlumno.created_at);
                                const fechaExamen = new Date(examInfo.proximoExamenFecha);
                                const hoy = new Date();
                                
                                const diasTotales = Math.ceil((fechaExamen.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
                                const diasTranscurridos = Math.ceil((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
                                
                                const progreso = Math.max(0, Math.min(100, (diasTranscurridos / diasTotales) * 100));
                                return `${progreso}%`;
                              })()
                            }}
                          ></div>
                        </div>
                        {examInfo.categoria && examInfo.cinta && (
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            {isEnglish ? "Category: " : "Categoría: "}{examInfo.categoria} | {isEnglish ? "Belt: " : "Cinta: "}{translateBelt(examInfo.cinta, isEnglish)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {examInfo.puedePresentar && (
                      <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="text-green-800 dark:text-green-200 font-medium">
                          🎉 {isEnglish ? "You can now register for evaluations! Go to the Evaluations section to see available options." : "¡Ya puedes inscribirte en evaluaciones! Ve a la sección de Evaluaciones para ver las opciones disponibles."}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

      </div>
    );
  }

  // Vista para admin, sensei, y otros roles con permisos avanzados
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">{isEnglish ? "Main Panel" : "Panel Principal"}</h2>
        <p className="text-muted-foreground mt-1">{isEnglish ? "Welcome to the dojo management system" : "Bienvenido al sistema de gestión del dojo"}</p>
      </div>

      {/* Estadísticas - Solo para usuarios con permisos avanzados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tarjeta Alumnos */}
        <Card 
          className="border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
          onClick={() => navigate("/alumnos")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gray-800 dark:text-gray-200">{isEnglish ? "Students" : "Alumnos"}</CardTitle>
              <div className="bg-gray-800 dark:bg-gray-600 p-3 rounded-2xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{loading ? "..." : stats.alumnos}</p>
            <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">{isEnglish ? "Total students" : "Total de estudiantes"}</CardDescription>
          </CardContent>
        </Card>

        {/* Tarjeta Categorías */}
        <Card 
          className="border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
          onClick={() => navigate("/niveles")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-blue-700 dark:text-blue-400">{isEnglish ? "Categories" : "Categorías"}</CardTitle>
              <div className="bg-blue-600 dark:bg-blue-500 p-3 rounded-2xl">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-700 dark:text-blue-400">{loading ? "..." : stats.niveles}</p>
            <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">{isEnglish ? "Registered belts" : "Cinturones registrados"}</CardDescription>
          </CardContent>
        </Card>

        {/* Tarjeta Evaluaciones */}
        <Card 
          className="border-yellow-200 dark:border-yellow-800 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
          onClick={() => navigate("/evaluaciones")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-yellow-700 dark:text-yellow-400">{isEnglish ? "Evaluations" : "Evaluaciones"}</CardTitle>
              <div className="bg-yellow-500 dark:bg-yellow-600 p-3 rounded-2xl">
                <FileText className="h-6 w-6 text-white dark:text-gray-900" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{loading ? "..." : stats.evaluaciones}</p>
            <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">{isEnglish ? "Registered evaluations" : "Evaluaciones registradas"}</CardDescription>
          </CardContent>
        </Card>

        {/* Tarjeta Representantes */}
        <Card 
          className="border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
          onClick={() => navigate("/representantes")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-green-700 dark:text-green-400">{isEnglish ? "Representatives" : "Representantes"}</CardTitle>
              <div className="bg-green-600 dark:bg-green-500 p-3 rounded-2xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-700 dark:text-green-400">{loading ? "..." : stats.representantes}</p>
            <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">{isEnglish ? "Registered tutors" : "Tutores registrados"}</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos - Solo para admin, sensei, instructor, asistente */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>{isEnglish ? "Quick Access" : "Acceso Rápido"}</CardTitle>
          <CardDescription>{isEnglish ? "Main system actions" : "Acciones principales del sistema"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Botón Registrar Alumno - Solo personal autorizado */}
            <Card 
              className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-600 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate("/alumnos")}
            >
              <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <Users className="h-10 w-10 text-amber-700 dark:text-amber-500" />
                </div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{isEnglish ? "Register Student" : "Registrar Alumno"}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{isEnglish ? "Add new student" : "Añadir nuevo estudiante"}</p>
              </CardContent>
            </Card>

            {/* Botón Crear Evaluación - Solo instructores y superiores */}
            {(isAdmin || user?.rol === 'instructor' || user?.rol === 'asistente') && (
              <Card 
                className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate("/evaluaciones")}
              >
                <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <FileText className="h-10 w-10 text-blue-700 dark:text-blue-500" />
                  </div>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{isEnglish ? "Create Evaluation" : "Crear Evaluación"}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{isEnglish ? "New level test" : "Nueva prueba de nivel"}</p>
                </CardContent>
              </Card>
            )}

            {/* Botón Ver Reportes - Solo admin y sensei */}
            {(isAdmin || user?.rol === 'instructor') && (
              <Card 
                className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-600 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate("/reportes")}
              >
                <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <BarChart3 className="h-10 w-10 text-amber-700 dark:text-amber-500" />
                  </div>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{isEnglish ? "View Reports" : "Ver Reportes"}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{isEnglish ? "Dojo statistics" : "Estadísticas del dojo"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

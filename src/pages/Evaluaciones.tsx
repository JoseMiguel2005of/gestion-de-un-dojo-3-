import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ClipboardCheck, Trash2, Eye, Award, ChevronDown, ChevronUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EvaluacionForm } from "@/components/forms/EvaluacionForm";
import { calculateExamTimeInfo } from "@/utils/timeUtils";
import { useLanguage, getTranslation, translateBelt } from "@/hooks/useLanguage";

export default function Evaluaciones() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const isAdmin = user?.rol === 'admin';
  const canCreateEvaluation = ['admin', 'instructor', 'asistente'].includes(user?.rol || '');
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verDialogOpen, setVerDialogOpen] = useState(false);
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState<any>(null);
  const [miAlumno, setMiAlumno] = useState<any>(null);
  const [listaMinimizada, setListaMinimizada] = useState(true);

  useEffect(() => {
    fetchEvaluaciones();
    if (user?.rol === 'usuario') {
      fetchMiAlumno();
    }
  }, [user]);

  const fetchEvaluaciones = async () => {
    try {
      const evaluaciones = await apiClient.getEvaluaciones();
      // Asegurar que siempre sea un array
      const evaluacionesArray = Array.isArray(evaluaciones) ? evaluaciones : [];
      setEvaluaciones(evaluacionesArray);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las evaluaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMiAlumno = async () => {
    try {
      const alumnos = await apiClient.getAlumnos();
      const miAlumno = alumnos.find((alumno: any) => alumno.usuario_id === user?.id);
      setMiAlumno(miAlumno);
    } catch (error: any) {
      console.error('Error cargando información del alumno:', error);
    }
  };

  const handleDelete = async (evaluacionId: string) => {
    if (!confirm(isEnglish ? 'Are you sure you want to delete this evaluation? This action cannot be undone.' : '¿Estás seguro de eliminar esta evaluación? Esta acción no se puede deshacer.')) return;
    
    try {
      await apiClient.delete(`/evaluaciones/${evaluacionId}`);
      toast({
        title: isEnglish ? "Evaluation deleted" : "Evaluación eliminada",
        description: isEnglish ? "Evaluation deleted successfully" : "La evaluación se eliminó correctamente",
      });
      fetchEvaluaciones();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not delete evaluation" : "No se pudo eliminar la evaluación"),
        variant: "destructive",
      });
    }
  };

  const handleVerEvaluacion = (evaluacion: any) => {
    setEvaluacionSeleccionada(evaluacion);
    setVerDialogOpen(true);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            {canCreateEvaluation ? (isEnglish ? 'Evaluation ' : 'Gestión ') : (isEnglish ? 'My ' : 'Mis ')}
            <span className="text-orange-600 dark:text-orange-400">
              {canCreateEvaluation ? (isEnglish ? 'Management' : 'de Evaluaciones') : (isEnglish ? 'Evaluations' : 'Evaluaciones')}
            </span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {canCreateEvaluation ? (isEnglish ? 'Manage exams and promotions' : 'Administra exámenes y promociones') : (isEnglish ? 'Check your scheduled exams' : 'Consulta tus exámenes programados')}
          </p>
        </div>
        {canCreateEvaluation && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="h-4 w-4" />
                {isEnglish ? "Create Evaluation" : "Crear Evaluación"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{isEnglish ? "Create New Evaluation" : "Crear Nueva Evaluación"}</DialogTitle>
                <DialogDescription>
                  {isEnglish ? "Select the exam type and eligible students." : "Selecciona el tipo de examen y los alumnos elegibles."}
                </DialogDescription>
              </DialogHeader>
              <EvaluacionForm
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchEvaluaciones();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Indicador de tiempo hasta primer examen para usuarios normales */}
      {user?.rol === 'usuario' && miAlumno && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-indigo-950/30 dark:to-indigo-900/20">
          <CardHeader>
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
          </CardHeader>
          <CardContent>
            {(() => {
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
                        🎉 {isEnglish ? "You can now register for evaluations! Check the available evaluations below." : "¡Ya puedes inscribirte en evaluaciones! Revisa las evaluaciones disponibles abajo."}
                      </p>
                    </div>
                  )}
                  
                  {!examInfo.puedePresentar && examInfo.tiempoRestante && (
                    <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        💡 {isEnglish ? "Meanwhile, you can review available evaluations to familiarize yourself with the process." : "Mientras tanto, puedes revisar las evaluaciones disponibles para familiarizarte con el proceso."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100/30 dark:from-orange-950/30 dark:to-orange-900/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-orange-700 dark:text-orange-400">{isEnglish ? "Evaluation List" : "Lista de Evaluaciones"}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setListaMinimizada(!listaMinimizada)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950/20"
            >
              {listaMinimizada ? (
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
          <CardDescription className="text-gray-600 dark:text-gray-300">{evaluaciones.length} {isEnglish ? "evaluation(s) registered" : "evaluación(es) registrada(s)"}</CardDescription>
        </CardHeader>
        <CardContent>
          {!listaMinimizada && (
            <Table>
            <TableHeader>
              <TableRow className="border-orange-200 dark:border-orange-800">
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Name" : "Nombre"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Date" : "Fecha"}</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Time" : "Hora"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Category" : "Categoría"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Status" : "Estado"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Actions" : "Acciones"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isEnglish ? "Loading..." : "Cargando..."}
                  </TableCell>
                </TableRow>
              ) : !Array.isArray(evaluaciones) ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isEnglish ? "Error: Invalid data format" : "Error: Formato de datos inválido"}
                  </TableCell>
                </TableRow>
              ) : evaluaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isEnglish ? "No evaluations registered" : "No hay evaluaciones registradas"}
                  </TableCell>
                </TableRow>
              ) : (
                evaluaciones.map((evaluacion) => (
                  <TableRow key={evaluacion.id} className="border-orange-100 dark:border-orange-900 hover:bg-orange-50/30 dark:hover:bg-orange-950/20">
                    <TableCell className="font-medium">{evaluacion.nombre}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {format(new Date(evaluacion.fecha), isEnglish ? "MM/dd/yyyy" : "dd/MM/yyyy", { locale: isEnglish ? undefined : es })}
                    </TableCell>
                    <TableCell>
                      {evaluacion.hora ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          🕐 {new Date(`2000-01-01T${evaluacion.hora}`).toLocaleTimeString(isEnglish ? 'en-US' : 'es-ES', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          ⏰ {isEnglish ? "No time" : "Sin hora"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {evaluacion.categoria_examen || (isEnglish ? "All categories" : "Todas las categorías")}
                    </TableCell>
                    <TableCell>
                      <span className={evaluacion.estado === "pendiente" ? "text-yellow-600 dark:text-yellow-400 font-medium" : "text-green-600 dark:text-green-400 font-medium"}>
                        {evaluacion.estado === "pendiente" ? (isEnglish ? "Pending" : "Pendiente") : (isEnglish ? "Completed" : "Completado")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleVerEvaluacion(evaluacion)}
                          className="border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {isEnglish ? "View" : "Ver"}
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(evaluacion.id)}
                            className="border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para ver detalles de evaluación */}
      <Dialog open={verDialogOpen} onOpenChange={setVerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEnglish ? "Evaluation Details" : "Detalles de la Evaluación"}</DialogTitle>
            <DialogDescription>
              {isEnglish ? "Complete information of the selected evaluation" : "Información completa de la evaluación seleccionada"}
            </DialogDescription>
          </DialogHeader>
          {evaluacionSeleccionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? "Name:" : "Nombre:"}</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{evaluacionSeleccionada.nombre}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? "Date:" : "Fecha:"}</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {format(new Date(evaluacionSeleccionada.fecha), isEnglish ? "MM/dd/yyyy" : "dd/MM/yyyy", { locale: isEnglish ? undefined : es })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? "Time:" : "Hora:"}</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {evaluacionSeleccionada.hora 
                      ? new Date(`2000-01-01T${evaluacionSeleccionada.hora}`).toLocaleTimeString(isEnglish ? 'en-US' : 'es-ES', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })
                      : (isEnglish ? "Not specified" : "No especificada")
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? "Category:" : "Categoría:"}</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {evaluacionSeleccionada.categoria_examen || (isEnglish ? "All categories" : "Todas las categorías")}
                  </p>
                </div>
              </div>
              {evaluacionSeleccionada.descripcion && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? "Description:" : "Descripción:"}</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    {evaluacionSeleccionada.descripcion}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? "Status:" : "Estado:"}</label>
                <p className={`text-sm font-medium mt-1 ${
                  evaluacionSeleccionada.estado === "pendiente" 
                    ? "text-yellow-600 dark:text-yellow-400" 
                    : "text-green-600 dark:text-green-400"
                }`}>
                  {evaluacionSeleccionada.estado === "pendiente" ? (isEnglish ? "Pending" : "Pendiente") : (isEnglish ? "Completed" : "Completado")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

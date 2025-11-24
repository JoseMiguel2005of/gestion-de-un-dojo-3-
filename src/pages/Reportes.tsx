import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, ClipboardCheck, TrendingUp, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage, getTranslation } from "@/hooks/useLanguage";

export default function Reportes() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const [stats, setStats] = useState({
    totalAlumnos: 0,
    alumnosActivos: 0,
    totalNiveles: 0,
    totalRepresentantes: 0,
    totalEvaluaciones: 0,
  });
  const [alumnosPorNivel, setAlumnosPorNivel] = useState<any[]>([]);
  const [evaluacionesRecientes, setEvaluacionesRecientes] = useState<any[]>([]);
  
  // Estados para el modal de alumnos por categoría
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<any>(null);
  const [alumnosEnCategoria, setAlumnosEnCategoria] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchAlumnosPorNivel();
    fetchEvaluacionesRecientes();
  }, []);

  const fetchStats = async () => {
    try {
      const [alumnos, niveles, evaluaciones, representantes] = await Promise.all([
        apiClient.getAlumnos(),
        apiClient.getNiveles(),
        apiClient.getEvaluaciones(),
        apiClient.getRepresentantes(),
      ]);

      const alumnosActivos = alumnos.filter(alumno => alumno.estado === 1);

      setStats({
        totalAlumnos: alumnos.length || 0,
        alumnosActivos: alumnosActivos.length || 0,
        totalNiveles: niveles.length || 0,
        totalRepresentantes: representantes.length || 0,
        totalEvaluaciones: evaluaciones.length || 0,
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const fetchAlumnosPorNivel = async () => {
    try {
      const [categoriasEdad, cintas, alumnos] = await Promise.all([
        apiClient.getCategoriasEdad(),
        apiClient.getCintas(),
        apiClient.getAlumnos()
      ]);
      
      // Crear combinaciones de categoría de edad y cinta
      const combinaciones: any[] = [];
      
      categoriasEdad.forEach((categoria: any) => {
        cintas.forEach((cinta: any) => {
          combinaciones.push({
            id: `${categoria.id}_${cinta.id}`,
            nivel: categoria.nombre,
            cinta: cinta.nombre,
            id_categoria_edad: categoria.id,
            id_cinta: cinta.id,
            cantidad: 0
          });
        });
      });
      
      // Contar alumnos por combinación de categoría y cinta
      const alumnosActivos = alumnos.filter((alumno: any) => {
        // El estado puede ser true/false (booleano) o 1/0 (número)
        return alumno.estado === true || alumno.estado === 1;
      });
      
      combinaciones.forEach(combinacion => {
        const count = alumnosActivos.filter((alumno: any) => 
          alumno.id_categoria_edad === combinacion.id_categoria_edad &&
          alumno.id_cinta === combinacion.id_cinta
        ).length;
        combinacion.cantidad = count;
      });
      
      // Filtrar solo las combinaciones que tienen alumnos
      const combinacionesConAlumnos = combinaciones.filter(c => c.cantidad > 0);
      
      setAlumnosPorNivel(combinacionesConAlumnos);
    } catch (error) {
      console.error('Error cargando alumnos por nivel:', error);
    }
  };

  const fetchEvaluacionesRecientes = async () => {
    try {
      const evaluaciones = await apiClient.getEvaluaciones();
      const evaluacionesOrdenadas = evaluaciones
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 5);
      setEvaluacionesRecientes(evaluacionesOrdenadas);
    } catch (error) {
      console.error('Error cargando evaluaciones recientes:', error);
    }
  };

  const verAlumnosEnCategoria = async (categoria: any) => {
    try {
      setCategoriaSeleccionada(categoria);
      const alumnos = await apiClient.getAlumnos();
      const alumnosEnCategoria = alumnos.filter((alumno: any) => {
        // El estado puede ser true/false (booleano) o 1/0 (número)
        const estadoActivo = alumno.estado === true || alumno.estado === 1;
        return estadoActivo &&
          alumno.id_categoria_edad === categoria.id_categoria_edad &&
          alumno.id_cinta === categoria.id_cinta;
      });
      setAlumnosEnCategoria(alumnosEnCategoria);
      setModalAbierto(true);
    } catch (error) {
      console.error('Error cargando alumnos de la categoría:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">
          <span className="text-orange-700 dark:text-orange-400">{isEnglish ? "Reports" : "Reportes"}</span> <span className="text-purple-600 dark:text-purple-400">{isEnglish ? "and Statistics" : "y Estadísticas"}</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">{isEnglish ? "Dojo analysis and metrics" : "Análisis y métricas del dojo"}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Total Alumnos */}
        <Card className="border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <CardTitle className="text-sm text-gray-700 dark:text-gray-300">{isEnglish ? "Total Students" : "Total Alumnos"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalAlumnos}</div>
          </CardContent>
        </Card>

        {/* Categorías */}
        <Card className="border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-sm text-yellow-700 dark:text-yellow-400">{isEnglish ? "Categories" : "Categorías"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{stats.totalNiveles}</div>
          </CardContent>
        </Card>

        {/* Representantes */}
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-sm text-green-700 dark:text-green-400">{isEnglish ? "Representatives" : "Representantes"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.totalRepresentantes}</div>
          </CardContent>
        </Card>

        {/* Evaluaciones */}
        <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-sm text-orange-700 dark:text-orange-400">{isEnglish ? "Evaluations" : "Evaluaciones"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">{stats.totalEvaluaciones}</div>
          </CardContent>
        </Card>

        {/* Promociones */}
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-sm text-blue-700 dark:text-blue-400">{isEnglish ? "Promotions" : "Promociones"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">-</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-blue-700 dark:text-blue-400">{isEnglish ? "Students by Category" : "Alumnos por Categoría"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-blue-200 dark:border-blue-800">
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Level" : "Nivel"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Belt" : "Cinta"}</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">{isEnglish ? "Quantity" : "Cantidad"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnosPorNivel.map((nivel) => (
                <TableRow 
                  key={nivel.id} 
                  className={`border-blue-100 dark:border-blue-900 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 ${
                    user?.rol === 'admin' && nivel.cantidad > 0 ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => user?.rol === 'admin' && nivel.cantidad > 0 && verAlumnosEnCategoria(nivel)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {nivel.nivel}
                      {user?.rol === 'admin' && nivel.cantidad > 0 && (
                        <Eye className="w-4 h-4 text-blue-500 opacity-60" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-700 dark:text-gray-300">{nivel.cinta || "-"}</TableCell>
                  <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">{nivel.cantidad}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/30 dark:to-orange-900/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <CardTitle className="text-orange-700 dark:text-orange-400">{isEnglish ? "Recent Evaluations" : "Evaluaciones Recientes"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-orange-200 dark:border-orange-800">
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Name" : "Nombre"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Date" : "Fecha"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Category" : "Categoría"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Status" : "Estado"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluacionesRecientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No hay evaluaciones recientes
                  </TableCell>
                </TableRow>
              ) : (
                evaluacionesRecientes.map((ev) => (
                  <TableRow key={ev.id} className="border-orange-100 dark:border-orange-900 hover:bg-orange-50/30 dark:hover:bg-orange-950/20">
                    <TableCell className="font-medium">{ev.nombre}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{new Date(ev.fecha).toLocaleDateString()}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{ev.categoria_examen || ev.niveles || "-"}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{ev.estado}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal para ver alumnos por categoría */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-700 dark:text-blue-400">
              Alumnos en {categoriaSeleccionada?.nivel} - {categoriaSeleccionada?.cinta}
            </DialogTitle>
            <DialogDescription>
              Lista de todos los alumnos activos en esta categoría ({alumnosEnCategoria.length} alumnos)
            </DialogDescription>
          </DialogHeader>
          
          {alumnosEnCategoria.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay alumnos activos en esta categoría
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fecha de Nacimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alumnosEnCategoria.map((alumno) => (
                  <TableRow key={alumno.id}>
                    <TableCell className="font-medium">{alumno.nombre}</TableCell>
                    <TableCell className="font-mono text-sm">{alumno.cedula}</TableCell>
                    <TableCell>{alumno.telefono || "-"}</TableCell>
                    <TableCell>{alumno.email || "-"}</TableCell>
                    <TableCell>
                      {alumno.fecha_nacimiento 
                        ? new Date(alumno.fecha_nacimiento).toLocaleDateString()
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        alumno.estado === 1 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {alumno.estado === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

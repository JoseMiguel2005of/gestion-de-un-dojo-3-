import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Eye, Users, Trash2, RotateCcw, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlumnoForm } from "@/components/forms/AlumnoForm";
import { AlumnoEditForm } from "@/components/forms/AlumnoEditForm";
import { AlumnoDetalle } from "@/components/AlumnoDetalle";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage, getTranslation, translateBelt } from "@/hooks/useLanguage";

export default function Alumnos() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const isAdmin = user?.rol === 'admin';
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [alumnosEliminados, setAlumnosEliminados] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detalleDialogOpen, setDetalleDialogOpen] = useState(false);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<"nombre" | "cedula">("nombre");
  const [activeTab, setActiveTab] = useState("activos");

  useEffect(() => {
    fetchAlumnos();
    fetchAlumnosEliminados(); // Cargar eliminados al inicio
  }, []);

  useEffect(() => {
    if (activeTab === "eliminados") {
      fetchAlumnosEliminados();
    }
  }, [activeTab]);

  const fetchAlumnos = async () => {
    try {
      const alumnos = await apiClient.getAlumnos();
      setAlumnos(alumnos || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los alumnos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumnosEliminados = async () => {
    try {
      const eliminados = await apiClient.getAlumnosEliminados();
      setAlumnosEliminados(eliminados || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los alumnos eliminados",
        variant: "destructive",
      });
    }
  };

  const filteredAlumnos = alumnos.filter((alumno) => {
    if (searchType === "cedula") {
      return (alumno.cedula || "").toLowerCase().includes(searchTerm.toLowerCase());
    }
    return `${alumno.nombre} ${alumno.apellido}`.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleEdit = (alumnoId: string) => {
    setSelectedAlumnoId(alumnoId);
    setEditDialogOpen(true);
  };

  const handleDetalle = (alumnoId: string) => {
    setSelectedAlumnoId(alumnoId);
    setDetalleDialogOpen(true);
  };

  const handleDelete = async (alumnoId: string) => {
    if (!confirm(isEnglish ? 'Are you sure you want to delete this student? You can restore it from the "Deleted" tab.' : '¿Estás seguro de eliminar este alumno? Podrás restaurarlo desde la pestaña "Eliminados".')) return;
    
    try {
      await apiClient.deleteAlumno(alumnoId);
      toast({
        title: isEnglish ? "Student deleted" : "Alumno eliminado",
        description: isEnglish ? "Student moved to deleted" : "El alumno se movió a eliminados",
      });
      fetchAlumnos();
      fetchAlumnosEliminados(); // Actualizar contador de eliminados
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not delete student" : "No se pudo eliminar el alumno"),
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (alumnoId: string) => {
    if (!confirm(isEnglish ? 'Restore this student?' : '¿Restaurar este alumno?')) return;
    
    try {
      await apiClient.restaurarAlumno(alumnoId);
      toast({
        title: isEnglish ? "Student restored" : "Alumno restaurado",
        description: isEnglish ? "Student restored successfully" : "El alumno se restauró exitosamente",
      });
      fetchAlumnosEliminados();
      fetchAlumnos();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not restore student" : "No se pudo restaurar el alumno"),
        variant: "destructive",
      });
    }
  };

  const handleDeletePermanente = async (alumnoId: string, nombreAlumno: string) => {
    if (!confirm(
      isEnglish 
        ? `⚠️ WARNING: This action is IRREVERSIBLE!\n\nYou are about to PERMANENTLY DELETE student "${nombreAlumno}".\n\nAll their records, payments, and evaluations will be deleted forever.\n\nAre you absolutely sure?`
        : `⚠️ ADVERTENCIA: ¡Esta acción es IRREVERSIBLE!\n\nEstás a punto de ELIMINAR PERMANENTEMENTE al alumno "${nombreAlumno}".\n\nTodos sus registros, pagos y evaluaciones se eliminarán para siempre.\n\n¿Estás absolutamente seguro?`
    )) return;
    
    try {
      await apiClient.deleteAlumnoPermanente(alumnoId);
      toast({
        title: isEnglish ? "Student permanently deleted" : "Alumno eliminado permanentemente",
        description: isEnglish ? "The student has been permanently deleted from the database" : "El alumno ha sido eliminado permanentemente de la base de datos",
      });
      fetchAlumnosEliminados();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not delete student permanently" : "No se pudo eliminar el alumno permanentemente"),
        variant: "destructive",
      });
    }
  };

  const handleChangeNivel = async (alumnoId: string, categoriaEdadId: string) => {
    try {
      await apiClient.updateAlumno(alumnoId, { id_categoria_edad: categoriaEdadId });

      toast({
        title: isEnglish ? "Success" : "Éxito",
        description: isEnglish ? "Level updated correctly" : "Nivel actualizado correctamente",
      });
      fetchAlumnos();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleChangeEstado = async (alumnoId: string, estado: boolean) => {
    try {
      await apiClient.updateAlumno(alumnoId, { estado: estado ? 1 : 0 });

      toast({
        title: isEnglish ? "Success" : "Éxito",
        description: isEnglish ? `Student marked as ${estado ? "active" : "inactive"}` : `Alumno marcado como ${estado ? "activo" : "inactivo"}`,
      });
      fetchAlumnos();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">{isEnglish ? "Student" : "Gestión"} <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{isEnglish ? "Management" : "de Alumnos"}</span></h2>
          <p className="text-indigo-200 mt-1">{isEnglish ? "Manage dojo students" : "Administra los estudiantes del dojo"}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white shadow-xl shadow-purple-500/30">
              <Plus className="h-4 w-4" />
              {isEnglish ? "Register Student" : "Registrar Alumno"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEnglish ? "Register New Student" : "Registrar Nuevo Alumno"}</DialogTitle>
              <DialogDescription>
                {isEnglish ? "Complete the form to register a new student in the dojo." : "Completa el formulario para registrar un nuevo alumno en el dojo."}
              </DialogDescription>
            </DialogHeader>
            <AlumnoForm
              onSuccess={() => {
                setDialogOpen(false);
                fetchAlumnos();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-300" />
            <GlassCardTitle>{isEnglish ? "Search Student" : "Buscar Alumno"}</GlassCardTitle>
          </div>
          <GlassCardDescription>{isEnglish ? "Find students by name, last name or ID" : "Encuentra alumnos por nombre, apellido o cédula"}</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex gap-4">
            <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nombre">{isEnglish ? "By Name" : "Por Nombre"}</SelectItem>
                <SelectItem value="cedula">{isEnglish ? "By ID" : "Por Cédula"}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-purple-300" />
              <Input
                placeholder={searchType === "nombre" ? (isEnglish ? "Search by name..." : "Buscar por nombre...") : (isEnglish ? "Search by ID..." : "Buscar por cédula...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-indigo-300"
              />
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="activos">
            {isEnglish ? "Active Students" : "Alumnos Activos"} ({filteredAlumnos.length})
          </TabsTrigger>
          <TabsTrigger value="eliminados">
            {isEnglish ? "Deleted" : "Eliminados"} ({alumnosEliminados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activos">
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>{isEnglish ? "Student List" : "Lista de Alumnos"}</GlassCardTitle>
              <GlassCardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {filteredAlumnos.length} {isEnglish ? "student(s) found" : "alumno(s) encontrado(s)"}
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "ID" : "Cédula"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Name" : "Nombre"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Category" : "Categoría"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Belt" : "Cinta"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Instructor" : "Instructor"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Status" : "Estado"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Actions" : "Acciones"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-indigo-300">
                        {isEnglish ? "Loading..." : "Cargando..."}
                      </TableCell>
                    </TableRow>
                  ) : filteredAlumnos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-indigo-300">
                        {isEnglish ? "No students registered" : "No hay alumnos registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlumnos.map((alumno) => (
                      <TableRow key={alumno.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-mono text-sm text-white">{alumno.cedula || "N/A"}</TableCell>
                        <TableCell className="font-medium text-white">
                          {alumno.nombre} {alumno.apellido}
                        </TableCell>
                        <TableCell className="text-purple-300 font-medium">{alumno.categoria_edad_nombre || (isEnglish ? "No category" : "Sin categoría")}</TableCell>
                        <TableCell className="text-indigo-200">{alumno.cinta_nombre ? translateBelt(alumno.cinta_nombre, isEnglish) : "-"}</TableCell>
                        <TableCell className="text-blue-300 font-medium">{alumno.instructor_nombre || (isEnglish ? "Not assigned" : "Sin asignar")}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={alumno.estado ? "default" : "secondary"}
                            className={alumno.estado ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" : "bg-gray-500"}
                          >
                            {alumno.estado ? (isEnglish ? "Active" : "Activo") : (isEnglish ? "Inactive" : "Inactivo")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDetalle(alumno.id)}
                              className="hover:bg-white/20 text-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEdit(alumno.id)}
                              className="border-white/30 bg-white/10 hover:bg-white/20 text-white"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {isEnglish ? "Edit" : "Editar"}
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(alumno.id)}
                                className="border-red-400/50 bg-red-500/20 hover:bg-red-500/30 text-red-300"
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
            </GlassCardContent>
          </GlassCard>
        </TabsContent>

        <TabsContent value="eliminados">
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>{isEnglish ? "Deleted Students" : "Alumnos Eliminados"}</GlassCardTitle>
              <GlassCardDescription className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                {alumnosEliminados.length} {isEnglish ? "student(s) deleted" : "alumno(s) eliminado(s)"}
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "ID" : "Cédula"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Name" : "Nombre"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Category" : "Categoría"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Instructor" : "Instructor"}</TableHead>
                    <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Actions" : "Acciones"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alumnosEliminados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-indigo-300">
                        {isEnglish ? "No deleted students" : "No hay alumnos eliminados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    alumnosEliminados.map((alumno) => (
                      <TableRow key={alumno.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-mono text-sm text-white">{alumno.cedula || "N/A"}</TableCell>
                        <TableCell className="font-medium text-white">
                          {alumno.nombre} {alumno.apellido}
                        </TableCell>
                        <TableCell className="text-purple-300 font-medium">{alumno.categoria_edad_nombre || (isEnglish ? "No category" : "Sin categoría")}</TableCell>
                        <TableCell className="text-blue-300 font-medium">{alumno.instructor_nombre || (isEnglish ? "Not assigned" : "Sin asignar")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleRestore(alumno.id)}
                              className="border-green-400/50 bg-green-500/20 hover:bg-green-500/30 text-green-300"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              {isEnglish ? "Restore" : "Restaurar"}
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeletePermanente(alumno.id, alumno.nombre)}
                                className="border-red-600/50 bg-red-600/20 hover:bg-red-600/40 text-red-400"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                {isEnglish ? "Delete Forever" : "Eliminar Definitivamente"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </GlassCardContent>
          </GlassCard>
        </TabsContent>
      </Tabs>

      <GlassCard style={{display: 'none'}}>
        <GlassCardHeader>
          <GlassCardTitle>Lista de Alumnos</GlassCardTitle>
          <GlassCardDescription className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {filteredAlumnos.length} alumno(s) encontrado(s)
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/5">
                <TableHead className="text-indigo-200 font-semibold">Cédula</TableHead>
                <TableHead className="text-indigo-200 font-semibold">Nombre</TableHead>
                <TableHead className="text-indigo-200 font-semibold">Categoría</TableHead>
                <TableHead className="text-indigo-200 font-semibold">Cinta</TableHead>
                <TableHead className="text-indigo-200 font-semibold">Instructor</TableHead>
                <TableHead className="text-indigo-200 font-semibold">Estado</TableHead>
                <TableHead className="text-indigo-200 font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-indigo-300">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredAlumnos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-indigo-300">
                    No hay alumnos registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlumnos.map((alumno) => (
                  <TableRow key={alumno.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-mono text-sm text-white">{alumno.cedula || "N/A"}</TableCell>
                    <TableCell className="font-medium text-white">
                      {alumno.nombre} {alumno.apellido}
                    </TableCell>
                    <TableCell className="text-purple-300 font-medium">{alumno.niveles?.nombre || "Sin categoría"}</TableCell>
                    <TableCell className="text-indigo-200">{alumno.niveles?.color || "-"}</TableCell>
                    <TableCell className="text-blue-300 font-medium">{alumno.instructor_nombre || "Sin asignar"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={alumno.estado ? "default" : "secondary"}
                        className={alumno.estado ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" : "bg-gray-500"}
                      >
                        {alumno.estado ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDetalle(alumno.id)}
                          className="hover:bg-white/20 text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(alumno.id)}
                          className="border-white/30 bg-white/10 hover:bg-white/20 text-white"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(alumno.id)}
                            className="border-red-400/50 bg-red-500/20 hover:bg-red-500/30 text-red-300"
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
        </GlassCardContent>
      </GlassCard>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEnglish ? "Edit Student" : "Editar Alumno"}</DialogTitle>
            <DialogDescription>
              {isEnglish ? "Modify student data" : "Modifica los datos del alumno"}
            </DialogDescription>
          </DialogHeader>
          {selectedAlumnoId && (
            <AlumnoEditForm
              alumnoId={selectedAlumnoId}
              onSuccess={() => {
                setEditDialogOpen(false);
                fetchAlumnos();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detalleDialogOpen} onOpenChange={setDetalleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEnglish ? "Student Details" : "Detalle del Alumno"}</DialogTitle>
          </DialogHeader>
          {selectedAlumnoId && <AlumnoDetalle alumnoId={selectedAlumnoId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Users, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RepresentanteForm } from "@/components/forms/RepresentanteForm";
import { RepresentanteEditForm } from "@/components/forms/RepresentanteEditForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage, getTranslation } from "@/hooks/useLanguage";

export default function Representantes() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const isAdmin = user?.rol === 'admin';
  const [representantes, setRepresentantes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRepresentanteId, setSelectedRepresentanteId] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<"nombre" | "cedula">("nombre");

  useEffect(() => {
    fetchRepresentantes();
  }, []);

  const fetchRepresentantes = async () => {
    try {
      const representantes = await apiClient.getRepresentantes();
      setRepresentantes(representantes || []);
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: isEnglish ? "Could not load representatives" : "No se pudieron cargar los representantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRepresentantes = representantes.filter((rep) => {
    if (searchType === "cedula") {
      return (rep.cedula || "").toLowerCase().includes(searchTerm.toLowerCase());
    }
    return `${rep.nombre} ${rep.apellido}`.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleEdit = (representanteId: string) => {
    setSelectedRepresentanteId(representanteId);
    setEditDialogOpen(true);
  };

  const handleDelete = async (representanteId: string) => {
    if (!confirm(isEnglish ? 'Are you sure you want to delete this representative? This action cannot be undone.' : '¿Estás seguro de eliminar este representante? Esta acción no se puede deshacer.')) return;
    
    try {
      await apiClient.delete(`/representantes/${representanteId}`);
      toast({
        title: isEnglish ? "Representative deleted" : "Representante eliminado",
        description: isEnglish ? "Representative deleted successfully" : "El representante se eliminó correctamente",
      });
      fetchRepresentantes();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not delete representative" : "No se pudo eliminar el representante"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{isEnglish ? "Representative" : "Gestión"} <span className="text-green-600 dark:text-green-400">{isEnglish ? "Management" : "de Representantes"}</span></h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{isEnglish ? "Manage student representatives" : "Administra los representantes de los alumnos"}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4" />
              {isEnglish ? "Register Representative" : "Registrar Representante"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEnglish ? "Register New Representative" : "Registrar Nuevo Representante"}</DialogTitle>
              <DialogDescription>
                {isEnglish ? "Complete the form to register a new representative." : "Completa el formulario para registrar un nuevo representante."}
              </DialogDescription>
            </DialogHeader>
            <RepresentanteForm
              onSuccess={() => {
                setDialogOpen(false);
                fetchRepresentantes();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle className="text-green-700 dark:text-green-400">{isEnglish ? "Search Representative" : "Buscar Representante"}</CardTitle>
          </div>
          <CardDescription className="text-gray-600 dark:text-gray-300">{isEnglish ? "Find representatives by name, last name or ID" : "Encuentra representantes por nombre, apellido o cédula"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
              <SelectTrigger className="w-[180px] border-green-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nombre">{isEnglish ? "By Name" : "Por Nombre"}</SelectItem>
                <SelectItem value="cedula">{isEnglish ? "By ID" : "Por Cédula"}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-green-400" />
              <Input
                placeholder={searchType === "nombre" ? (isEnglish ? "Search by name..." : "Buscar por nombre...") : (isEnglish ? "Search by ID..." : "Buscar por cédula...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-green-300 focus:border-green-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-green-50 to-white dark:from-green-950/30 dark:to-gray-800">
          <CardTitle className="text-green-700 dark:text-green-400">{isEnglish ? "Representative List" : "Lista de Representantes"}</CardTitle>
          <CardDescription className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Users className="h-4 w-4" />
            {filteredRepresentantes.length} {isEnglish ? "representative(s) found" : "representante(s) encontrado(s)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-gray-700">
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "ID" : "Cédula"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Name" : "Nombre"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Phone" : "Teléfono"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Email" : "Email"}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{isEnglish ? "Actions" : "Acciones"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {isEnglish ? "Loading..." : "Cargando..."}
                  </TableCell>
                </TableRow>
              ) : filteredRepresentantes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {isEnglish ? "No representatives registered" : "No hay representantes registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRepresentantes.map((rep) => (
                  <TableRow key={rep.id} className="hover:bg-green-50/30 dark:hover:bg-green-950/20">
                    <TableCell className="font-mono text-sm text-gray-700 dark:text-gray-300">{rep.cedula || "N/A"}</TableCell>
                    <TableCell className="font-medium">
                      {rep.nombre} {rep.apellido}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{rep.telefono || "-"}</TableCell>
                    <TableCell className="text-blue-600 dark:text-blue-400">{rep.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(rep.id)}
                          className="border-gray-300"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {isEnglish ? "Edit" : "Editar"}
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(rep.id)}
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
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEnglish ? "Edit Representative" : "Editar Representante"}</DialogTitle>
            <DialogDescription>
              {isEnglish ? "Modify representative data" : "Modifica los datos del representante"}
            </DialogDescription>
          </DialogHeader>
          {selectedRepresentanteId && (
            <RepresentanteEditForm
              representanteId={selectedRepresentanteId}
              onSuccess={() => {
                setEditDialogOpen(false);
                fetchRepresentantes();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

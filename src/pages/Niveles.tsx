import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Plus, Edit, Trash2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NivelForm } from "@/components/forms/NivelForm";
import { NivelEditForm } from "@/components/forms/NivelEditForm";
import { useLanguage, getTranslation } from "@/hooks/useLanguage";

export default function Niveles() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const isAdmin = user?.rol === 'admin';
  const [niveles, setNiveles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNivelId, setSelectedNivelId] = useState<string | null>(null);
  const [infoCintasExpandida, setInfoCintasExpandida] = useState(true);

  const handleEdit = (nivelId: string) => {
    setSelectedNivelId(nivelId);
    setEditDialogOpen(true);
  };

  const handleDelete = async (nivelId: string) => {
    if (!confirm(isEnglish ? 'Are you sure you want to delete this category? This action cannot be undone.' : '¿Estás seguro de eliminar esta categoría? Esta acción no se puede deshacer.')) return;
    
    try {
      await apiClient.delete(`/niveles/${nivelId}`);
      toast({
        title: isEnglish ? "Category deleted" : "Categoría eliminada",
        description: isEnglish ? "Category deleted successfully" : "La categoría se eliminó correctamente",
      });
      fetchNiveles();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not delete category" : "No se pudo eliminar la categoría"),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchNiveles();
  }, []);

  const fetchNiveles = async () => {
    try {
      const niveles = await apiClient.getNiveles();
      setNiveles(niveles || []);
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: isEnglish ? "Could not load levels" : "No se pudieron cargar los niveles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">{isEnglish ? "Category" : "Gestión de"} <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">{isEnglish ? "Management" : "Categorías"}</span></h2>
          <p className="text-indigo-200 mt-1">{isEnglish ? "Manage dojo belts and ranks" : "Administra los cinturones y rangos del dojo"}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white shadow-xl shadow-yellow-500/30">
              <Plus className="h-4 w-4" />
              {isEnglish ? "Create Category" : "Crear Categoría"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEnglish ? "Create New Category" : "Crear Nueva Categoría"}</DialogTitle>
              <DialogDescription>
                {isEnglish ? "Define a new belt category for the dojo." : "Define una nueva categoría de cinturón para el dojo."}
              </DialogDescription>
            </DialogHeader>
            <NivelForm
              onSuccess={() => {
                setDialogOpen(false);
                fetchNiveles();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Card informativa sobre cintas máximas */}
      <GlassCard>
        <GlassCardHeader className="cursor-pointer" onClick={() => setInfoCintasExpandida(!infoCintasExpandida)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-cyan-300" />
              <GlassCardTitle>{isEnglish ? "Belt System by Category (Venezuela)" : "Sistema de Cintas por Categoría (Venezuela)"}</GlassCardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setInfoCintasExpandida(!infoCintasExpandida);
              }}
              className="h-8 w-8 text-white hover:text-cyan-300 hover:bg-white/20"
            >
              {infoCintasExpandida ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {infoCintasExpandida && (
            <GlassCardDescription>
              {isEnglish ? "Maximum belts allowed by age group" : "Cintas máximas permitidas según grupo de edad"}
            </GlassCardDescription>
          )}
        </GlassCardHeader>
        {infoCintasExpandida && (
        <GlassCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/30">
              <h4 className="font-semibold text-sm text-white mb-2">{isEnglish ? "Benjamin (6-8 years)" : "Benjamín (6-8 años)"}</h4>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#FFFFFF' }} title="Blanca" />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#FFD700' }} title="Amarilla" />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#FF8C00' }} title="Naranja" />
                </div>
              </div>
              <p className="text-xs text-indigo-300 mt-2">{isEnglish ? "Maximum: Orange" : "Máxima: Naranja"}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/30">
              <h4 className="font-semibold text-sm text-white mb-2">{isEnglish ? "Alevin (9-10 years)" : "Alevín (9-10 años)"}</h4>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#FFFFFF' }} title="Blanca" />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#FFD700' }} title="Amarilla" />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#FF8C00' }} title="Naranja" />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#228B22' }} title="Verde" />
                </div>
              </div>
              <p className="text-xs text-indigo-300 mt-2">{isEnglish ? "Maximum: Green" : "Máxima: Verde"}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/30">
              <h4 className="font-semibold text-sm text-white mb-2">{isEnglish ? "Infant (11-12 years)" : "Infantil (11-12 años)"}</h4>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#228B22' }} title="Verde" />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#0000FF' }} title="Azul" />
                </div>
              </div>
              <p className="text-xs text-indigo-300 mt-2">{isEnglish ? "Maximum: Blue" : "Máxima: Azul"}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/30">
              <h4 className="font-semibold text-sm text-white mb-2">{isEnglish ? "Cadet (13-15 years)" : "Cadete (13-15 años)"}</h4>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#0000FF' }} title="Azul" />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#8B4513' }} title="Marrón" />
                </div>
              </div>
              <p className="text-xs text-indigo-300 mt-2">{isEnglish ? "Maximum: Brown" : "Máxima: Marrón"}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/30">
              <h4 className="font-semibold text-sm text-white mb-2">{isEnglish ? "Junior (16-17 years)" : "Junior (16-17 años)"}</h4>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#8B4513' }} title="Marrón" />
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#000000' }} title="Negro" />
                </div>
              </div>
              <p className="text-xs text-indigo-300 mt-2">{isEnglish ? "Maximum: Junior Black" : "Máxima: Negro Junior"}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/30">
              <h4 className="font-semibold text-sm text-white mb-2">{isEnglish ? "Senior (18-34 years)" : "Senior (18-34 años)"}</h4>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#000000' }} title="Negro" />
                </div>
                <span className="text-xs">+ Dan</span>
              </div>
              <p className="text-xs text-indigo-300 mt-2">{isEnglish ? "No limit (Dan)" : "Sin límite (Dan)"}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/30">
              <h4 className="font-semibold text-sm text-white mb-2">{isEnglish ? "Veteran (35+ years)" : "Veterano (35+ años)"}</h4>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#000000' }} title="Negro" />
                </div>
              </div>
              <p className="text-xs text-indigo-300 mt-2">{isEnglish ? "According to level reached" : "Según nivel alcanzado"}</p>
            </div>
          </div>
        </GlassCardContent>
        )}
      </GlassCard>

      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-xl">🏅</span>
            <GlassCardTitle>{isEnglish ? "Category List" : "Lista de Categorías"}</GlassCardTitle>
          </div>
          <GlassCardDescription>{niveles.length} {isEnglish ? "category(ies) registered" : "categoría(s) registrada(s)"}</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/5">
                <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Name" : "Nombre"}</TableHead>
                <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Belt Color" : "Color de Cinta"}</TableHead>
                <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Price" : "Precio"}</TableHead>
                <TableHead className="text-indigo-200 font-semibold">{isEnglish ? "Actions" : "Acciones"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-indigo-300">
                    {isEnglish ? "Loading..." : "Cargando..."}
                  </TableCell>
                </TableRow>
              ) : niveles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-indigo-300">
                    {isEnglish ? "No categories registered" : "No hay categorías registradas"}
                  </TableCell>
                </TableRow>
              ) : (
                niveles.map((nivel) => (
                  <TableRow key={nivel.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-yellow-300 font-medium text-lg">{nivel.nivel || "No definido"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {nivel.cinta && (
                          <div
                            className="w-6 h-6 rounded border-2 border-white/50"
                            style={{ backgroundColor: nivel.cinta }}
                          />
                        )}
                        <span className="font-mono text-sm text-white">{nivel.cinta || (isEnglish ? "Not defined" : "No definido")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-400">
                        ${Number(nivel.precio_mensualidad || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(nivel.id)}
                          className="border-white/30 bg-white/10 hover:bg-white/20 text-white"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {isEnglish ? "Edit" : "Editar"}
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(nivel.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEnglish ? "Edit Category" : "Editar Categoría"}</DialogTitle>
            <DialogDescription>
              {isEnglish ? "Modify the category data" : "Modifica los datos de la categoría"}
            </DialogDescription>
          </DialogHeader>
          {selectedNivelId && (
            <NivelEditForm
              nivelId={selectedNivelId}
              onSuccess={() => {
                setEditDialogOpen(false);
                fetchNiveles();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

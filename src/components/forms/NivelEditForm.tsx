import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CATEGORIAS_DISPONIBLES = [
  "Benjamín",
  "Alevín",
  "Infantil",
  "Cadete",
  "Júnior",
  "Senior",
  "Veterano"
];

const COLORES_JUDO = [
  { value: "#FFFFFF", label: "Blanco", orden: 1 },
  { value: "#FFD700", label: "Amarillo", orden: 2 },
  { value: "#FFA500", label: "Naranja", orden: 3 },
  { value: "#008000", label: "Verde", orden: 4 },
  { value: "#0000FF", label: "Azul", orden: 5 },
  { value: "#8B4513", label: "Marrón", orden: 6 },
  { value: "#000000", label: "Negro", orden: 7 },
];

// Mapeo de cintas máximas por categoría (según el sistema venezolano)
const CINTAS_MAXIMAS_POR_CATEGORIA: Record<string, string> = {
  "Benjamín": "Naranja",
  "Alevín": "Verde",
  "Infantil": "Azul",
  "Cadete": "Marrón",
  "Júnior": "Negro",
  "Senior": "Negro",
  "Veterano": "Negro"
};

const nivelSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  color: z.string().optional(),
  precio_mensualidad: z.number().min(0, "El precio debe ser mayor o igual a 0").optional(),
});

type NivelFormData = z.infer<typeof nivelSchema>;

interface NivelEditFormProps {
  nivelId: string;
  onSuccess: () => void;
}

export function NivelEditForm({ nivelId, onSuccess }: NivelEditFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<NivelFormData>({
    resolver: zodResolver(nivelSchema),
  });

  const selectedColor = watch("color");
  const selectedNombre = watch("nombre");

  // Filtrar colores permitidos según la categoría seleccionada
  const coloresPermitidos = useMemo(() => {
    if (!selectedNombre) return [];

    const cintaMaxima = CINTAS_MAXIMAS_POR_CATEGORIA[selectedNombre];
    if (!cintaMaxima) return COLORES_JUDO;

    const ordenMaximo = COLORES_JUDO.find(c => c.label === cintaMaxima)?.orden || 7;
    return COLORES_JUDO.filter(c => c.orden <= ordenMaximo);
  }, [selectedNombre]);

  useEffect(() => {
    fetchNivel();
  }, [nivelId]);

  const fetchNivel = async () => {
    try {
      const data = await apiClient.getNivel(nivelId);

      if (data) {
        setValue("nombre", data.nivel || data.nombre);
        setValue("color", data.cinta || data.color || "");
        setValue("precio_mensualidad", data.precio_mensualidad || null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: NivelFormData) => {
    setLoading(true);
    try {
      await apiClient.updateNivel(nivelId, {
        nombre: data.nombre,
        color: data.color || null,
        precio_mensualidad: data.precio_mensualidad || null,
      });

      toast({
        title: "Éxito",
        description: "Categoría actualizada correctamente",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="nombre">Nombre de la Categoría *</Label>
        <Select onValueChange={(value) => setValue("nombre", value)} value={selectedNombre}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_DISPONIBLES.map((categoria) => (
              <SelectItem key={categoria} value={categoria}>
                {categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
      </div>

      <div>
        <Label htmlFor="color">Color de Cinta</Label>
        <Select 
          onValueChange={(value) => setValue("color", value)} 
          value={selectedColor}
          disabled={!selectedNombre}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !selectedNombre 
                ? "Primero selecciona una categoría" 
                : "Selecciona un color"
            }>
              {selectedColor && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: selectedColor }}
                  />
                  <span>{COLORES_JUDO.find(c => c.value === selectedColor)?.label}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {coloresPermitidos.map((color) => (
              <SelectItem key={color.value} value={color.value}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: color.value }}
                  />
                  <span>{color.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedNombre && (
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Categoría <strong>{selectedNombre}</strong>: Cinta máxima permitida es <strong>{CINTAS_MAXIMAS_POR_CATEGORIA[selectedNombre]}</strong>
            </AlertDescription>
          </Alert>
        )}
        {errors.color && <p className="text-sm text-destructive">{errors.color.message}</p>}
      </div>

      <div>
        <Label htmlFor="precio_mensualidad">Precio de Mensualidad ($)</Label>
        <Input
          id="precio_mensualidad"
          type="number"
          step="0.01"
          min="0"
          placeholder="Ej: 45.00"
          {...register("precio_mensualidad", { valueAsNumber: true })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Precio mensual para esta categoría. Dejar vacío para usar el precio base del sistema.
        </p>
        {errors.precio_mensualidad && (
          <p className="text-sm text-destructive">{errors.precio_mensualidad.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Actualizar Categoría"}
      </Button>
    </form>
  );
}

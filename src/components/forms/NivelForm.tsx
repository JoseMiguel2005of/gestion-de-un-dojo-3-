import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage, translateBelt } from "@/hooks/useLanguage";

const getCategoriasDisponibles = (isEnglish: boolean) => [
  isEnglish ? "Benjamin" : "Benjamín",
  isEnglish ? "Alevin" : "Alevín",
  isEnglish ? "Infant" : "Infantil",
  isEnglish ? "Cadet" : "Cadete",
  isEnglish ? "Junior" : "Júnior",
  isEnglish ? "Senior" : "Senior",
  isEnglish ? "Veteran" : "Veterano"
];

const getColoresJudo = (isEnglish: boolean) => [
  { value: "#FFFFFF", label: isEnglish ? "White" : "Blanco", orden: 1 },
  { value: "#FFD700", label: isEnglish ? "Yellow" : "Amarillo", orden: 2 },
  { value: "#FFA500", label: isEnglish ? "Orange" : "Naranja", orden: 3 },
  { value: "#008000", label: isEnglish ? "Green" : "Verde", orden: 4 },
  { value: "#0000FF", label: isEnglish ? "Blue" : "Azul", orden: 5 },
  { value: "#8B4513", label: isEnglish ? "Brown" : "Marrón", orden: 6 },
  { value: "#000000", label: isEnglish ? "Black" : "Negro", orden: 7 },
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

const createNivelSchema = (isEnglish: boolean) => z.object({
  nombre: z.string().min(2, isEnglish ? "Name must have at least 2 characters" : "El nombre debe tener al menos 2 caracteres"),
  color: z.string().optional(),
  precio_mensualidad: z.number().min(0, isEnglish ? "Price must be greater than or equal to 0" : "El precio debe ser mayor o igual a 0").optional(),
});

type NivelFormData = z.infer<ReturnType<typeof createNivelSchema>>;

interface NivelFormProps {
  onSuccess: () => void;
}

export function NivelForm({ onSuccess }: NivelFormProps) {
  const { isEnglish } = useLanguage();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NivelFormData>({
    resolver: zodResolver(createNivelSchema(isEnglish)),
  });

  const selectedColor = watch("color");
  const selectedNombre = watch("nombre");

  // Filtrar colores permitidos según la categoría seleccionada
  const coloresPermitidos = useMemo(() => {
    if (!selectedNombre) return [];

    const cintaMaxima = CINTAS_MAXIMAS_POR_CATEGORIA[selectedNombre];
    if (!cintaMaxima) return getColoresJudo(isEnglish);

    const ordenMaximo = getColoresJudo(isEnglish).find(c => c.label === cintaMaxima)?.orden || 7;
    return getColoresJudo(isEnglish).filter(c => c.orden <= ordenMaximo);
  }, [selectedNombre, isEnglish]);

  const onSubmit = async (data: NivelFormData) => {
    setLoading(true);
    try {
      await apiClient.createNivel({
        nombre: data.nombre,
        color: data.color || null,
        precio_mensualidad: data.precio_mensualidad || null,
      });

      toast({
        title: isEnglish ? "Success" : "Éxito",
        description: isEnglish ? "Category created successfully" : "Categoría creada correctamente",
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">{isEnglish ? "Category Name *" : "Nombre de la Categoría *"}</Label>
        <Select onValueChange={(value) => setValue("nombre", value)} value={selectedNombre}>
          <SelectTrigger>
            <SelectValue placeholder={isEnglish ? "Select a category" : "Selecciona una categoría"} />
          </SelectTrigger>
          <SelectContent>
            {getCategoriasDisponibles(isEnglish).map((categoria) => (
              <SelectItem key={categoria} value={categoria}>
                {categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.nombre && (
          <p className="text-sm text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">{isEnglish ? "Belt Color" : "Color de Cinta"}</Label>
        <Select 
          onValueChange={(value) => setValue("color", value)} 
          value={selectedColor}
          disabled={!selectedNombre}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !selectedNombre 
                ? (isEnglish ? "First select a category" : "Primero selecciona una categoría")
                : (isEnglish ? "Select a color" : "Selecciona un color")
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
              {isEnglish ? "Category" : "Categoría"} <strong>{selectedNombre}</strong>: {isEnglish ? "Maximum belt allowed is" : "Cinta máxima permitida es"} <strong>{CINTAS_MAXIMAS_POR_CATEGORIA[selectedNombre]}</strong>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="precio_mensualidad">{isEnglish ? "Monthly Price ($)" : "Precio de Mensualidad ($)"}</Label>
        <Input
          id="precio_mensualidad"
          type="number"
          step="0.01"
          min="0"
          placeholder="Ej: 45.00"
          {...register("precio_mensualidad", { valueAsNumber: true })}
        />
        <p className="text-xs text-muted-foreground">
          Precio mensual para esta categoría. Dejar vacío para usar el precio base del sistema.
        </p>
        {errors.precio_mensualidad && (
          <p className="text-sm text-destructive">{errors.precio_mensualidad.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEnglish ? "Create Category" : "Crear Categoría"}
      </Button>
    </form>
  );
}

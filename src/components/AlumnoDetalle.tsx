import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Edit2, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AlumnoDetalleProps {
  alumnoId: string;
}

export function AlumnoDetalle({ alumnoId }: AlumnoDetalleProps) {
  const [alumno, setAlumno] = useState<any>(null);
  const [precioInfo, setPrecioInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editandoPrecio, setEditandoPrecio] = useState(false);
  const [precioForm, setPrecioForm] = useState({
    precio_personalizado: null as number | null,
    descuento_porcentaje: 0,
    observaciones_pago: '',
  });

  useEffect(() => {
    fetchAlumno();
    fetchPrecio();
  }, [alumnoId]);

  const fetchAlumno = async () => {
    try {
      const data = await apiClient.getAlumno(alumnoId);
      setAlumno(data);
    } catch (error) {
      console.error("Error fetching alumno:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrecio = async () => {
    try {
      const data = await apiClient.getPrecioAlumno(alumnoId);
      setPrecioInfo(data);
      setPrecioForm({
        precio_personalizado: data.precio_personalizado,
        descuento_porcentaje: data.descuento_porcentaje || 0,
        observaciones_pago: data.observaciones_pago || '',
      });
    } catch (error) {
      console.error("Error fetching precio:", error);
    }
  };

  const handleGuardarPrecio = async () => {
    try {
      await apiClient.updatePrecioPersonalizado(alumnoId, precioForm);
      toast({
        title: "Precio actualizado",
        description: "El precio del alumno se actualizó correctamente",
      });
      setEditandoPrecio(false);
      fetchPrecio();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el precio",
        variant: "destructive",
      });
    }
  };

  const handleCancelarEdicion = () => {
    setPrecioForm({
      precio_personalizado: precioInfo.precio_personalizado,
      descuento_porcentaje: precioInfo.descuento_porcentaje || 0,
      observaciones_pago: precioInfo.observaciones_pago || '',
    });
    setEditandoPrecio(false);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  if (!alumno) {
    return <div className="text-center py-8">No se encontró el alumno</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Datos Personales</span>
            <Badge variant={alumno.estado ? "default" : "secondary"}>
              {alumno.estado ? "Activo" : "Inactivo"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cédula</p>
              <p className="font-medium">{alumno.cedula || "No registrada"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nombre Completo</p>
              <p className="font-medium">{alumno.nombre}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
            <p className="font-medium">{new Date(alumno.fecha_nacimiento).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{alumno.telefono || "No registrado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{alumno.email || "No registrado"}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground">Dirección</p>
            <p className="font-medium">{alumno.direccion || "No registrada"}</p>
          </div>
        </CardContent>
      </Card>

      {alumno.representantes && (
        <Card>
          <CardHeader>
            <CardTitle>Representante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">
                  {alumno.representantes.nombre}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cédula</p>
                <p className="font-medium">{alumno.representantes.cedula || "No registrada"}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{alumno.representantes.telefono || "No registrado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{alumno.representantes.email || "No registrado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información de Pago y Precio */}
      <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-green-700 dark:text-green-400">Información de Pago</CardTitle>
            </div>
            {!editandoPrecio && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditandoPrecio(true)}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Editar Precio
              </Button>
            )}
          </div>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Precio de mensualidad y descuentos aplicables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editandoPrecio ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <p className="font-medium">{precioInfo?.categoria_nombre || "Sin categoría"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Edad</p>
                  <p className="font-medium">{precioInfo?.edad || "N/A"} años</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Precio de Categoría</p>
                  <p className="font-medium text-gray-600 dark:text-gray-300">
                    ${Number(precioInfo?.precio_categoria || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precio Personalizado</p>
                  <p className="font-medium text-blue-600 dark:text-blue-400">
                    {precioInfo?.precio_personalizado 
                      ? `$${Number(precioInfo.precio_personalizado).toFixed(2)}` 
                      : "No establecido"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Descuento</p>
                  <p className="font-medium text-orange-600 dark:text-orange-400">
                    {Number(precioInfo?.descuento_porcentaje || 0).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precio Final</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${Number(precioInfo?.precio_final || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {precioInfo?.observaciones_pago && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Observaciones</p>
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      {precioInfo.observaciones_pago}
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="precio_personalizado">Precio Personalizado (opcional)</Label>
                  <Input
                    id="precio_personalizado"
                    type="number"
                    step="0.01"
                    placeholder="Dejar vacío para usar precio de categoría"
                    value={precioForm.precio_personalizado || ''}
                    onChange={(e) => setPrecioForm({
                      ...precioForm,
                      precio_personalizado: e.target.value ? parseFloat(e.target.value) : null
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio de categoría: ${Number(precioInfo?.precio_categoria || 0).toFixed(2)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="descuento_porcentaje">Descuento (%)</Label>
                  <Input
                    id="descuento_porcentaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={precioForm.descuento_porcentaje}
                    onChange={(e) => setPrecioForm({
                      ...precioForm,
                      descuento_porcentaje: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="observaciones_pago">Observaciones de Pago</Label>
                  <Textarea
                    id="observaciones_pago"
                    placeholder="Motivo del descuento, acuerdos especiales, etc."
                    value={precioForm.observaciones_pago}
                    onChange={(e) => setPrecioForm({
                      ...precioForm,
                      observaciones_pago: e.target.value
                    })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancelarEdicion}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGuardarPrecio}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" />
                    Guardar Precio
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Save, 
  RotateCcw, 
  Users, 
  DollarSign, 
  Clock, 
  Database,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  Key,
  Calendar,
  AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage, getTranslation } from "@/hooks/useLanguage";

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

export default function ConfiguracionAvanzada() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const [activeTab, setActiveTab] = useState("usuarios");
  const [loading, setLoading] = useState(false);
  
  // Verificar si el usuario es admin
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      toast({
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta sección",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [user, navigate]);
  
  // Estados para cada sección
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [configPagos, setConfigPagos] = useState({
    dia_corte: 1,
    descuento_pago_adelantado: 0,
    recargo_mora: 0,
    moneda: 'USD$',
    metodos_pago: ['Efectivo', 'Transferencia', 'Pago Móvil'],
    datos_bancarios: '',
    pais_configuracion: 'venezuela',
    tipo_cambio_usd_bs: 220
  });
  
  
  const [horarios, setHorarios] = useState<any[]>([]);
  const [diasFestivos, setDiasFestivos] = useState<any[]>([]);
  const [niveles, setNiveles] = useState<any[]>([]);
  const [categoriasEdad, setCategoriasEdad] = useState<any[]>([]);
  const [instructores, setInstructores] = useState<any[]>([]);
  
  // Estados para días festivos
  const [dialogFestivoAbierto, setDialogFestivoAbierto] = useState(false);
  const [dialogEditarFestivoAbierto, setDialogEditarFestivoAbierto] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [festivoSeleccionado, setFestivoSeleccionado] = useState('');
  const [creandoFestivo, setCreandoFestivo] = useState(false);
  const [editandoFestivo, setEditandoFestivo] = useState(false);
  const [festivoEditando, setFestivoEditando] = useState<any>(null);
  const [editandoPrecio, setEditandoPrecio] = useState<{[key: number]: boolean}>({});
  const [preciosTemporales, setPreciosTemporales] = useState<{[key: number]: number}>({});
  
  
  const [stats, setStats] = useState<any>(null);
  const [integridad, setIntegridad] = useState<any>(null);
  
  // Estados para formularios
  const [nuevoUsuario, setNuevoUsuario] = useState({ username: '', email: '', password: '', nombre_completo: '', rol: 'instructor' });
  const [nuevaPassword, setNuevaPassword] = useState({ password_actual: '', password_nueva: '', password_confirmar: '' });
  const [nuevoHorario, setNuevoHorario] = useState({ dia_semana: 'Lunes', hora_inicio: '', hora_fin: '', id_categoria_edad: '', capacidad_maxima: 20, instructor_id: '' });
  const [nuevoDiaFestivo, setNuevoDiaFestivo] = useState({ fecha: '', descripcion: '' });
  
  // Diálogos abiertos
  const [dialogUsuarioAbierto, setDialogUsuarioAbierto] = useState(false);
  const [dialogPasswordAbierto, setDialogPasswordAbierto] = useState(false);
  const [dialogHorarioAbierto, setDialogHorarioAbierto] = useState(false);
  const [creandoHorario, setCreandoHorario] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  // Cargar categorías de edad e instructores cuando se abre el diálogo de horarios
  useEffect(() => {
    if (dialogHorarioAbierto) {
      if (categoriasEdad.length === 0) {
        cargarCategoriasEdad();
      }
      if (instructores.length === 0) {
        cargarInstructores();
      }
    }
  }, [dialogHorarioAbierto]);

  const cargarNiveles = async () => {
    try {
      const nivelesData = await apiClient.getNiveles();
      setNiveles(nivelesData || []);
    } catch (error) {
      console.error('Error cargando niveles:', error);
      setNiveles([]);
    }
  };

  const cargarCategoriasEdad = async () => {
    try {
      const categoriasData = await apiClient.getCategoriasEdad();
      setCategoriasEdad(categoriasData || []);
    } catch (error) {
      console.error('Error cargando categorías de edad:', error);
      setCategoriasEdad([]);
    }
  };

  const cargarInstructores = async () => {
    try {
      const instructoresData = await apiClient.getInstructores();
      setInstructores(instructoresData || []);
    } catch (error) {
      console.error('Error cargando instructores:', error);
      setInstructores([]);
    }
  };

  const cargarDatos = async () => {
    try {
      if (activeTab === "usuarios") {
        const [usuariosData, rolesData] = await Promise.all([
          apiClient.getUsuarios(),
          apiClient.getRoles()
        ]);
        setUsuarios(usuariosData);
        setRoles(rolesData);
      } else if (activeTab === "pagos") {
        const [data, nivelesData] = await Promise.all([
          apiClient.getConfigPagos(),
          apiClient.getNiveles()
        ]);
        if (data.metodos_pago && typeof data.metodos_pago === 'string') {
          data.metodos_pago = JSON.parse(data.metodos_pago);
        }
        // Si no hay pais_configuracion, establecer por defecto venezuela
        if (!data.pais_configuracion) {
          data.pais_configuracion = 'venezuela';
        }
        setConfigPagos({ ...configPagos, ...data });
        setNiveles(nivelesData || []);
        
        // Inicializar precios temporales (convertir a número)
        const tempPrecios: {[key: number]: number} = {};
        (nivelesData || []).forEach((nivel: any) => {
          tempPrecios[nivel.id] = Number(nivel.precio_mensualidad) || 0;
        });
        setPreciosTemporales(tempPrecios);
      } else if (activeTab === "horarios") {
        const [horariosData, festivosData] = await Promise.all([
          apiClient.getHorarios(),
          apiClient.getDiasFestivos()
        ]);
        // Filtrar duplicados por ID antes de establecer el estado
        const horariosUnicos = (horariosData || []).filter((horario, index, self) => 
          index === self.findIndex((h) => h.id === horario.id)
        );
        setHorarios(horariosUnicos);
        setDiasFestivos(festivosData || []);
      } else if (activeTab === "backup") {
        const [statsData, integridadData] = await Promise.all([
          apiClient.getStats(),
          apiClient.verificarIntegridad()
        ]);
        setStats(statsData);
        setIntegridad(integridadData);
      } else if (activeTab === "logs") {
        const logsData = await apiClient.getLogs(100);
        setLogs(logsData);
      }
    } catch (error: any) {
      console.error('Error cargando datos:', error);
    }
  };

  // Funciones para usuarios
  const crearUsuario = async () => {
    try {
      await apiClient.createUsuario(nuevoUsuario);
      toast({ title: "Usuario creado exitosamente" });
      setDialogUsuarioAbierto(false);
      setNuevoUsuario({ username: '', email: '', password: '', nombre_completo: '', rol: 'instructor' });
      cargarDatos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const cambiarPassword = async () => {
    if (nuevaPassword.password_nueva !== nuevaPassword.password_confirmar) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    try {
      await apiClient.cambiarPassword(nuevaPassword.password_actual, nuevaPassword.password_nueva);
      toast({ title: "Contraseña cambiada exitosamente" });
      setDialogPasswordAbierto(false);
      setNuevaPassword({ password_actual: '', password_nueva: '', password_confirmar: '' });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Funciones para pagos
  const guardarConfigPagos = async () => {
    setLoading(true);
    try {
      await apiClient.updateConfigPagos(configPagos);
      toast({ title: "Configuración de pagos guardada" });
      
      // Disparar evento para que otras páginas recarguen la configuración
      window.dispatchEvent(new CustomEvent('config-updated'));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const guardarPrecioNivel = async (nivelId: number) => {
    try {
      const nivel = niveles.find(n => n.id === nivelId);
      if (!nivel) return;

      await apiClient.updateNivel(nivelId.toString(), {
        nombre: nivel.nivel || nivel.nombre,
        color: nivel.cinta || nivel.color,
        precio_mensualidad: preciosTemporales[nivelId]
      });

      toast({ title: "Precio actualizado", description: `Precio de ${nivel.nivel || nivel.nombre} actualizado correctamente` });
      setEditandoPrecio({...editandoPrecio, [nivelId]: false});
      
      // Recargar niveles
      const nivelesData = await apiClient.getNiveles();
      setNiveles(nivelesData || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const cancelarEdicionPrecio = (nivelId: number) => {
    const nivel = niveles.find(n => n.id === nivelId);
    if (nivel) {
      setPreciosTemporales({...preciosTemporales, [nivelId]: Number(nivel.precio_mensualidad) || 0});
    }
    setEditandoPrecio({...editandoPrecio, [nivelId]: false});
  };


  // Funciones para horarios
  const crearHorario = async (e?: React.FormEvent) => {
    // Prevenir submit de formulario si se llama desde un formulario
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevenir múltiples envíos - verificación doble
    if (creandoHorario) {
      return;
    }

    // Validaciones
    if (!nuevoHorario.dia_semana) {
      toast({ title: "Error", description: "Seleccione un día de la semana", variant: "destructive" });
      return;
    }
    
    if (!nuevoHorario.hora_inicio || !nuevoHorario.hora_fin) {
      toast({ title: "Error", description: "Complete las horas de inicio y fin", variant: "destructive" });
      return;
    }
    
    // Validar que la hora de fin sea posterior a la hora de inicio
    const horaInicio = new Date(`2000-01-01T${nuevoHorario.hora_inicio}`);
    const horaFin = new Date(`2000-01-01T${nuevoHorario.hora_fin}`);
    
    if (horaFin <= horaInicio) {
      toast({ title: "Error", description: "La hora de fin debe ser posterior a la hora de inicio", variant: "destructive" });
      return;
    }
    
    // Validar que la clase dure al menos 30 minutos
    const duracionMinutos = (horaFin.getTime() - horaInicio.getTime()) / (1000 * 60);
    if (duracionMinutos < 30) {
      toast({ title: "Error", description: "La clase debe durar al menos 30 minutos", variant: "destructive" });
      return;
    }
    
    // Validar que la clase no dure más de 3 horas
    if (duracionMinutos > 180) {
      toast({ title: "Error", description: "La clase no puede durar más de 3 horas", variant: "destructive" });
      return;
    }
    
    if (!nuevoHorario.id_categoria_edad) {
      toast({ title: "Error", description: "Seleccione una categoría de edad", variant: "destructive" });
      return;
    }
    
    if (!nuevoHorario.instructor_id) {
      toast({ title: "Error", description: "Seleccione un instructor", variant: "destructive" });
      return;
    }
    
    if (!nuevoHorario.capacidad_maxima || nuevoHorario.capacidad_maxima < 1 || nuevoHorario.capacidad_maxima > 50) {
      toast({ title: "Error", description: "La capacidad debe estar entre 1 y 50 estudiantes", variant: "destructive" });
      return;
    }
    
    // Marcar como creando ANTES de hacer cualquier otra cosa
    setCreandoHorario(true);
    
    try {
      // Convertir id_categoria_edad a número
      const horarioData = {
        ...nuevoHorario,
        id_categoria_edad: parseInt(nuevoHorario.id_categoria_edad),
        instructor_id: parseInt(nuevoHorario.instructor_id)
      };
      
      await apiClient.createHorario(horarioData);
      toast({ title: "Horario creado exitosamente" });
      
      // Cerrar diálogo y limpiar formulario
      setDialogHorarioAbierto(false);
      setNuevoHorario({ dia_semana: 'Lunes', hora_inicio: '', hora_fin: '', id_categoria_edad: '', capacidad_maxima: 20, instructor_id: '' });
      
      // Recargar datos después de un pequeño delay para asegurar que el servidor haya procesado
      setTimeout(() => {
        cargarDatos();
      }, 100);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      // Asegurar que siempre se resetee el estado, incluso si hay error
      setCreandoHorario(false);
    }
  };

  const eliminarHorario = async (id: string) => {
    if (!confirm('¿Eliminar este horario?')) return;
    try {
      await apiClient.deleteHorario(id);
      toast({ title: "Horario eliminado" });
      cargarDatos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const crearDiaFestivo = async () => {
    if (!nuevaFecha || !festivoSeleccionado) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    // Si es personalizado, validar que tenga descripción
    if (festivoSeleccionado === 'personalizado' && !nuevaDescripcion.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una descripción para el día personalizado",
        variant: "destructive",
      });
      return;
    }

    setCreandoFestivo(true);
    try {
      // Obtener la descripción del día festivo seleccionado
      let descripcion = nuevaDescripcion;
      if (festivoSeleccionado !== 'personalizado') {
        const festivo = diasFestivosComunes.find(f => f.id === festivoSeleccionado);
        descripcion = festivo?.nombre || nuevaDescripcion;
      }

      await apiClient.createDiaFestivo({
        fecha: nuevaFecha,
        descripcion: descripcion
      });

      toast({
        title: "Éxito",
        description: "Día festivo agregado correctamente",
      });

      setNuevaFecha('');
      setNuevaDescripcion('');
      setFestivoSeleccionado('');
      setDialogFestivoAbierto(false);
      cargarDatos(); // Recargar datos
    } catch (error: any) {
      console.error('Error creando día festivo:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el día festivo",
        variant: "destructive",
      });
    } finally {
      setCreandoFestivo(false);
    }
  };

  const editarDiaFestivo = async () => {
    if (!festivoEditando) return;

    if (!nuevaFecha || !nuevaDescripcion.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    setEditandoFestivo(true);
    try {
      await apiClient.updateDiaFestivo(festivoEditando.id.toString(), {
        fecha: nuevaFecha,
        descripcion: nuevaDescripcion
      });

      toast({
        title: "Éxito",
        description: "Día festivo actualizado correctamente",
      });

      setNuevaFecha('');
      setNuevaDescripcion('');
      setFestivoEditando(null);
      setDialogEditarFestivoAbierto(false);
      cargarDatos(); // Recargar datos
    } catch (error: any) {
      console.error('Error actualizando día festivo:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el día festivo",
        variant: "destructive",
      });
    } finally {
      setEditandoFestivo(false);
    }
  };

  const abrirEditarFestivo = (festivo: any) => {
    setFestivoEditando(festivo);
    setNuevaFecha(festivo.fecha);
    setNuevaDescripcion(festivo.descripcion);
    setDialogEditarFestivoAbierto(true);
  };

  const eliminarDiaFestivo = async (id: string) => {
    try {
      await apiClient.deleteDiaFestivo(id);
      toast({ title: "Día festivo eliminado" });
      cargarDatos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };


  // Funciones para backup
  const exportarBackup = async () => {
    try {
      await apiClient.exportarJSON();
      await apiClient.registrarBackup();
      toast({ title: "Backup JSON exportado exitosamente" });
      cargarDatos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const exportarBackupSQL = async () => {
    try {
      await apiClient.exportarSQL();
      await apiClient.registrarBackup();
      toast({ title: "Backup SQL exportado exitosamente" });
      cargarDatos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const importarBackupJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!confirm('⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos actuales. ¿Continuar?')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      
      const response = await fetch('/api/backup/import/json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        toast({ title: "Backup JSON importado exitosamente" });
        cargarDatos();
      } else {
        throw new Error('Error al importar backup');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const limpiarLogsAntiguos = async () => {
    if (!confirm('¿Eliminar logs mayores a 90 días?')) return;
    try {
      const result = await apiClient.limpiarLogs(90);
      toast({ 
        title: "Logs eliminados", 
        description: result.message || `${result.deletedCount} registros eliminados` 
      });
      cargarDatos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent dark:text-orange-400">
          {isEnglish ? "Advanced Configuration" : "Configuración Avanzada"}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {isEnglish ? "Manage users, payments, schedules and more" : "Gestiona usuarios, pagos, horarios y más"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-5 gap-2">
          <TabsTrigger value="usuarios"><Users className="w-4 h-4 mr-1" /> {isEnglish ? "Users" : "Usuarios"}</TabsTrigger>
          <TabsTrigger value="pagos"><DollarSign className="w-4 h-4 mr-1" /> {isEnglish ? "Payments" : "Pagos"}</TabsTrigger>
          <TabsTrigger value="horarios"><Clock className="w-4 h-4 mr-1" /> {isEnglish ? "Schedules" : "Horarios"}</TabsTrigger>
          <TabsTrigger value="backup"><Database className="w-4 h-4 mr-1" /> {isEnglish ? "Backup" : "Backup"}</TabsTrigger>
          <TabsTrigger value="logs">{isEnglish ? "Logs" : "Logs"}</TabsTrigger>
        </TabsList>

        {/* TAB: USUARIOS Y SEGURIDAD */}
        <TabsContent value="usuarios" className="space-y-6">
          <Card className="dark:border-blue-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-blue-600 dark:text-blue-400">{isEnglish ? "User Management" : "Gestión de Usuarios"}</CardTitle>
                  <CardDescription>{isEnglish ? "Manage system users" : "Administra los usuarios del sistema"}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={dialogPasswordAbierto} onOpenChange={setDialogPasswordAbierto}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Key className="w-4 h-4 mr-1" />
                        Cambiar mi contraseña
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cambiar Contraseña</DialogTitle>
                        <DialogDescription>Actualiza tu contraseña de acceso</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Contraseña Actual</Label>
                          <Input 
                            type="password" 
                            value={nuevaPassword.password_actual}
                            onChange={(e) => setNuevaPassword({...nuevaPassword, password_actual: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Nueva Contraseña</Label>
                          <Input 
                            type="password" 
                            value={nuevaPassword.password_nueva}
                            onChange={(e) => setNuevaPassword({...nuevaPassword, password_nueva: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Confirmar Nueva Contraseña</Label>
                          <Input 
                            type="password" 
                            value={nuevaPassword.password_confirmar}
                            onChange={(e) => setNuevaPassword({...nuevaPassword, password_confirmar: e.target.value})}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={cambiarPassword}>Cambiar Contraseña</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={dialogUsuarioAbierto} onOpenChange={setDialogUsuarioAbierto}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Nuevo Usuario
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription>Agrega un nuevo usuario al sistema</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Nombre Completo</Label>
                          <Input 
                            value={nuevoUsuario.nombre_completo}
                            onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre_completo: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Nombre de Usuario</Label>
                          <Input 
                            value={nuevoUsuario.username}
                            onChange={(e) => setNuevoUsuario({...nuevoUsuario, username: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input 
                            type="email"
                            value={nuevoUsuario.email}
                            onChange={(e) => setNuevoUsuario({...nuevoUsuario, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Contraseña</Label>
                          <Input 
                            type="password"
                            value={nuevoUsuario.password}
                            onChange={(e) => setNuevoUsuario({...nuevoUsuario, password: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Rol</Label>
                          <Select value={nuevoUsuario.rol} onValueChange={(value) => setNuevoUsuario({...nuevoUsuario, rol: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(rol => (
                                <SelectItem key={rol.id} value={rol.nombre}>{rol.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={crearUsuario}>Crear Usuario</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Acceso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map(usuario => (
                    <TableRow key={usuario.id}>
                      <TableCell>{usuario.nombre_completo || usuario.username}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                          {usuario.rol}
                        </span>
                      </TableCell>
                      <TableCell>
                        {usuario.activo ? 
                          <span className="text-green-600 dark:text-green-400">Activo</span> : 
                          <span className="text-red-600 dark:text-red-400">Inactivo</span>
                        }
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {usuario.ultimo_acceso ? new Date(usuario.ultimo_acceso).toLocaleString('es-ES') : 'Nunca'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: PAGOS */}
        <TabsContent value="pagos" className="space-y-6">
          <Card className="dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-600 dark:text-green-400">{isEnglish ? "Payment Configuration" : "Configuración de Pagos"}</CardTitle>
              <CardDescription>{isEnglish ? "Define prices, discounts and payment methods" : "Define precios, descuentos y métodos de pago"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Cómo funciona el sistema de pagos:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>Precio base:</strong> Se toma de la categoría/cinta específica de cada estudiante (en USD$)</li>
                  <li>• <strong>Descuentos:</strong> Se aplican sobre el precio base de la categoría</li>
                  <li>• <strong>Recargos:</strong> Se aplican cuando el pago se hace después del día de corte</li>
                  <li>• <strong>Conversión BS.:</strong> Si seleccionas BS., se multiplica automáticamente por la tasa de cambio configurada (actualmente: {configPagos.tipo_cambio_usd_bs || 220})</li>
                  <li>• <strong>Resultado final:</strong> Precio categoría ± descuentos ± recargos (convertido si es BS.)</li>
                </ul>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>{isEnglish ? "Country Configuration" : "Configuración de País"}</Label>
                  <Select
                    value={configPagos.pais_configuracion || 'venezuela'}
                    onValueChange={(value) => {
                      // Actualizar métodos de pago según el país seleccionado
                      const nuevosMetodos = value === 'usa' 
                        ? ['Transferencia Bancaria']
                        : ['Pago Móvil', 'Transferencia Bancaria'];
                      
                      setConfigPagos({
                        ...configPagos, 
                        pais_configuracion: value,
                        metodos_pago: nuevosMetodos
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isEnglish ? "Select country" : "Seleccionar país"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venezuela">{isEnglish ? "Venezuela" : "Venezuela"}</SelectItem>
                      <SelectItem value="usa">{isEnglish ? "United States" : "Estados Unidos"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEnglish 
                      ? "Payment methods will be configured based on the selected country"
                      : "Los métodos de pago se configurarán según el país seleccionado"}
                  </p>
                </div>
                <div>
                  <Label>Moneda</Label>
                  <Select
                    value={configPagos.moneda}
                    onValueChange={(value) => setConfigPagos({...configPagos, moneda: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD$">USD$ - Dólar Americano</SelectItem>
                      <SelectItem value="BS.">BS. - Bolívar Venezolano (USD × {configPagos.tipo_cambio_usd_bs || 220})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Día de Corte</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="31" 
                    value={configPagos.dia_corte}
                    onChange={(e) => setConfigPagos({...configPagos, dia_corte: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Descuento Pago Adelantado (%)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={configPagos.descuento_pago_adelantado}
                    onChange={(e) => setConfigPagos({...configPagos, descuento_pago_adelantado: parseFloat(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Descuento por pagar antes del día de corte
                  </p>
                </div>
                <div>
                  <Label>Recargo por Mora (%)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={configPagos.recargo_mora}
                    onChange={(e) => setConfigPagos({...configPagos, recargo_mora: parseFloat(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recargo adicional por pagar después del día de corte
                  </p>
                </div>
                <div>
                  <Label>{isEnglish ? "USD to Bs. Exchange Rate" : "Tasa de Cambio USD a Bs."}</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={configPagos.tipo_cambio_usd_bs || 220}
                    onChange={(e) => setConfigPagos({...configPagos, tipo_cambio_usd_bs: parseFloat(e.target.value) || 220})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEnglish 
                      ? "Exchange rate: 1 USD = X Bs. (e.g., 1 USD = 220 Bs.)"
                      : "Tasa de cambio: 1 USD = X Bs. (ejemplo: 1 USD = 220 Bs.)"}
                  </p>
                </div>
              </div>
              <div>
                <Label>Datos Bancarios</Label>
                <Textarea 
                  rows={4}
                  placeholder="Información de cuentas bancarias para pagos..."
                  value={configPagos.datos_bancarios}
                  onChange={(e) => setConfigPagos({...configPagos, datos_bancarios: e.target.value})}
                />
              </div>
              <Button onClick={guardarConfigPagos} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </CardContent>
          </Card>

          {/* NUEVA SECCIÓN: Precios por Categoría */}
          <Card className="dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-600 dark:text-blue-400">{isEnglish ? "Prices by Category/Level" : "Precios por Categoría/Nivel"}</CardTitle>
              <CardDescription>{isEnglish ? "Define the monthly price for each student category" : "Define el precio de mensualidad para cada categoría de alumnos"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Color de Cinta</TableHead>
                    <TableHead>Precio Mensual ({configPagos.moneda})</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!niveles || niveles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                        No hay categorías registradas. Ve a <strong>Niveles</strong> para crear categorías.
                      </TableCell>
                    </TableRow>
                  ) : (
                    niveles.map(nivel => (
                      <TableRow key={nivel.id}>
                        <TableCell className="font-medium">{nivel.nivel || nivel.nombre}</TableCell>
                        <TableCell>
                          {nivel.cinta || nivel.color ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-8 h-4 rounded border" 
                                style={{ backgroundColor: nivel.cinta || nivel.color }}
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin color</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editandoPrecio[nivel.id] ? (
                            <Input 
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-32"
                              value={preciosTemporales[nivel.id] !== undefined ? preciosTemporales[nivel.id] : ''}
                              onChange={(e) => setPreciosTemporales({
                                ...preciosTemporales,
                                [nivel.id]: parseFloat(e.target.value) || 0
                              })}
                            />
                          ) : (
                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                              {configPagos.moneda} {Number(nivel.precio_mensualidad || 0).toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editandoPrecio[nivel.id] ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelarEdicionPrecio(nivel.id)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => guardarPrecioNivel(nivel.id)}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Guardar
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditandoPrecio({...editandoPrecio, [nivel.id]: true})}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>💡 Nota:</strong> Los alumnos en cada categoría pagarán el precio configurado aquí. 
                  Si un alumno tiene un precio personalizado, ese precio tendrá prioridad.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: HORARIOS */}
        <TabsContent value="horarios" className="space-y-6">
          <Card className="dark:border-purple-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-purple-600 dark:text-purple-400">{isEnglish ? "Class Schedules" : "Horarios de Clases"}</CardTitle>
                  <CardDescription>{isEnglish ? "Define schedules and holidays" : "Define los horarios y días festivos"}</CardDescription>
                </div>
                <Dialog 
                  open={dialogHorarioAbierto} 
                  onOpenChange={(open) => {
                    // Solo permitir cerrar si no se está creando un horario
                    if (!creandoHorario) {
                      setDialogHorarioAbierto(open);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Nuevo Horario
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Horario de Clase</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Día de la Semana</Label>
                        <Select value={nuevoHorario.dia_semana} onValueChange={(value) => setNuevoHorario({...nuevoHorario, dia_semana: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                              <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Hora Inicio</Label>
                          <Input 
                            type="time"
                            value={nuevoHorario.hora_inicio}
                            onChange={(e) => setNuevoHorario({...nuevoHorario, hora_inicio: e.target.value})}
                            min="06:00"
                            max="22:00"
                            title="Hora entre 6:00 AM y 10:00 PM"
                            required
                          />
                        </div>
                        <div>
                          <Label>Hora Fin</Label>
                          <Input 
                            type="time"
                            value={nuevoHorario.hora_fin}
                            onChange={(e) => setNuevoHorario({...nuevoHorario, hora_fin: e.target.value})}
                            min="06:30"
                            max="22:30"
                            title="Hora entre 6:30 AM y 10:30 PM"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Categoría de Edad</Label>
                        <Select value={nuevoHorario.id_categoria_edad} onValueChange={(value) => setNuevoHorario({...nuevoHorario, id_categoria_edad: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriasEdad && categoriasEdad.length > 0 ? (
                              categoriasEdad.map(categoria => (
                                <SelectItem key={categoria.id} value={categoria.id.toString()}>
                                  {categoria.nombre} ({categoria.edad_min}-{categoria.edad_max} años)
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No hay categorías creadas
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Categorías disponibles: {categoriasEdad ? categoriasEdad.length : 0}
                        </p>
                      </div>
                      <div>
                        <Label>Instructor</Label>
                        <Select value={nuevoHorario.instructor_id} onValueChange={(value) => setNuevoHorario({...nuevoHorario, instructor_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un instructor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {instructores && instructores.length > 0 ? (
                              instructores.map(instructor => (
                                <SelectItem key={instructor.id} value={instructor.id.toString()}>
                                  {instructor.nombre_completo || instructor.username}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No hay instructores disponibles
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Instructores disponibles: {instructores ? instructores.length : 0}
                        </p>
                      </div>
                      <div>
                        <Label>Capacidad Máxima</Label>
                        <Input 
                          type="number"
                          value={nuevoHorario.capacidad_maxima}
                          onChange={(e) => setNuevoHorario({...nuevoHorario, capacidad_maxima: parseInt(e.target.value)})}
                          min="1"
                          max="50"
                          title="Capacidad entre 1 y 50 estudiantes"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Número máximo de estudiantes (1-50)
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="button" 
                        onClick={(e) => crearHorario(e)} 
                        disabled={creandoHorario}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {creandoHorario ? "Creando..." : "Crear Horario"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {horarios.map((horario, index) => {
                    // Crear una clave única combinando ID e índice para evitar duplicados
                    const uniqueKey = `${horario.id}-${index}-${horario.dia_semana}-${horario.hora_inicio}-${horario.hora_fin}`;
                    return (
                      <TableRow key={uniqueKey}>
                        <TableCell>{horario.dia_semana}</TableCell>
                        <TableCell>{horario.hora_inicio} - {horario.hora_fin}</TableCell>
                        <TableCell>{horario.categoria_edad_nombre || 'Todos'}</TableCell>
                        <TableCell>{horario.instructor}</TableCell>
                        <TableCell>{horario.capacidad_maxima} alumnos</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => eliminarHorario(horario.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="dark:border-red-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-red-600 dark:text-red-400">{isEnglish ? "Holidays" : "Días Festivos"}</CardTitle>
                  <CardDescription>{isEnglish ? "Days without classes" : "Días sin clases"}</CardDescription>
                </div>
                <Dialog open={dialogFestivoAbierto} onOpenChange={setDialogFestivoAbierto}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Festivo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Día Festivo</DialogTitle>
                      <DialogDescription>
                        Marca una fecha como día no laborable para el dojo
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fecha">Fecha</Label>
                        <Input
                          id="fecha"
                          type="date"
                          value={nuevaFecha}
                          onChange={(e) => setNuevaFecha(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="festivo">Tipo de Día Festivo</Label>
                        <Select
                          value={festivoSeleccionado}
                          onValueChange={(value) => {
                            setFestivoSeleccionado(value);
                            if (value !== 'personalizado') {
                              setNuevaDescripcion('');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un día festivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {diasFestivosComunes.map((festivo) => (
                              <SelectItem key={festivo.id} value={festivo.id}>
                                {festivo.nombre}
                                {festivo.fecha !== 'variable' && festivo.fecha !== 'personalizado' && (
                                  <span className="text-gray-500 ml-2">({festivo.fecha})</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {festivoSeleccionado === 'personalizado' && (
                        <div>
                          <Label htmlFor="descripcion">Descripción Personalizada</Label>
                          <Input
                            id="descripcion"
                            placeholder="Ej: Día del Dojo, Vacaciones, etc."
                            value={nuevaDescripcion}
                            onChange={(e) => setNuevaDescripcion(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogFestivoAbierto(false);
                            setNuevaFecha('');
                            setNuevaDescripcion('');
                            setFestivoSeleccionado('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={crearDiaFestivo}
                          disabled={creandoFestivo}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {creandoFestivo ? "Agregando..." : "Agregar"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {diasFestivos.map(festivo => (
                  <div key={festivo.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <p className="font-medium">{festivo.descripcion}</p>
                      <p className="text-sm text-gray-500">
                        {(() => {
                          const fecha = new Date(festivo.fecha);
                          if (isNaN(fecha.getTime())) {
                            return festivo.fecha; // Mostrar la fecha original si es inválida
                          }
                          return fecha.toLocaleDateString('es-ES');
                        })()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => abrirEditarFestivo(festivo)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => eliminarDiaFestivo(festivo.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {diasFestivos.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No hay días festivos registrados</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Modal para editar día festivo */}
          <Dialog open={dialogEditarFestivoAbierto} onOpenChange={setDialogEditarFestivoAbierto}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Día Festivo</DialogTitle>
                <DialogDescription>
                  Modifica la fecha y descripción del día festivo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fecha-editar">Fecha</Label>
                  <Input
                    id="fecha-editar"
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion-editar">Descripción</Label>
                  <Input
                    id="descripcion-editar"
                    placeholder="Ej: Año Nuevo, Carnaval, etc."
                    value={nuevaDescripcion}
                    onChange={(e) => setNuevaDescripcion(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogEditarFestivoAbierto(false);
                      setNuevaFecha('');
                      setNuevaDescripcion('');
                      setFestivoEditando(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={editarDiaFestivo}
                    disabled={editandoFestivo}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {editandoFestivo ? "Actualizando..." : "Actualizar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TAB: BACKUP */}
        <TabsContent value="backup" className="space-y-6">
          <Card className="dark:border-cyan-800">
            <CardHeader>
              <CardTitle className="text-cyan-600 dark:text-cyan-400">{isEnglish ? "Backup and Maintenance" : "Backup y Mantenimiento"}</CardTitle>
              <CardDescription>{isEnglish ? "Export data and perform system maintenance" : "Exporta datos y realiza mantenimiento del sistema"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button onClick={exportarBackup} className="h-24 flex flex-col">
                  <Download className="w-8 h-8 mb-2" />
                  <span>Exportar Backup JSON</span>
                  <span className="text-xs mt-1 opacity-75">Formato JSON del sistema</span>
                </Button>
                <Button onClick={exportarBackupSQL} className="h-24 flex flex-col bg-green-600 hover:bg-green-700">
                  <Download className="w-8 h-8 mb-2" />
                  <span>Exportar Backup SQL</span>
                  <span className="text-xs mt-1 opacity-75">Para importar en phpMyAdmin</span>
                </Button>
                <div className="h-24 flex flex-col">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importarBackupJSON}
                    className="hidden"
                    id="import-json"
                  />
                  <Button 
                    onClick={() => document.getElementById('import-json')?.click()}
                    variant="outline" 
                    className="h-24 flex flex-col bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700"
                  >
                    <Upload className="w-8 h-8 mb-2" />
                    <span>Importar Backup JSON</span>
                    <span className="text-xs mt-1 opacity-90">Restaurar desde archivo JSON</span>
                  </Button>
                </div>
              </div>

              {stats && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Estadísticas del Sistema</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Alumnos</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total_alumnos}</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Evaluaciones</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.total_evaluaciones}</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Usuarios</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.total_usuarios}</p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Logs</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.total_logs}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Último backup: <span className="font-semibold">{stats.ultimo_backup}</span></p>
                  </div>
                </div>
              )}

              {integridad && (
                <div className="mt-6 p-4 border rounded dark:border-gray-700">
                  <h3 className="font-semibold mb-3">Verificación de Integridad</h3>
                  <p className="text-sm mb-2">
                    Estado: <span className={`font-semibold ${integridad.estado === 'correcto' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      {integridad.estado === 'correcto' ? '✓ Correcto' : `⚠ ${integridad.total_problemas} problema(s) encontrado(s)`}
                    </span>
                  </p>
                  {integridad.problemas && integridad.problemas.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {integridad.problemas.map((problema: any, idx: number) => (
                        <p key={idx} className={`text-sm ${problema.tipo === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          • {problema.mensaje}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: LOGS */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{isEnglish ? "Activity Log" : "Registro de Actividades"}</CardTitle>
                  <CardDescription>{isEnglish ? `System action history (${logs.length} records)` : `Historial de acciones en el sistema (${logs.length} registros)`}</CardDescription>
                </div>
                <Button 
                  onClick={limpiarLogsAntiguos} 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpiar Logs Antiguos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay registros de actividad</p>
                  <p className="text-sm mt-2">Los logs aparecerán aquí cuando se realicen acciones en el sistema</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha y Hora</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs font-mono">
                            {(() => {
                              const fecha = new Date(log.created_at);
                              if (isNaN(fecha.getTime())) {
                                return log.created_at;
                              }
                              return fecha.toLocaleString('es-ES', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              });
                            })()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.nombre_completo || log.username}</div>
                              {log.nombre_completo && (
                                <div className="text-xs text-gray-500">@{log.username}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.accion === 'LOGIN' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              log.accion === 'LOGOUT' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                              log.accion === 'CREATE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              log.accion === 'UPDATE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              log.accion === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              log.accion === 'EXPORT' || log.accion === 'IMPORT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                              {log.accion}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                              {log.modulo}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate" title={log.descripcion}>
                            {log.descripcion}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-gray-500">
                            {log.ip_address || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


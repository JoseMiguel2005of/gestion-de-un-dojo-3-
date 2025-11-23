import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Save, RotateCcw, Building2, Palette, Moon, Sun, Layout, Database, Sparkles, Trash2, ClipboardCheck, Languages, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import type { SidebarTheme } from "@/hooks/useTheme";

export default function Configuracion() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [loading, setLoading] = useState(false);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [deletingDemo, setDeletingDemo] = useState(false);
  const [generatingResults, setGeneratingResults] = useState(false);
  const [userLanguage, setUserLanguage] = useState<string>('es');
  const [applyLanguageGlobally, setApplyLanguageGlobally] = useState(false);
  
  // Verificar si el usuario es admin
  const isAdmin = user?.rol === 'admin';
  
  const [config, setConfig] = useState({
    dojo_nombre: '',
    dojo_lema: '',
    dojo_direccion: '',
    dojo_telefono: '',
    dojo_email: '',
    dojo_facebook: '',
    dojo_instagram: '',
    dojo_twitter: '',
    dojo_horarios: '',
    dojo_logo_url: '',
    dojo_fondo_url: '',
    tema_modo: 'light',
    tema_sidebar: 'current' as SidebarTheme
  });

  useEffect(() => {
    loadConfiguration();
    checkConnection();
    loadLanguagePreferences();
  }, []);
  
  const loadLanguagePreferences = async () => {
    try {
      // Obtener idioma del usuario autenticado desde la base de datos
      const userData = await apiClient.verifyToken();
      const lang = userData?.user?.idioma_preferido || 'es';
      setUserLanguage(lang);
    } catch (error) {
      console.error('Error loading language preferences:', error);
      setUserLanguage('es'); // Default a español
    }
  };

  const loadConfiguration = async () => {
    try {
      const data = await apiClient.getConfiguracion();
      setConfig(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const checkConnection = async () => {
    setStatus("checking");
    try {
      await apiClient.getAlumnos();
      setStatus("connected");
    } catch {
      setStatus("error");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Guardar configuración general
      await apiClient.updateConfiguracion(config);
      
      // Guardar tema de sidebar en localStorage para cambio inmediato
      localStorage.setItem('sidebar_theme', config.tema_sidebar);
      
      // Disparar evento para cambiar sidebar inmediatamente
      window.dispatchEvent(new CustomEvent('sidebar-theme-change', { detail: config.tema_sidebar }));
      
      // Guardar idioma en la base de datos
      if (userLanguage) {
        if (isAdmin && applyLanguageGlobally) {
          // Admin aplicando idioma globalmente a TODOS los usuarios
          await apiClient.cambiarIdiomaGlobal(userLanguage);
        } else {
          // Usuario normal o admin solo para su cuenta
          await apiClient.cambiarIdioma(userLanguage);
        }
        // Disparar evento de cambio de idioma
        window.dispatchEvent(new Event('language-change'));
      }
      
      toast({
        title: isEnglish ? "Configuration saved!" : "¡Configuración guardada!",
        description: isEnglish ? "Changes have been applied successfully" : "Los cambios se han aplicado correctamente",
      });
      
      // Recargar solo si cambió el modo (no para sidebar ni idioma)
      if (config.tema_modo !== 'light') {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not save configuration" : "No se pudo guardar la configuración"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(isEnglish ? 'Are you sure you want to restore default settings?' : '¿Estás seguro de restaurar las configuraciones por defecto?')) return;
    
    setLoading(true);
    try {
      await apiClient.resetConfiguracion();
      await loadConfiguration();
      toast({
        title: isEnglish ? "Settings restored" : "Configuración restaurada",
        description: isEnglish ? "Default values have been restored" : "Se han restaurado los valores por defecto",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: isEnglish ? "Could not restore configuration" : "No se pudo restaurar la configuración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleTemaMode = () => {
    const nuevoModo = config.tema_modo === 'light' ? 'dark' : 'light';
    setConfig(prev => ({ ...prev, tema_modo: nuevoModo }));
  };

  const handleGenerateDemoData = async () => {
    if (!confirm(isEnglish ? 'Are you sure you want to generate demo data? This will create sample schedules, evaluations and historical payments.' : '¿Estás seguro de generar datos de demostración? Esto creará horarios, evaluaciones y pagos históricos de ejemplo.')) return;
    
    setGeneratingDemo(true);
    try {
      await apiClient.generateDemoData();
      toast({
        title: isEnglish ? "Demo data generated!" : "¡Datos de demostración generados!",
        description: isEnglish ? "Sample schedules, evaluations and historical payments have been created" : "Se han creado horarios, evaluaciones y pagos históricos de ejemplo",
      });
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not generate demo data" : "No se pudieron generar los datos de demostración"),
        variant: "destructive",
      });
    } finally {
      setGeneratingDemo(false);
    }
  };

  const handleDeleteDemoData = async () => {
    if (!confirm(isEnglish ? 'Are you sure you want to delete demo data? This will remove automatically generated schedules, evaluations and payments. Real data will not be affected.' : '¿Estás seguro de eliminar los datos de demostración? Esto borrará horarios, evaluaciones y pagos generados automáticamente. Los datos reales no se verán afectados.')) return;
    
    setDeletingDemo(true);
    try {
      await apiClient.deleteDemoData();
      toast({
        title: isEnglish ? "Demo data deleted!" : "¡Datos de demostración eliminados!",
        description: isEnglish ? "Sample schedules, evaluations and payments have been removed" : "Se han eliminado los horarios, evaluaciones y pagos de ejemplo",
      });
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not delete demo data" : "No se pudieron eliminar los datos de demostración"),
        variant: "destructive",
      });
    } finally {
      setDeletingDemo(false);
    }
  };

  const handleGenerateResults = async () => {
    setGeneratingResults(true);
    try {
      const result = await apiClient.generarResultadosAleatorios();
      toast({
        title: isEnglish ? "Results generated" : "Resultados generados",
        description: result.message || (isEnglish ? "Random results have been generated for evaluations" : "Se generaron resultados aleatorios para las evaluaciones"),
      });
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not generate results" : "No se pudieron generar los resultados"),
        variant: "destructive",
      });
    } finally {
      setGeneratingResults(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-orange-800 dark:text-orange-400">{isEnglish ? "System Configuration" : "Configuración del Sistema"}</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{isEnglish ? "Customize your dojo and system appearance" : "Personaliza tu dojo y la apariencia del sistema"}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={loading}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
{isEnglish ? "Restore" : "Restaurar"}
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading}
            className="gap-2 bg-orange-600 hover:bg-orange-700"
          >
            <Save className="h-4 w-4" />
{loading ? (isEnglish ? "Saving..." : "Guardando...") : (isEnglish ? "Save Changes" : "Guardar Cambios")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "dojo" : "tema"} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {isAdmin && (
            <TabsTrigger value="dojo">
              <Building2 className="h-4 w-4 mr-2" />
{isEnglish ? "Dojo Information" : "Información del Dojo"}
            </TabsTrigger>
          )}
          <TabsTrigger value="tema">
            <Palette className="h-4 w-4 mr-2" />
{isEnglish ? "Appearance" : "Apariencia"}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="sistema">
              <CheckCircle className="h-4 w-4 mr-2" />
{isEnglish ? "System" : "Sistema"}
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB: Información del Dojo (Solo Admin) */}
        {isAdmin && (
          <TabsContent value="dojo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-400">{isEnglish ? "Basic Data" : "Datos Básicos"}</CardTitle>
              <CardDescription>{isEnglish ? "General information about your dojo" : "Información general de tu dojo"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dojo_nombre">{isEnglish ? "Dojo Name *" : "Nombre del Dojo *"}</Label>
                  <Input
                    id="dojo_nombre"
                    value={config.dojo_nombre}
                    onChange={(e) => handleChange('dojo_nombre', e.target.value)}
                    placeholder={isEnglish ? "Ex: Sakura Dojo" : "Ej: Dojo Sakura"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dojo_email">{isEnglish ? "Contact Email" : "Email de Contacto"}</Label>
                  <Input
                    id="dojo_email"
                    type="email"
                    value={config.dojo_email}
                    onChange={(e) => handleChange('dojo_email', e.target.value)}
                    placeholder={isEnglish ? "contact@mydojo.com" : "contacto@midojo.com"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dojo_lema">{isEnglish ? "Motto or Institutional Phrase" : "Lema o Frase Institucional"}</Label>
                <Input
                  id="dojo_lema"
                  value={config.dojo_lema}
                  onChange={(e) => handleChange('dojo_lema', e.target.value)}
                  placeholder={isEnglish ? "Ex: Excellence in martial arts" : "Ej: Excelencia en el arte marcial"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dojo_direccion">{isEnglish ? "Address" : "Dirección"}</Label>
                <Input
                  id="dojo_direccion"
                  value={config.dojo_direccion}
                  onChange={(e) => handleChange('dojo_direccion', e.target.value)}
                  placeholder={isEnglish ? "Street, city, postal code" : "Calle, ciudad, código postal"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dojo_telefono">{isEnglish ? "Phone" : "Teléfono"}</Label>
                <Input
                  id="dojo_telefono"
                  value={config.dojo_telefono}
                  onChange={(e) => handleChange('dojo_telefono', e.target.value)}
                  placeholder={isEnglish ? "+1 555 123 4567" : "+58 424 123 4567"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dojo_horarios">{isEnglish ? "Class Schedules" : "Horarios de Clases"}</Label>
                <Textarea
                  id="dojo_horarios"
                  value={config.dojo_horarios}
                  onChange={(e) => handleChange('dojo_horarios', e.target.value)}
                  placeholder={isEnglish ? "Monday to Friday: 6:00 AM - 8:00 PM&#10;Saturdays: 8:00 AM - 12:00 PM" : "Lunes a Viernes: 6:00 AM - 8:00 PM&#10;Sábados: 8:00 AM - 12:00 PM"}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-400">{isEnglish ? "Social Media" : "Redes Sociales"}</CardTitle>
              <CardDescription>{isEnglish ? "Links to your social profiles" : "Enlaces a tus perfiles sociales"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dojo_facebook">Facebook</Label>
                <Input
                  id="dojo_facebook"
                  value={config.dojo_facebook}
                  onChange={(e) => handleChange('dojo_facebook', e.target.value)}
                  placeholder={isEnglish ? "https://facebook.com/mydojo" : "https://facebook.com/midojo"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dojo_instagram">Instagram</Label>
                <Input
                  id="dojo_instagram"
                  value={config.dojo_instagram}
                  onChange={(e) => handleChange('dojo_instagram', e.target.value)}
                  placeholder={isEnglish ? "https://instagram.com/mydojo" : "https://instagram.com/midojo"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dojo_twitter">Twitter / X</Label>
                <Input
                  id="dojo_twitter"
                  value={config.dojo_twitter}
                  onChange={(e) => handleChange('dojo_twitter', e.target.value)}
                  placeholder={isEnglish ? "https://twitter.com/mydojo" : "https://twitter.com/midojo"}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-purple-700 dark:text-purple-400">{isEnglish ? "Multimedia" : "Multimedia"}</CardTitle>
              <CardDescription>{isEnglish ? "Custom logo and background (image URLs)" : "Logo y fondo personalizado (URLs de imágenes)"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dojo_logo_url">{isEnglish ? "Logo URL" : "URL del Logo"}</Label>
                <Input
                  id="dojo_logo_url"
                  value={config.dojo_logo_url}
                  onChange={(e) => handleChange('dojo_logo_url', e.target.value)}
                  placeholder={isEnglish ? "https://example.com/logo.png" : "https://ejemplo.com/logo.png"}
                />
                {config.dojo_logo_url && (
                  <img src={config.dojo_logo_url} alt={isEnglish ? "Logo preview" : "Vista previa del logo"} className="mt-2 h-20 object-contain" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dojo_fondo_url">{isEnglish ? "Custom Background URL" : "URL del Fondo Personalizado"}</Label>
                <Input
                  id="dojo_fondo_url"
                  value={config.dojo_fondo_url}
                  onChange={(e) => handleChange('dojo_fondo_url', e.target.value)}
                  placeholder={isEnglish ? "https://example.com/background.jpg" : "https://ejemplo.com/fondo.jpg"}
                />
                {config.dojo_fondo_url && (
                  <img src={config.dojo_fondo_url} alt={isEnglish ? "Background preview" : "Vista previa del fondo"} className="mt-2 h-32 w-full object-cover rounded" />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* TAB: Apariencia */}
        <TabsContent value="tema" className="space-y-4">
          {/* Selector de Idioma */}
          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                <Languages className="h-5 w-5" />
                {isEnglish ? "Language / Idioma" : "Idioma / Language"}
              </CardTitle>
              <CardDescription>
                {isEnglish 
                  ? "Choose your preferred language for the interface" 
                  : "Elige tu idioma preferido para la interfaz"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="language-select">
                  {isEnglish ? "Interface Language" : "Idioma de la Interfaz"}
                </Label>
                <Select 
                  value={userLanguage} 
                  onValueChange={setUserLanguage}
                >
                  <SelectTrigger id="language-select" className="w-full">
                    <SelectValue placeholder={isEnglish ? "Select language" : "Seleccionar idioma"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">
                      <div className="flex items-center gap-2">
                        <span>🇪🇸</span>
                        <span>Español</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="en">
                      <div className="flex items-center gap-2">
                        <span>🇺🇸</span>
                        <span>English</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {isEnglish 
                    ? "Your language preference is saved in your account and will persist across all devices" 
                    : "Tu preferencia de idioma se guarda en tu cuenta y persistirá en todos los dispositivos"}
                </p>
              </div>

              {/* Switch para admin: aplicar globalmente */}
              {isAdmin && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <Label className="font-medium text-blue-800 dark:text-blue-200 cursor-pointer" htmlFor="apply-globally">
                        {isEnglish ? "Apply to All Users" : "Aplicar a Todos los Usuarios"}
                      </Label>
                    </div>
                    <Switch
                      id="apply-globally"
                      checked={applyLanguageGlobally}
                      onCheckedChange={setApplyLanguageGlobally}
                    />
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {applyLanguageGlobally
                      ? (isEnglish 
                          ? "⚠️ This language will be applied to ALL users in the system" 
                          : "⚠️ Este idioma se aplicará a TODOS los usuarios del sistema")
                      : (isEnglish 
                          ? "This language will only be applied to your account" 
                          : "Este idioma solo se aplicará a tu cuenta")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20">
            <CardHeader>
              <CardTitle className="text-purple-700 dark:text-purple-400">{isEnglish ? "System Theme" : "Tema del Sistema"}</CardTitle>
              <CardDescription>{isEnglish ? "Switch between light and dark mode" : "Cambia entre modo claro y oscuro"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {config.tema_modo === 'light' ? (
                    <Sun className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <Moon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                  <div>
                    <Label className="text-base font-medium">{isEnglish ? "Mode" : "Modo"} {config.tema_modo === 'light' ? (isEnglish ? 'Light' : 'Claro') : (isEnglish ? 'Dark' : 'Oscuro')}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{isEnglish ? "Switch between light and dark mode" : "Cambia entre modo claro y oscuro"}</p>
                  </div>
                </div>
                <Switch
                  checked={config.tema_modo === 'dark'}
                  onCheckedChange={toggleTemaMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Selector de tema de sidebar */}
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Layout className="h-5 w-5" />
{isEnglish ? "Sidebar Style" : "Estilo del Menú Lateral"}
              </CardTitle>
              <CardDescription>{isEnglish ? "Choose the navigation sidebar design" : "Elige el diseño del menú lateral de navegación"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tema Actual */}
                <div
                  onClick={() => handleChange('tema_sidebar', 'current')}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    config.tema_sidebar === 'current'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                      : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{isEnglish ? "Modern (Current)" : "Moderno (Actual)"}</h4>
                    {config.tema_sidebar === 'current' && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="h-24 rounded bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900 p-2 flex flex-col gap-1">
                    <div className="h-2 bg-white/20 rounded w-3/4"></div>
                    <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded w-full"></div>
                    <div className="h-2 bg-white/10 rounded w-2/3"></div>
                    <div className="h-2 bg-white/10 rounded w-4/5"></div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
{isEnglish ? "Vibrant gradients with organized sections" : "Gradientes vibrantes con secciones organizadas"}
                  </p>
                </div>

                {/* Tema V1 */}
                <div
                  onClick={() => handleChange('tema_sidebar', 'v1')}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    config.tema_sidebar === 'v1'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                      : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{isEnglish ? "Professional" : "Profesional"}</h4>
                    {config.tema_sidebar === 'v1' && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="h-24 rounded bg-gradient-to-b from-slate-900 to-slate-800 p-2 flex flex-col gap-1">
                    <div className="h-2 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-2 bg-blue-600 rounded w-full"></div>
                    <div className="h-2 bg-slate-700 rounded w-2/3"></div>
                    <div className="h-2 bg-slate-700 rounded w-4/5"></div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
{isEnglish ? "Elegant design with dark tones" : "Diseño elegante con tonos oscuros"}
                  </p>
                </div>

                {/* Tema V2 */}
                <div
                  onClick={() => handleChange('tema_sidebar', 'v2')}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    config.tema_sidebar === 'v2'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                      : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{isEnglish ? "Minimalist" : "Minimalista"}</h4>
                    {config.tema_sidebar === 'v2' && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="h-24 rounded bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 p-2 flex flex-col gap-1">
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                    <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded w-full"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-4/5"></div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
{isEnglish ? "Clean and spacious with orange accents" : "Limpio y espacioso con acentos naranjas"}
                  </p>
                </div>

                {/* Tema Clásico */}
                <div
                  onClick={() => handleChange('tema_sidebar', 'classic')}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    config.tema_sidebar === 'classic'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                      : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{isEnglish ? "Classic" : "Clásico"}</h4>
                    {config.tema_sidebar === 'classic' && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="h-24 rounded bg-gray-800 dark:bg-gray-950 border border-gray-700 p-2 flex flex-col gap-1">
                    <div className="h-2 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-2 bg-orange-600 rounded w-full"></div>
                    <div className="h-2 bg-gray-700 rounded w-2/3"></div>
                    <div className="h-2 bg-gray-700 rounded w-4/5"></div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
{isEnglish ? "Traditional and compact style" : "Estilo tradicional y compacto"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Sistema (Solo Admin) */}
        {isAdmin && (
          <TabsContent value="sistema" className="space-y-4">
          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle className="text-green-700 dark:text-green-400">{isEnglish ? "Connection Status" : "Estado de la Conexión"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status === "connected" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-600 font-medium">{isEnglish ? "Connected" : "Conectado"}</span>
                  </>
                ) : status === "error" ? (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-600 font-medium">{isEnglish ? "Disconnected" : "Desconectado"}</span>
                  </>
                ) : (
                  <span className="text-gray-600">{isEnglish ? "Checking..." : "Verificando..."}</span>
                )}
              </div>
              <Button
                onClick={checkConnection}
                variant="outline"
                className="border-green-300 hover:bg-green-50"
              >
{isEnglish ? "Check Connection" : "Verificar Conexión"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-400">{isEnglish ? "System Information" : "Información del Sistema"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Version:" : "Versión:"}</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Database:" : "Base de Datos:"}</span>
                  <span className="font-medium">MySQL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Status:" : "Estado:"}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{isEnglish ? "Active" : "Activo"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-purple-700 dark:text-purple-400">{isEnglish ? "Demo Data" : "Datos de Demostración"}</CardTitle>
              </div>
              <CardDescription>
{isEnglish ? "Automatically generates schedules, evaluations and historical payments to bring the system to life" : "Genera automáticamente horarios, evaluaciones y pagos históricos para darle vida al sistema"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/50 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">{isEnglish ? "What will be generated?" : "¿Qué se generará?"}</h4>
                <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                  <li>• <strong>{isEnglish ? "Class schedules" : "Horarios de clases"}</strong> {isEnglish ? "adapted by categories (Benjamin, Alevin, Infant, etc.)" : "adaptados por categorías (Benjamín, Alevín, Infantil, etc.)"}</li>
                  <li>• <strong>{isEnglish ? "Evaluations" : "Evaluaciones"}</strong> {isEnglish ? "specific for each level and belt" : "específicas para cada nivel y cinta"}</li>
                  <li>• <strong>{isEnglish ? "Historical payments" : "Pagos históricos"}</strong> {isEnglish ? "from the last 3 months" : "de los últimos 3 meses"}</li>
                  <li>• <strong>{isEnglish ? "Realistic data" : "Datos realistas"}</strong> {isEnglish ? "that simulates a functioning dojo" : "que simulan un dojo en funcionamiento"}</li>
                </ul>
              </div>
           <div className="space-y-3">
             <div className="flex gap-3">
               <Button
                 onClick={handleGenerateDemoData}
                 disabled={generatingDemo || deletingDemo || generatingResults}
                 className="flex-1 bg-purple-600 hover:bg-purple-700 gap-2"
               >
                 <Database className="h-4 w-4" />
{generatingDemo ? (isEnglish ? "Generating..." : "Generando...") : (isEnglish ? "Generate Data" : "Generar Datos")}
               </Button>
               <Button
                 onClick={handleDeleteDemoData}
                 disabled={generatingDemo || deletingDemo || generatingResults}
                 variant="destructive"
                 className="flex-1 gap-2"
               >
                 <Trash2 className="h-4 w-4" />
{deletingDemo ? (isEnglish ? "Deleting..." : "Eliminando...") : (isEnglish ? "Delete Data" : "Eliminar Datos")}
               </Button>
             </div>
             <div className="flex gap-3">
               <Button
                 onClick={handleGenerateResults}
                 disabled={generatingDemo || deletingDemo || generatingResults}
                 className="flex-1 bg-orange-600 hover:bg-orange-700 gap-2"
               >
                 <ClipboardCheck className="h-4 w-4" />
{generatingResults ? (isEnglish ? "Generating..." : "Generando...") : (isEnglish ? "Generate Results" : "Generar Resultados")}
               </Button>
             </div>
           </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

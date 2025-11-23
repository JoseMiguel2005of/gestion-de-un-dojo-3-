import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, CreditCard, Building2, Smartphone, Calendar, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { VerificacionPagoForm } from "@/components/forms/VerificacionPagoForm";
import { useLanguage, getTranslation, translateBelt } from "@/hooks/useLanguage";

interface ConfigPagos {
  metodos_pago: string;
  moneda?: string;
  banco_nombre?: string;
  banco_cuenta?: string;
  banco_titular?: string;
  banco_cedula?: string;
  pago_movil_telefono?: string;
  pago_movil_banco?: string;
  pago_movil_cedula?: string;
  zelle_email?: string;
  paypal_email?: string;
  otro_metodo?: string;
  mensualidad_monto?: number;
  tipo_cambio_usd_bs?: number;
}

interface Pago {
  id: number;
  id_alumno: number;
  mes: number;
  anio: number;
  monto: number;
  metodo_pago: string;
  fecha_pago: string;
  mes_correspondiente: string;
  estado: string;
  referencia?: string;
  banco_origen?: string;
  cedula_titular?: string;
  telefono_cuenta?: string;
  comprobante?: string;
  observaciones?: string;
  registrado_por?: number;
  created_at: string;
  alumno_nombre?: string;
  registrado_por_nombre?: string;
}

interface PrecioAlumno {
  alumno_id: number;
  nombre: string;
  precio_final: number;
  categoria_nombre: string;
  cinta_alumno?: string;
  precio_personalizado?: number;
  descuento_porcentaje?: number;
  es_alumno_nuevo?: boolean;
  costo_inscripcion?: number;
  precio_base?: number;
}

export default function Pagos() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const [configPagos, setConfigPagos] = useState<ConfigPagos | null>(null);
  const [misPagos, setMisPagos] = useState<Pago[]>([]);
  const [precioAlumno, setPrecioAlumno] = useState<PrecioAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [dialogPago, setDialogPago] = useState(false);
  const [dialogDetalles, setDialogDetalles] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  
  const isUsuarioNormal = user?.rol === 'usuario';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      
      const config = await apiClient.getConfigPagos();
      setConfigPagos(config);

     
      if (isUsuarioNormal) {
        const alumnosData = await apiClient.getAlumnos();
        setAlumnos(alumnosData);
        
       
        if (alumnosData.length > 0) {
          try {
            const precio = await apiClient.getPrecioAlumno(alumnosData[0].id);
            setPrecioAlumno(precio);
          } catch (error) {
            console.error('Error obteniendo precio del alumno:', error);
          }
        }
        
        
        const pagos = await apiClient.getPagos();
        setMisPagos(pagos);
      } else {
        
        const pagos = await apiClient.getPagos();
        setMisPagos(pagos);
      }
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      toast({
        title: isEnglish ? "Error" : "Error",
        description: isEnglish ? "Could not load payment data" : "No se pudieron cargar los datos de pagos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProximoMes = () => {
    const hoy = new Date();
    
    const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 5);
    return proximoMes.toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    });
  };

  
  const getLastConfirmedPayment = (pagos: any[]) => {
    if (!pagos || pagos.length === 0) return null;
    const confirmedPayments = pagos.filter(p => p.estado === 'confirmado');
    if (confirmedPayments.length === 0) return null;
   
    return confirmedPayments.sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime())[0];
  };

  const lastPayment = getLastConfirmedPayment(misPagos);

  const formatPrice = (price: any) => {
    const numPrice = Number(price) || 0;
    const currency = configPagos?.moneda || 'USD$';
    
   
    let finalPrice = numPrice;
    if (currency === 'BS.') {
      finalPrice = numPrice * 201;
    }
    
    
    const formattedPrice = finalPrice.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${currency} ${formattedPrice}`;
  };

  
  const handleClickPago = (pago: Pago) => {
    setPagoSeleccionado(pago);
    setDialogDetalles(true);
  };

  // Los métodos de pago ahora se configuran según el país, no según la moneda
  // No necesitamos filtrar porque el backend ya devuelve los métodos correctos según pais_configuracion
  const metodosPago = configPagos?.metodos_pago;
  let metodosPagoArray: string[] = [];
  
  if (typeof metodosPago === 'string') {
    try {
      // Intentar parsear como JSON
      metodosPagoArray = JSON.parse(metodosPago);
    } catch {
      // Si no es JSON, tratar como string separado por comas
      metodosPagoArray = metodosPago.split(',').map(m => m.trim());
    }
  } else if (Array.isArray(metodosPago)) {
    metodosPagoArray = metodosPago;
  }
  
  const metodosPagoFiltrados = metodosPagoArray;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-green-800 dark:text-green-400 flex items-center gap-2">
          <DollarSign className="h-8 w-8" />
          {isEnglish ? "Payments and Monthly Fees" : "Pagos y Mensualidades"}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {isEnglish ? "Payment information, available methods and your history" : "Información de pagos, métodos disponibles y tu historial"}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">{isEnglish ? "Loading information..." : "Cargando información..."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monto Mensual */}
          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <CardTitle className="text-green-700 dark:text-green-400">
                    {isUsuarioNormal 
                      ? getTranslation('commonMessages.yourMonthlyFee', isEnglish)
                      : (isEnglish ? 'Base Monthly Fee' : 'Mensualidad Base')
                    }
                  </CardTitle>
                </div>
                <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                  {formatPrice(isUsuarioNormal ? (precioAlumno?.precio_final || 0) : (configPagos?.mensualidad_monto || 0))}
                </div>
                {configPagos?.moneda === 'USD$' && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span className="font-medium">{isEnglish ? "Equivalent:" : "Equivalente:"}</span> BS. {((isUsuarioNormal ? (precioAlumno?.precio_final || 0) : (configPagos?.mensualidad_monto || 0)) * 201).toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                )}
                {configPagos?.moneda === 'BS.' && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span className="font-medium">{isEnglish ? "Equivalent:" : "Equivalente:"}</span> USD$ {(Number(isUsuarioNormal ? (precioAlumno?.precio_final || 0) : (configPagos?.mensualidad_monto || 0))).toFixed(2)}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isUsuarioNormal ? (
                <div className="space-y-3">
                  <p className="text-gray-600 dark:text-gray-300">
                    {getTranslation('commonMessages.amountOfMonthlyFee', isEnglish)}
                  </p>
                  {precioAlumno && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                      <p><span className="font-medium">{getTranslation('commonMessages.student', isEnglish)}</span> {precioAlumno.nombre}</p>
                      <p><span className="font-medium">{getTranslation('commonMessages.category', isEnglish)}</span> {precioAlumno.categoria_nombre || getTranslation('commonMessages.noCategory', isEnglish)}</p>
                      {precioAlumno.cinta_alumno && (
                        <p><span className="font-medium">{getTranslation('commonMessages.belt', isEnglish)}</span> 
                          <span className="text-purple-600 dark:text-purple-400 font-medium ml-1">
                            {translateBelt(precioAlumno.cinta_alumno, isEnglish)}
                          </span>
                        </p>
                      )}
                      {precioAlumno.descuento_porcentaje && precioAlumno.descuento_porcentaje > 0 && (
                        <p className="text-green-600 dark:text-green-400">
                          <span className="font-medium">{getTranslation('commonMessages.appliedDiscount', isEnglish)}</span> {precioAlumno.descuento_porcentaje}%
                        </p>
                      )}
                    </div>
                  )}
                  <Button
                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                    onClick={() => setDialogPago(true)}
                  >
                    {isEnglish ? "Register Payment" : "Registrar Pago"}
                  </Button>
                  
                  {/* Información del próximo pago */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      📅 {getTranslation('commonMessages.nextPayment', isEnglish)}
                    </h4>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <p>
                        <span className="font-medium">{getTranslation('commonMessages.dueDate', isEnglish)}</span> {getProximoMes()}
                      </p>
                      <p>
                        <span className="font-medium">{getTranslation('commonMessages.amount', isEnglish)}</span> 
                        <span className="text-lg font-bold text-blue-700 dark:text-blue-300 ml-1">
                          {formatPrice(precioAlumno?.precio_final || 0)}
                        </span>
                      </p>
                      {precioAlumno?.es_alumno_nuevo && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 p-2 rounded border-l-2 border-blue-400">
                          <p className="font-medium mb-1">{getTranslation('commonMessages.firstPaymentBreakdown', isEnglish)}</p>
                          <p>• {getTranslation('commonMessages.monthlyFee', isEnglish)} {formatPrice(precioAlumno?.precio_base || 0)}</p>
                          <p>• {getTranslation('commonMessages.registrationFee', isEnglish)} {formatPrice(precioAlumno?.costo_inscripcion || 0)}</p>
                          <p className="font-medium mt-1">• {getTranslation('commonMessages.total', isEnglish)} {formatPrice(precioAlumno?.precio_final || 0)}</p>
                        </div>
                      )}
                      {configPagos?.moneda === 'USD$' && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          <span className="font-medium">{getTranslation('commonMessages.equivalent', isEnglish)}</span> BS. {((precioAlumno?.precio_final || 0) * (configPagos?.tipo_cambio_usd_bs || 220)).toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      )}
                      {configPagos?.moneda === 'BS.' && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          <span className="font-medium">{getTranslation('commonMessages.equivalent', isEnglish)}</span> USD$ {((precioAlumno?.precio_final || 0) / (configPagos?.tipo_cambio_usd_bs || 220)).toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      )}
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {getTranslation('commonMessages.rememberToPay', isEnglish)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  {getTranslation('commonMessages.baseMonthlyFee', isEnglish)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Estado de Pago */}
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-blue-700 dark:text-blue-400">{isEnglish ? "Current Status" : "Estado Actual"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">{getTranslation('commonMessages.currentMonth', isEnglish)}</span>
                  <Badge className="bg-blue-600 hover:bg-blue-700">
                    {new Date().toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' })}
                  </Badge>
                </div>
                
                {lastPayment ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{getTranslation('commonMessages.lastPayment', isEnglish)}</span>
                      <Badge className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {new Date(lastPayment.fecha_pago).toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{getTranslation('commonMessages.amountPaid', isEnglish)}</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatPrice(lastPayment.monto)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{getTranslation('commonMessages.method', isEnglish)}</span>
                      <Badge variant="outline" className="border-gray-300 dark:border-gray-600">
                        {isEnglish && lastPayment.metodo_pago === 'Transferencia' ? 'Transfer' : 
                         isEnglish && lastPayment.metodo_pago === 'Pago Móvil' ? 'Mobile Payment' : 
                         lastPayment.metodo_pago}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{getTranslation('commonMessages.status', isEnglish)}</span>
                      <Badge className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {getTranslation('commonMessages.upToDate', isEnglish)}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Status:" : "Estado:"}</span>
                      <Badge className="bg-yellow-600 hover:bg-yellow-700">
                        {isEnglish ? "No payments registered" : "Sin pagos registrados"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                      {isEnglish ? "Make your first payment to get started" : "Realiza tu primer pago para comenzar"}
                    </div>
                  </>
                )}
                
                {misPagos.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{getTranslation('commonMessages.totalPayments', isEnglish)}</span>
                      <Badge variant="outline" className="border-blue-300 dark:border-blue-600">
                        {misPagos.length} {getTranslation('commonMessages.registered', isEnglish)}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Historial de Pagos */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <CardTitle className="text-gray-800 dark:text-gray-200">
            {getTranslation('payments.paymentHistory', isEnglish)}
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            {getTranslation('payments.yourRecentPayments', isEnglish)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {misPagos.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              {getTranslation('payments.noPaymentsYet', isEnglish)}
            </p>
          ) : (
            <div className="space-y-3">
              {misPagos.slice(0, 5).map((pago) => (
                <div
                  key={pago.id}
                  className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => handleClickPago(pago)}
                  title={getTranslation('payments.clickForDetails', isEnglish)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {(() => {
                          // Traducir el mes si está en inglés
                          if (isEnglish) {
                            // Extraer mes y año del formato "mes de año"
                            const [mes, , año] = pago.mes_correspondiente.split(' ');
                            const mesesEs = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                            const mesesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                            const mesIndex = mesesEs.findIndex(m => m.toLowerCase() === mes.toLowerCase());
                            if (mesIndex !== -1 && año) {
                              return `${mesesEn[mesIndex]} ${año}`;
                            }
                          }
                          return pago.mes_correspondiente;
                        })()}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isEnglish && pago.metodo_pago === 'Transferencia' ? 'Transfer' : 
                         isEnglish && pago.metodo_pago === 'Pago Móvil' ? 'Mobile Payment' : 
                         pago.metodo_pago} • {isEnglish ? "Ref:" : "Ref:"} {pago.referencia}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      ${pago.monto}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(pago.fecha_pago).toLocaleDateString(isEnglish ? 'en-US' : 'es-ES')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para registrar pago */}
      <Dialog open={dialogPago} onOpenChange={setDialogPago}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEnglish ? "Payment Verification" : "Verificación de Pago"}</DialogTitle>
            <DialogDescription>
              {isEnglish 
                ? "Complete your transfer or mobile payment details for verification"
                : "Complete los datos de su transferencia o pago móvil para verificación"
              }
            </DialogDescription>
          </DialogHeader>
          <VerificacionPagoForm
            montoPagar={Number(precioAlumno?.precio_final || configPagos?.mensualidad_monto || 0)}
            onSuccess={() => {
              setDialogPago(false);
              loadData();
            }}
            moneda={configPagos?.moneda}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para detalles del pago */}
      <Dialog open={dialogDetalles} onOpenChange={setDialogDetalles}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              {getTranslation('paymentDetails.title', isEnglish)}
            </DialogTitle>
            <DialogDescription>
              {getTranslation('paymentDetails.description', isEnglish)}
            </DialogDescription>
          </DialogHeader>
          
          {pagoSeleccionado && (
            <div className="space-y-6">
              {/* Información principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">{getTranslation('paymentDetails.paymentInfo', isEnglish)}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{getTranslation('paymentDetails.amount', isEnglish)}:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {formatPrice(pagoSeleccionado.monto)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{getTranslation('paymentDetails.method', isEnglish)}:</span>
                        <span className="font-medium">{pagoSeleccionado.metodo_pago}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{getTranslation('paymentDetails.status', isEnglish)}:</span>
                        <Badge className={`${
                          pagoSeleccionado.estado === 'confirmado' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        }`}>
                          {pagoSeleccionado.estado === 'confirmado' 
                            ? (isEnglish ? '✅ Confirmed' : '✅ Confirmado')
                            : (isEnglish ? '⏳ Pending' : '⏳ Pendiente')
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">{isEnglish ? "Dates and Period" : "Fechas y Período"}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Payment Date:" : "Fecha de Pago:"}</span>
                        <span className="font-medium">
                          {new Date(pagoSeleccionado.fecha_pago).toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Corresponding Month:" : "Mes Correspondiente:"}</span>
                        <span className="font-medium">
                          {(() => {
                            if (isEnglish) {
                              const [mes, , año] = pagoSeleccionado.mes_correspondiente.split(' ');
                              const mesesEs = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                              const mesesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                              const mesIndex = mesesEs.findIndex(m => m.toLowerCase() === mes.toLowerCase());
                              if (mesIndex !== -1 && año) {
                                return `${mesesEn[mesIndex]} ${año}`;
                              }
                            }
                            return pagoSeleccionado.mes_correspondiente;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Registered:" : "Registrado:"}</span>
                        <span className="font-medium">
                          {new Date(pagoSeleccionado.created_at).toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información bancaria */}
              {(pagoSeleccionado.referencia || pagoSeleccionado.banco_origen || pagoSeleccionado.cedula_titular) && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">{isEnglish ? "Banking Information" : "Información Bancaria"}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {pagoSeleccionado.referencia && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Reference:" : "Referencia:"}</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{pagoSeleccionado.referencia}</span>
                      </div>
                    )}
                    {pagoSeleccionado.banco_origen && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Source Bank:" : "Banco Origen:"}</span>
                        <span className="font-medium">{pagoSeleccionado.banco_origen}</span>
                      </div>
                    )}
                    {pagoSeleccionado.cedula_titular && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "ID Number:" : "Cédula Titular:"}</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{pagoSeleccionado.cedula_titular}</span>
                      </div>
                    )}
                    {pagoSeleccionado.telefono_cuenta && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{isEnglish ? "Account Phone:" : "Teléfono Cuenta:"}</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{pagoSeleccionado.telefono_cuenta}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {pagoSeleccionado.observaciones && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">{isEnglish ? "Observations" : "Observaciones"}</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{pagoSeleccionado.observaciones}</p>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage, getTranslation } from "@/hooks/useLanguage";

const BANCOS_VENEZUELA = [
  "Banco de Venezuela",
  "Banesco",
  "Banco Mercantil",
  "Banco Provincial (BBVA)",
  "Bancamiga",
  "Banco Bicentenario",
  "Bancaribe",
  "Banco Exterior",
  "Banco Activo",
  "Banco Nacional de Crédito (BNC)",
  "Mi Banco",
  "Banco del Tesoro",
  "Banco Sofitasa",
  "Bangente",
  "Banco Plaza",
  "Banco Caroní",
  "Banco Fondo Común",
  "100% Banco",
  "Banplus",
  "Banco Venezolano de Crédito",
];

const BANCOS_ESTADOS_UNIDOS = [
  "Bank of America",
  "Wells Fargo",
  "JPMorgan Chase",
  "Citibank",
  "U.S. Bank",
  "PNC Bank",
  "Capital One",
  "TD Bank",
  "HSBC Bank USA",
  "Regions Bank",
  "Fifth Third Bank",
  "KeyBank",
  "SunTrust Bank",
  "BB&T Bank",
  "Comerica Bank",
  "Huntington Bank",
  "M&T Bank",
  "First National Bank",
  "BMO Harris Bank",
  "Citizens Bank",
];

type VerificacionPagoFormData = {
  banco_origen: string;
  referencia: string;
  cedula_titular: string;
  telefono_cuenta: string;
  fecha_transferencia: string;
  monto: string;
  metodo_pago: "transferencia" | "pago_movil" | "zelle" | "paypal";
};

interface VerificacionPagoFormProps {
  montoPagar: number;
  onSuccess: () => void;
  moneda?: string;
}

export function VerificacionPagoForm({ montoPagar, onSuccess, moneda }: VerificacionPagoFormProps) {
  const [paisConfiguracion, setPaisConfiguracion] = useState<string>('venezuela');

  useEffect(() => {
    // Cargar configuración de país
    const cargarConfigPais = async () => {
      try {
        const config = await apiClient.getConfigPagos();
        setPaisConfiguracion(config.pais_configuracion || 'venezuela');
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    };
    cargarConfigPais();
  }, []);
  const [loading, setLoading] = useState(false);
  const [esPagoAdelantado, setEsPagoAdelantado] = useState(false);
  const { isEnglish } = useLanguage();

  // Crear esquema de validación dinámico basado en el país de configuración
  const validationSchema = useMemo(() => {
    return z.object({
      banco_origen: z.string().min(1, isEnglish ? "Select the bank" : "Seleccione el banco"),
      referencia: z.string()
        .min(4, isEnglish ? "Reference must have at least 4 characters" : "La referencia debe tener al menos 4 caracteres")
        .max(20, isEnglish ? "Reference cannot exceed 20 characters" : "La referencia no puede exceder 20 caracteres")
        .regex(/^[0-9]+$/, isEnglish ? "Reference can only contain numbers" : "La referencia solo puede contener números"),
      cedula_titular: z.string()
        .min(1, isEnglish ? "ID is required" : "El ID es requerido")
        .refine((val) => {
          if (paisConfiguracion === 'usa') {
            // Validación para formato estadounidense (SSN o ID)
            return /^\d{3}-?\d{2}-?\d{4}$|^\d{9}$/.test(val);
          } else {
            // Validación para formato venezolano
            return /^[VvEeJjGgPp]-?\d{7,8}$/.test(val);
          }
        }, paisConfiguracion === 'usa' ? "Invalid ID format (e.g: 123-45-6789 or 123456789)" : "Formato de cédula inválido (ej: V-12345678 o V12345678)"),
      telefono_cuenta: z.string()
        .min(1, isEnglish ? "Phone is required" : "El teléfono es requerido")
        .refine((val) => {
          if (paisConfiguracion === 'usa') {
            // Validación para formato estadounidense
            return /^\(\d{3}\)\s?\d{3}-?\d{4}$|^\d{3}-?\d{3}-?\d{4}$|^\d{10}$/.test(val);
          } else {
            // Validación para formato venezolano
            return /^0\d{3}-?\d{7}$/.test(val);
          }
        }, paisConfiguracion === 'usa' ? "Invalid phone format (e.g: (555) 123-4567 or 555-123-4567)" : "Formato de teléfono inválido (ej: 04121234567 o 0412-1234567)"),
      fecha_transferencia: z.string()
        .min(1, isEnglish ? "Date is required" : "La fecha es requerida")
        .refine((date) => {
          const transferDate = new Date(date);
          const today = new Date();
          const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const minDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
          
          return transferDate >= minDate && transferDate <= maxDate;
        }, isEnglish ? "Date must be between last month and today" : "La fecha debe estar entre el mes pasado y hoy"),
      monto: z.string()
        .min(1, isEnglish ? "Amount is required" : "El monto es requerido")
        .refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        }, isEnglish ? "Amount must be a positive number" : "El monto debe ser un número positivo"),
      metodo_pago: z.enum(["transferencia", "pago_movil", "zelle", "paypal"]),
    });
  }, [paisConfiguracion, isEnglish]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<VerificacionPagoFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      monto: String(montoPagar),
      fecha_transferencia: new Date().toISOString().split('T')[0],
    },
  });

  // Actualizar el resolver cuando cambie el país o el método de pago
  useEffect(() => {
    reset({
      monto: String(montoPagar),
      fecha_transferencia: new Date().toISOString().split('T')[0],
      metodo_pago: undefined,
      banco_origen: '',
      referencia: '',
      cedula_titular: '',
      telefono_cuenta: '',
    });
  }, [paisConfiguracion, reset, montoPagar]);

  // Resetear campos cuando cambie el método de pago
  useEffect(() => {
    if (metodoPago) {
      setValue('banco_origen', '');
      setValue('referencia', '');
      setValue('cedula_titular', '');
      setValue('telefono_cuenta', '');
    }
  }, [metodoPago, setValue]);

  const metodoPago = watch("metodo_pago");

  useEffect(() => {
    const verificarPagoExistente = async () => {
      try {
        const pagos = await apiClient.getPagos();
        const mesActual = new Date().getMonth() + 1;
        const anioActual = new Date().getFullYear();
        
        // Calcular el mes siguiente para pagos adelantados
        const proximoMesDate = new Date(anioActual, mesActual, 1);
        proximoMesDate.setMonth(proximoMesDate.getMonth() + 1);
        const proximoMes = proximoMesDate.getMonth() + 1;
        const proximoAnio = proximoMesDate.getFullYear();
        
        // Verificar que existe un pago CONFIRMADO del mes actual
        const pagoConfirmadoMesActual = pagos.find((pago: any) => 
          pago.mes === mesActual && 
          pago.anio === anioActual && 
          pago.estado === 'confirmado'
        );
        
        // Verificar si ya existe un pago para el próximo mes
        const pagoProximoMes = pagos.find((pago: any) => 
          pago.mes === proximoMes && 
          pago.anio === proximoAnio
        );
        
        // Solo permitir pago adelantado si:
        // 1. Ya pagó el mes actual (confirmado)
        // 2. NO existe ya un pago para el próximo mes
        if (pagoConfirmadoMesActual && !pagoProximoMes) {
          setEsPagoAdelantado(true);
        } else if (pagoProximoMes) {
          // Si ya existe un pago para el próximo mes, informar
          console.warn(`Ya existe un pago para ${proximoMes}/${proximoAnio}:`, pagoProximoMes);
          setEsPagoAdelantado(false);
        } else {
          setEsPagoAdelantado(false);
        }
      } catch (error) {
        console.error('Error verificando pagos existentes:', error);
        setEsPagoAdelantado(false);
      }
    };

    verificarPagoExistente();
  }, []);

  const onSubmit = async (data: VerificacionPagoFormData) => {
    // Si es un pago adelantado, verificar que el usuario ya pagó el mes actual
    if (esPagoAdelantado) {
      try {
        const pagos = await apiClient.getPagos();
        const mesActual = new Date().getMonth() + 1;
        const anioActual = new Date().getFullYear();
        
        const pagoConfirmadoMesActual = pagos.find((pago: any) => 
          pago.mes === mesActual && 
          pago.anio === anioActual && 
          pago.estado === 'confirmado'
        );
        
        if (!pagoConfirmadoMesActual) {
          toast({
            title: isEnglish ? "Error" : "Error",
            description: isEnglish 
              ? "You cannot make an advance payment. You must first pay and confirm the current month's payment."
              : "No puedes realizar un pago adelantado. Debes pagar y confirmar primero el mes actual.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error('Error verificando pago del mes actual:', error);
        toast({
          title: isEnglish ? "Error" : "Error",
          description: isEnglish 
            ? "Could not verify current month payment. Please try again."
            : "No se pudo verificar el pago del mes actual. Por favor intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }
    }
    
    const fechaTransferencia = new Date(data.fecha_transferencia + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const diferenciaDias = Math.floor((hoy.getTime() - fechaTransferencia.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diferenciaDias < 0 || diferenciaDias > 1) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: isEnglish ? "The transfer must have been made today" : "La transferencia debe haber sido realizada el día de hoy",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let mesCorrespondiente;
      let observaciones = "";
      
      console.log(`[Frontend] esPagoAdelantado (estado inicial): ${esPagoAdelantado}`);
      
      // Verificar nuevamente si debería ser pago adelantado basándose en los pagos existentes
      const pagosRecientes = await apiClient.getPagos();
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();
      const proximoMesDate = new Date(anioActual, mesActual, 1);
      proximoMesDate.setMonth(proximoMesDate.getMonth() + 1);
      const proximoMes = proximoMesDate.getMonth() + 1;
      const proximoAnio = proximoMesDate.getFullYear();
      
      console.log(`[Frontend] Mes actual: ${mesActual}/${anioActual}, Próximo mes: ${proximoMes}/${proximoAnio}`);
      
      const pagoConfirmadoMesActual = pagosRecientes.find((pago: any) => 
        pago.mes === mesActual && 
        pago.anio === anioActual && 
        pago.estado === 'confirmado'
      );
      const pagoProximoMes = pagosRecientes.find((pago: any) => 
        pago.mes === proximoMes && 
        pago.anio === proximoAnio
      );
      
      console.log(`[Frontend] ¿Tiene pago confirmado del mes actual? ${!!pagoConfirmadoMesActual}`);
      console.log(`[Frontend] ¿Tiene pago del próximo mes? ${!!pagoProximoMes}`);
      
      // Si tiene pago confirmado del mes actual y NO tiene pago del próximo mes, DEBE ser pago adelantado
      let esPagoAdelantadoFinal = false;
      if (pagoConfirmadoMesActual && !pagoProximoMes) {
        esPagoAdelantadoFinal = true;
        console.log(`[Frontend] ✅ FORZANDO pago adelantado: tiene pago del mes actual y NO tiene del próximo`);
      } else if (esPagoAdelantado) {
        esPagoAdelantadoFinal = true;
        console.log(`[Frontend] ✅ Pago adelantado confirmado por estado inicial`);
      } else {
        console.log(`[Frontend] ⚠️ NO es pago adelantado`);
      }
      
      if (esPagoAdelantadoFinal) {
        const proximoMesCalc = new Date();
        proximoMesCalc.setMonth(proximoMesCalc.getMonth() + 1);
        mesCorrespondiente = proximoMesCalc.toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' });
        observaciones = (isEnglish ? "Advanced payment - " : "Pago adelantado - ") + mesCorrespondiente;
        console.log(`[Frontend] ✅ Pago adelantado. Mes correspondiente: ${mesCorrespondiente}`);
        console.log(`[Frontend] Observaciones a enviar: "${observaciones}"`);
      } else {
        mesCorrespondiente = new Date().toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' });
        console.log(`[Frontend] ⚠️ Pago normal. Mes correspondiente: ${mesCorrespondiente}`);
      }

      let metodoPagoTexto = isEnglish ? "Transfer" : "Transferencia";
      if (data.metodo_pago === "pago_movil") {
        metodoPagoTexto = isEnglish ? "Mobile Payment" : "Pago Móvil";
      } else if (data.metodo_pago === "zelle") {
        metodoPagoTexto = "Zelle";
      } else if (data.metodo_pago === "paypal") {
        metodoPagoTexto = "PayPal";
      }

      const pagoData = {
        monto: parseFloat(data.monto),
        metodo_pago: metodoPagoTexto,
        referencia: data.referencia,
        banco_origen: data.banco_origen,
        cedula_titular: data.cedula_titular,
        telefono_cuenta: data.telefono_cuenta,
        fecha_pago: data.fecha_transferencia,
        estado: "confirmado",
        mes_correspondiente: mesCorrespondiente,
        observaciones: observaciones,
      };
      
      console.log(`[Frontend] ========== DATOS DEL PAGO ==========`);
      console.log(`[Frontend] esPagoAdelantado (final): ${esPagoAdelantadoFinal}`);
      console.log(`[Frontend] mes_correspondiente: "${mesCorrespondiente}"`);
      console.log(`[Frontend] observaciones: "${observaciones}"`);
      console.log(`[Frontend] fecha_pago: "${data.fecha_transferencia}"`);
      console.log(`[Frontend] Datos completos:`, JSON.stringify(pagoData, null, 2));
      
      await apiClient.createPago(pagoData);

      const mensaje = esPagoAdelantadoFinal 
        ? isEnglish 
          ? `Advance payment confirmed! Your payment has been registered for ${mesCorrespondiente}. Thank you for your anticipation!`
          : `¡Pago adelantado confirmado! Tu pago ha sido registrado para ${mesCorrespondiente}. ¡Gracias por tu anticipación!`
        : isEnglish
          ? "Your payment has been verified and confirmed successfully. Thank you for your timely payment!"
          : "Tu pago ha sido verificado y confirmado exitosamente. ¡Gracias por tu pago puntual!";

      toast({
        title: esPagoAdelantado 
          ? (isEnglish ? "Advance Payment!" : "¡Pago Adelantado!")
          : (isEnglish ? "Payment Confirmed!" : "¡Pago confirmado!"),
        description: mensaje,
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Error",
        description: error.message || (isEnglish ? "Could not register the payment" : "No se pudo registrar el pago"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
          ✅ {getTranslation('paymentVerification.automaticVerification', isEnglish)}
        </h3>
        <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
          <li>{getTranslation('paymentVerification.transferSameDay', isEnglish)}</li>
          <li>{getTranslation('paymentVerification.ensureCorrectData', isEnglish)}</li>
          <li>{getTranslation('paymentVerification.automaticConfirmation', isEnglish)}</li>
        </ul>
      </div>

      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-lg font-semibold text-green-900 dark:text-green-100">
          {getTranslation('paymentVerification.amountToPay', isEnglish)} <span className="text-2xl">${montoPagar}</span>
        </p>
        {esPagoAdelantado && (
          <div className="mt-2 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
              💡 <strong>{isEnglish ? "Advance Payment Detected" : "Pago Adelantado Detectado"}</strong>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {isEnglish 
                ? "Since you have already paid and confirmed the current month, this payment will be registered for next month."
                : "Como ya has pagado y confirmado el mes actual, este pago se registrará para el próximo mes."
              }
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="metodo_pago">{getTranslation('paymentVerification.paymentMethod', isEnglish)}</Label>
        <Select
          onValueChange={(value) => setValue("metodo_pago", value as "transferencia" | "pago_movil" | "zelle" | "paypal")}
          value={watch("metodo_pago")}
        >
          <SelectTrigger>
            <SelectValue placeholder={getTranslation('paymentVerification.selectPaymentMethod', isEnglish)} />
          </SelectTrigger>
          <SelectContent>
            {paisConfiguracion === 'usa' ? (
              <>
                <SelectItem value="transferencia">{getTranslation('paymentVerification.bankTransfer', isEnglish)}</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="pago_movil">{getTranslation('paymentVerification.mobilePayment', isEnglish)}</SelectItem>
                <SelectItem value="transferencia">{getTranslation('paymentVerification.bankTransfer', isEnglish)}</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        {errors.metodo_pago && (
          <p className="text-sm text-destructive">{errors.metodo_pago.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="banco_origen">
          {metodoPago === "pago_movil" 
            ? (isEnglish ? "Bank from which you make the operation" : "Banco desde donde realiza la operación")
            : metodoPago === "zelle" 
            ? (isEnglish ? "Bank associated with Zelle" : "Banco asociado a Zelle")
            : metodoPago === "paypal" 
            ? (isEnglish ? "Bank associated with PayPal" : "Banco asociado a PayPal")
            : (isEnglish ? "Bank from which you make the transfer" : "Banco desde donde realiza la transferencia")
          }
        </Label>
        <Select
          onValueChange={(value) => setValue("banco_origen", value)}
          value={watch("banco_origen")}
        >
          <SelectTrigger>
            <SelectValue placeholder={isEnglish ? "Select your bank" : "Seleccione su banco"} />
          </SelectTrigger>
          <SelectContent>
            {(paisConfiguracion === 'usa' ? BANCOS_ESTADOS_UNIDOS : BANCOS_VENEZUELA).map((banco) => (
              <SelectItem key={banco} value={banco}>
                {banco}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.banco_origen && (
          <p className="text-sm text-destructive">{errors.banco_origen.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="referencia">
            {metodoPago === "pago_movil" 
              ? (isEnglish ? "Mobile Payment Reference" : "Referencia del Pago Móvil")
              : metodoPago === "zelle" 
              ? (isEnglish ? "Zelle Reference" : "Referencia de Zelle")
              : metodoPago === "paypal" 
              ? (isEnglish ? "PayPal Reference" : "Referencia de PayPal")
              : (isEnglish ? "Payment Reference" : "Referencia del Pago")
            }
          </Label>
          <Input 
            id="referencia" 
            {...register("referencia")} 
            placeholder="123456789"
            maxLength={20}
            pattern="[0-9]+"
            title="Solo números, entre 4 y 20 dígitos"
            inputMode="numeric"
          />
          {errors.referencia && (
            <p className="text-sm text-destructive">{errors.referencia.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="monto">{getTranslation('paymentVerification.amountPaid', isEnglish)}</Label>
          <Input 
            id="monto" 
            {...register("monto")} 
            placeholder={String(montoPagar)}
            type="number"
            step="0.01"
            min="0.01"
            title="Monto fijo según su categoría"
            readOnly
            className="cursor-not-allowed"
          />
          {errors.monto && (
            <p className="text-sm text-destructive">{errors.monto.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cedula_titular">
            {paisConfiguracion === 'usa' 
              ? getTranslation('paymentVerification.idHolder', isEnglish)
              : getTranslation('paymentVerification.cedulaHolder', isEnglish)
            }
          </Label>
          <Input 
            id="cedula_titular" 
            {...register("cedula_titular")} 
            placeholder={paisConfiguracion === 'usa' ? "123-45-6789" : "V-12345678"}
            pattern={paisConfiguracion === 'usa' ? "\\d{3}-?\\d{2}-?\\d{4}" : "[VvEeJjGgPp]-?\\d{7,8}"}
            title={paisConfiguracion === 'usa' ? "Formato: 123-45-6789 o 123456789 (SSN o ID)" : "Formato: V-12345678 o V12345678 (V, E, J, G o P seguido de 7-8 dígitos)"}
          />
          {errors.cedula_titular && (
            <p className="text-sm text-destructive">{errors.cedula_titular.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono_cuenta">
            {paisConfiguracion === 'usa' 
              ? getTranslation('paymentVerification.phoneHolder', isEnglish)
              : getTranslation('paymentVerification.accountPhone', isEnglish)
            }
          </Label>
          <Input 
            id="telefono_cuenta" 
            {...register("telefono_cuenta")} 
            placeholder={paisConfiguracion === 'usa' ? "(555) 123-4567" : "04121234567"}
            pattern={paisConfiguracion === 'usa' ? "\\(\\d{3}\\)\\s?\\d{3}-?\\d{4}|\\d{3}-?\\d{3}-?\\d{4}" : "0\\d{3}-?\\d{7}"}
            title={paisConfiguracion === 'usa' ? "Formato: (555) 123-4567 o 555-123-4567" : "Formato: 04121234567 o 0412-1234567 (11 dígitos comenzando con 0)"}
            inputMode="numeric"
          />
          {errors.telefono_cuenta && (
            <p className="text-sm text-destructive">{errors.telefono_cuenta.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fecha_transferencia">{getTranslation('paymentVerification.transferDate', isEnglish)}</Label>
        <Input 
          id="fecha_transferencia" 
          type="date"
          max={new Date().toISOString().split('T')[0]}
          min={new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()).toISOString().split('T')[0]}
          {...register("fecha_transferencia")}
          title={getTranslation('paymentVerification.dateRange', isEnglish)}
        />
        {errors.fecha_transferencia && (
          <p className="text-sm text-destructive">{errors.fecha_transferencia.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {getTranslation('paymentVerification.dateRange', isEnglish)}
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading || !metodoPago}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {esPagoAdelantado 
          ? getTranslation('paymentVerification.registerAdvancePayment', isEnglish)
          : getTranslation('paymentVerification.sendPaymentVerification', isEnglish)
        }
      </Button>
    </form>
  );
}


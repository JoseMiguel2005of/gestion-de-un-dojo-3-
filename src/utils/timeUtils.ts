import { translateBelt } from '@/hooks/useLanguage';

export interface TimeRemaining {
  totalDays: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
}

export function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const diffMs = target.getTime() - now.getTime();
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  const isPast = diffMs < 0;
  const isToday = totalDays === 0;
  const isTomorrow = totalDays === 1;
  const isThisWeek = totalDays >= 0 && totalDays <= 7;
  const isThisMonth = totalDays >= 0 && totalDays <= 30;
  
  // Calcular meses y días de manera más precisa
  let months = 0;
  let days = 0;
  
  if (totalDays >= 0) {
    // Fecha futura
    const tempDate = new Date(now);
    while (tempDate.getMonth() !== target.getMonth() || tempDate.getFullYear() !== target.getFullYear()) {
      tempDate.setMonth(tempDate.getMonth() + 1);
      if (tempDate <= target) {
        months++;
      } else {
        tempDate.setMonth(tempDate.getMonth() - 1);
        break;
      }
    }
    days = Math.ceil((target.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    // Fecha pasada
    days = Math.abs(totalDays);
  }
  
  const hours = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    totalDays,
    months,
    days,
    hours,
    minutes,
    isPast,
    isToday,
    isTomorrow,
    isThisWeek,
    isThisMonth
  };
}

export function formatTimeRemaining(timeRemaining: TimeRemaining): string {
  const { isPast, isToday, isTomorrow, totalDays, months, days, hours, minutes } = timeRemaining;
  
  if (isPast) {
    return "Examen realizado";
  }
  
  if (isToday) {
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} minutos`;
    }
  }
  
  if (isTomorrow) {
    return "Mañana";
  }
  
  if (totalDays <= 7) {
    return `${totalDays} días`;
  }
  
  if (totalDays <= 30) {
    return `${totalDays} días`;
  }
  
  if (months > 0) {
    if (days > 0) {
      return `${months} mes${months > 1 ? 'es' : ''}, ${days} día${days > 1 ? 's' : ''}`;
    } else {
      return `${months} mes${months > 1 ? 'es' : ''}`;
    }
  }
  
  return `${totalDays} días`;
}

export function getTimeRemainingColor(timeRemaining: TimeRemaining): string {
  const { isPast, isToday, isTomorrow, isThisWeek, totalDays } = timeRemaining;
  
  if (isPast) {
    return "text-gray-500 dark:text-gray-400";
  }
  
  if (isToday) {
    return "text-red-600 dark:text-red-400";
  }
  
  if (isTomorrow) {
    return "text-orange-600 dark:text-orange-400";
  }
  
  if (isThisWeek) {
    return "text-yellow-600 dark:text-yellow-400";
  }
  
  if (totalDays <= 30) {
    return "text-blue-600 dark:text-blue-400";
  }
  
  return "text-green-600 dark:text-green-400";
}

export function getTimeRemainingIcon(timeRemaining: TimeRemaining): string {
  const { isPast, isToday, isTomorrow, isThisWeek } = timeRemaining;
  
  if (isPast) {
    return "✅";
  }
  
  if (isToday) {
    return "🔥";
  }
  
  if (isTomorrow) {
    return "⚡";
  }
  
  if (isThisWeek) {
    return "⏰";
  }
  
  return "📅";
}

export const TIEMPOS_PREPARACION = {
  cintas: {
    'Blanco': 4,
    'Amarillo': 5,
    'Naranja': 6,
    'Verde': 7,
    'Azul': 9,
    'Marrón': 15,
    'Negro': 20,
  },
  
  categorias: {
    'Benjamín': 0.8,
    'Alevín': 0.9,
    'Infantil': 1.0,
    'Cadete': 1.0,
    'Junior': 1.1,
    'Senior': 1.2,
    'Veterano': 1.3,
  }
};

export function calcularTiempoPreparacion(categoria: string, cinta: string): number {
  const tiempoBaseCinta = TIEMPOS_PREPARACION.cintas[cinta as keyof typeof TIEMPOS_PREPARACION.cintas] || 6;
  const multiplicadorCategoria = TIEMPOS_PREPARACION.categorias[categoria as keyof typeof TIEMPOS_PREPARACION.categorias] || 1.0;
  
  const tiempoCalculado = Math.round(tiempoBaseCinta * multiplicadorCategoria);
  
  return Math.max(3, Math.min(24, tiempoCalculado));
}

export interface ExamTimeInfo {
  proximoExamenFecha: string | null;
  tiempoPreparacionMeses: number | null;
  tiempoRestante: TimeRemaining | null;
  mensaje: string;
  color: string;
  icon: string;
  puedePresentar: boolean;
  categoria?: string;
  cinta?: string;
  tiempoRecomendado?: number;
  isEnglish?: boolean;
}

export function calculateExamTimeInfo(alumno: any, isEnglish: boolean = false): ExamTimeInfo {
  const { proximo_examen_fecha, tiempo_preparacion_meses, categoria_edad_nombre, cinta_nombre } = alumno;
  
  const categoria = categoria_edad_nombre || 'Senior';
  const cintaActual = cinta_nombre || 'Blanco';
  
  const tiempoRecomendado = calcularTiempoPreparacion(categoria, cintaActual);
  
  if (!proximo_examen_fecha && tiempo_preparacion_meses) {
    const fechaInscripcion = new Date(alumno.fecha_inscripcion || alumno.created_at || new Date());
    const proximoExamen = new Date(fechaInscripcion);
    proximoExamen.setMonth(proximoExamen.getMonth() + tiempo_preparacion_meses);
    
    const tiempoRestante = calculateTimeRemaining(proximoExamen);
    
    return {
      proximoExamenFecha: proximoExamen.toISOString().split('T')[0],
      tiempoPreparacionMeses: tiempo_preparacion_meses,
      tiempoRestante,
      mensaje: formatExamTimeMessage(tiempoRestante, tiempo_preparacion_meses, categoria, cintaActual, isEnglish),
      color: getTimeRemainingColor(tiempoRestante),
      icon: getTimeRemainingIcon(tiempoRestante),
      puedePresentar: tiempoRestante.isPast || tiempoRestante.isToday,
      categoria,
      cinta: cintaActual,
      tiempoRecomendado,
      isEnglish
    };
  }
  
  if (proximo_examen_fecha) {
    const fechaExamen = new Date(proximo_examen_fecha);
    const tiempoRestante = calculateTimeRemaining(fechaExamen);
    
    return {
      proximoExamenFecha: proximo_examen_fecha,
      tiempoPreparacionMeses: tiempo_preparacion_meses,
      tiempoRestante,
      mensaje: formatExamTimeMessage(tiempoRestante, tiempo_preparacion_meses, categoria, cintaActual, isEnglish),
      color: getTimeRemainingColor(tiempoRestante),
      icon: getTimeRemainingIcon(tiempoRestante),
      puedePresentar: tiempoRestante.isPast || tiempoRestante.isToday,
      categoria,
      cinta: cintaActual,
      tiempoRecomendado,
      isEnglish
    };
  }
  
  const fechaInscripcion = new Date(alumno.fecha_inscripcion || alumno.created_at || new Date());
  const proximoExamen = new Date(fechaInscripcion);
  proximoExamen.setMonth(proximoExamen.getMonth() + tiempoRecomendado);
  
  const tiempoRestante = calculateTimeRemaining(proximoExamen);
  
  return {
    proximoExamenFecha: proximoExamen.toISOString().split('T')[0],
    tiempoPreparacionMeses: tiempoRecomendado,
    tiempoRestante,
    mensaje: formatExamTimeMessage(tiempoRestante, tiempoRecomendado, categoria, cintaActual, isEnglish),
    color: getTimeRemainingColor(tiempoRestante),
    icon: getTimeRemainingIcon(tiempoRestante),
    puedePresentar: tiempoRestante.isPast || tiempoRestante.isToday,
    categoria,
    cinta: cintaActual,
    tiempoRecomendado,
    isEnglish
  };
}

function formatExamTimeMessage(tiempoRestante: TimeRemaining, tiempoPreparacion: number | null, categoria?: string, cinta?: string, isEnglish: boolean = false): string {
  const { isPast, isToday, isTomorrow, totalDays, months, days } = tiempoRestante;
  
  const beltTranslated = cinta ? translateBelt(cinta, isEnglish) : cinta;
  const infoCategoria = categoria && beltTranslated ? ` (${categoria} - ${beltTranslated})` : '';
  
  if (isPast) {
    return isEnglish 
      ? `You can now take your exam${infoCategoria}!` 
      : `¡Ya puedes presentar tu examen${infoCategoria}!`;
  }
  
  if (isToday) {
    return isEnglish 
      ? `Today is your day! You can take your exam${infoCategoria}` 
      : `¡Hoy es tu día! Puedes presentar tu examen${infoCategoria}`;
  }
  
  if (isTomorrow) {
    return isEnglish 
      ? `Tomorrow you can take your exam${infoCategoria}!` 
      : `¡Mañana puedes presentar tu examen${infoCategoria}!`;
  }
  
  if (totalDays <= 7) {
    return isEnglish 
      ? `Your exam${infoCategoria} is very close: ${totalDays} day${totalDays > 1 ? 's' : ''}` 
      : `Tu examen${infoCategoria} está muy cerca: ${totalDays} día${totalDays > 1 ? 's' : ''}`;
  }
  
  if (totalDays <= 30) {
    return isEnglish 
      ? `Your exam${infoCategoria} will be in ${totalDays} day${totalDays > 1 ? 's' : ''}` 
      : `Tu examen${infoCategoria} será en ${totalDays} día${totalDays > 1 ? 's' : ''}`;
  }
  
  if (months > 0) {
    const tiempoTotal = tiempoPreparacion || 6;
    const tiempoTranscurrido = tiempoTotal - months;
    const porcentaje = Math.round((tiempoTranscurrido / tiempoTotal) * 100);
    
    if (days > 0) {
      return isEnglish 
        ? `Your exam${infoCategoria} will be in ${months} month${months > 1 ? 's' : ''} and ${days} day${days > 1 ? 's' : ''} (${porcentaje}% completed)` 
        : `Tu examen${infoCategoria} será en ${months} mes${months > 1 ? 'es' : ''} y ${days} día${days > 1 ? 's' : ''} (${porcentaje}% completado)`;
    } else {
      return isEnglish 
        ? `Your exam${infoCategoria} will be in ${months} month${months > 1 ? 's' : ''} (${porcentaje}% completed)` 
        : `Tu examen${infoCategoria} será en ${months} mes${months > 1 ? 'es' : ''} (${porcentaje}% completado)`;
    }
  }
  
  return isEnglish 
    ? `Your exam${infoCategoria} will be in ${totalDays} days` 
    : `Tu examen${infoCategoria} será en ${totalDays} días`;
}
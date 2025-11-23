import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export interface LanguageConfig {
  isEnglish: boolean;
  currency: string;
}

export function useLanguage() {
  const [languageConfig, setLanguageConfig] = useState<LanguageConfig>({
    isEnglish: false,
    currency: 'BS.'
  });

  useEffect(() => {
    const loadLanguageConfig = async () => {
      try {
        let userLanguage = 'es';
        let currency = 'BS.';
        
        // Verificar si hay token antes de hacer llamadas a la API
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          // 1. Intentar obtener idioma del usuario autenticado
          try {
            const userData = await apiClient.verifyToken();
            userLanguage = userData?.user?.idioma_preferido || 'es';
          } catch (authError) {
            // Si falla la verificación del token, usar español por defecto
            console.warn('No se pudo verificar token, usando español por defecto');
            userLanguage = 'es';
          }
          
          // 2. Obtener configuración de moneda (intenta, pero no falla si no está autenticado)
          try {
            const config = await apiClient.getConfigPagos();
            currency = config.moneda || 'BS.';
          } catch (error) {
            // Si no puede obtener config, usa default
            currency = 'BS.';
          }
        } else {
          // Si no hay token, intentar obtener idioma del sistema (público)
          try {
            const sysLang = await apiClient.getIdiomaSistema();
            userLanguage = sysLang?.idioma_sistema || 'es';
          } catch (sysError) {
            // Si todo falla, usar español por defecto
            userLanguage = 'es';
          }
        }
        
        setLanguageConfig({
          isEnglish: userLanguage === 'en',
          currency: currency
        });
      } catch (error) {
        console.error('Error loading language config:', error);
        // Default to Spanish
        setLanguageConfig({
          isEnglish: false,
          currency: 'BS.'
        });
      }
    };

    loadLanguageConfig();
    
    // Escuchar cambios de idioma
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      // Si el evento trae el nuevo idioma, actualizar inmediatamente
      if (customEvent?.detail?.idioma_preferido) {
        const newLanguage = customEvent.detail.idioma_preferido;
        const newIsEnglish = newLanguage === 'en';
        // Forzar actualización del estado usando la función de actualización
        // que recibe el estado anterior
        setLanguageConfig(prev => {
          console.log('🌐 Idioma cambiado a:', newLanguage, 'isEnglish:', newIsEnglish, 'currency anterior:', prev.currency);
          return {
            isEnglish: newIsEnglish,
            currency: prev.currency // Usar el valor anterior del estado
          };
        });
      }
    };
    
    window.addEventListener('language-change', handleLanguageChange);
    
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
    };
  }, []);

  return languageConfig;
}

// Translations object
export const translations = {
  // Payment form
  paymentVerification: {
    title: {
      es: "Verificación de Pago",
      en: "Payment Verification"
    },
    description: {
      es: "Complete los datos de su transferencia o pago móvil para verificación",
      en: "Complete your transfer or mobile payment details for verification"
    },
    automaticVerification: {
      es: "Verificación Automática",
      en: "Automatic Verification"
    },
    transferSameDay: {
      es: "La transferencia debe realizarse el mismo día de este registro",
      en: "The transfer must be made on the same day as this registration"
    },
    ensureCorrectData: {
      es: "Asegúrate de que todos los datos sean correctos",
      en: "Make sure all data is correct"
    },
    automaticConfirmation: {
      es: "El pago será confirmado automáticamente si cumple los requisitos",
      en: "Payment will be automatically confirmed if it meets the requirements"
    },
    amountToPay: {
      es: "Monto a pagar:",
      en: "Amount to pay:"
    },
    advancePayment: {
      es: "Pago Adelantado:",
      en: "Advance Payment:"
    },
    advancePaymentNote: {
      es: "Este pago se registrará para el próximo mes",
      en: "This payment will be registered for next month"
    },
    paymentMethod: {
      es: "Método de Pago",
      en: "Payment Method"
    },
    selectPaymentMethod: {
      es: "Seleccione método de pago",
      en: "Select payment method"
    },
    bankTransfer: {
      es: "Transferencia Bancaria",
      en: "Bank Transfer"
    },
    mobilePayment: {
      es: "Pago Móvil",
      en: "Mobile Payment"
    },
    zelle: {
      es: "Zelle",
      en: "Zelle"
    },
    paypal: {
      es: "PayPal",
      en: "PayPal"
    },
    bankFrom: {
      es: "Banco desde donde realiza la",
      en: "Bank from which you make the"
    },
    operation: {
      es: "operación",
      en: "operation"
    },
    transfer: {
      es: "transferencia",
      en: "transfer"
    },
    associatedBank: {
      es: "Banco asociado a",
      en: "Bank associated with"
    },
    selectBank: {
      es: "Seleccione su banco",
      en: "Select your bank"
    },
    reference: {
      es: "Referencia del",
      en: "Reference of the"
    },
    mobilePaymentRef: {
      es: "Pago Móvil",
      en: "Mobile Payment"
    },
    zelleRef: {
      es: "Zelle",
      en: "Zelle"
    },
    paypalRef: {
      es: "PayPal",
      en: "PayPal"
    },
    paymentRef: {
      es: "Pago",
      en: "Payment"
    },
    amountPaid: {
      es: "Monto a Pagar",
      en: "Amount to Pay"
    },
    idHolder: {
      es: "ID del Titular",
      en: "ID of the Holder"
    },
    cedulaHolder: {
      es: "Cédula del Titular",
      en: "ID of the Holder"
    },
    phoneHolder: {
      es: "Teléfono del Titular",
      en: "Phone of the Holder"
    },
    accountPhone: {
      es: "Teléfono de la Cuenta",
      en: "Account Phone"
    },
    transferDate: {
      es: "Fecha de la Transferencia",
      en: "Transfer Date"
    },
    dateRange: {
      es: "Fecha entre el mes pasado y hoy",
      en: "Date between last month and today"
    },
    registerAdvancePayment: {
      es: "Registrar Pago Adelantado",
      en: "Register Advance Payment"
    },
    sendPaymentVerification: {
      es: "Enviar Verificación de Pago",
      en: "Send Payment Verification"
    }
  },
  
  // Payment page
  payments: {
    title: {
      es: "Pagos",
      en: "Payments"
    },
    pendingPayment: {
      es: "Pago Pendiente",
      en: "Pending Payment"
    },
    paymentHistory: {
      es: "Historial de Pagos",
      en: "Payment History"
    },
    yourRecentPayments: {
      es: "Tus últimos pagos registrados",
      en: "Your recent registered payments"
    },
    noPaymentsYet: {
      es: "No hay pagos registrados aún",
      en: "No payments registered yet"
    },
    clickForDetails: {
      es: "Clic para ver detalles completos",
      en: "Click to see complete details"
    },
    registerPayment: {
      es: "Registrar Pago",
      en: "Register Payment"
    }
  },

  // Payment details
  paymentDetails: {
    title: {
      es: "Detalles de la Transacción",
      en: "Transaction Details"
    },
    description: {
      es: "Información completa del pago seleccionado",
      en: "Complete information of the selected payment"
    },
    paymentInfo: {
      es: "Información del Pago",
      en: "Payment Information"
    },
    amount: {
      es: "Monto:",
      en: "Amount:"
    },
    method: {
      es: "Método:",
      en: "Method:"
    },
    status: {
      es: "Estado:",
      en: "Status:"
    },
    confirmed: {
      es: "✅ Confirmado",
      en: "✅ Confirmed"
    },
    pending: {
      es: "⏳ Pendiente",
      en: "⏳ Pending"
    },
    datesAndPeriod: {
      es: "Fechas y Período",
      en: "Dates and Period"
    },
    paymentDate: {
      es: "Fecha de Pago:",
      en: "Payment Date:"
    },
    correspondingMonth: {
      es: "Mes Correspondiente:",
      en: "Corresponding Month:"
    },
    registered: {
      es: "Registrado:",
      en: "Registered:"
    },
    bankInfo: {
      es: "Información Bancaria",
      en: "Bank Information"
    },
    reference: {
      es: "Referencia:",
      en: "Reference:"
    },
    originBank: {
      es: "Banco Origen:",
      en: "Origin Bank:"
    },
    holderId: {
      es: "Cédula Titular:",
      en: "Holder ID:"
    },
    accountPhone: {
      es: "Teléfono Cuenta:",
      en: "Account Phone:"
    },
    observations: {
      es: "Observaciones",
      en: "Observations"
    }
  },

  // Students page
  students: {
    title: {
      es: "Alumnos",
      en: "Students"
    },
    description: {
      es: "Gestiona la información de tus alumnos",
      en: "Manage your students' information"
    },
    addStudent: {
      es: "Agregar Alumno",
      en: "Add Student"
    },
    editStudent: {
      es: "Editar Alumno",
      en: "Edit Student"
    },
    studentDetails: {
      es: "Detalle del Alumno",
      en: "Student Details"
    },
    noStudents: {
      es: "No hay alumnos registrados",
      en: "No students registered"
    },
    loading: {
      es: "Cargando alumnos...",
      en: "Loading students..."
    },
    name: {
      es: "Nombre",
      en: "Name"
    },
    age: {
      es: "Edad",
      en: "Age"
    },
    category: {
      es: "Categoría",
      en: "Category"
    },
    belt: {
      es: "Cinta",
      en: "Belt"
    },
    phone: {
      es: "Teléfono",
      en: "Phone"
    },
    email: {
      es: "Email",
      en: "Email"
    },
    actions: {
      es: "Acciones",
      en: "Actions"
    },
    edit: {
      es: "Editar",
      en: "Edit"
    },
    view: {
      es: "Ver",
      en: "View"
    }
  },

  // Evaluations page
  evaluations: {
    title: {
      es: "Evaluaciones",
      en: "Evaluations"
    },
    description: {
      es: "Gestiona las evaluaciones de tus alumnos",
      en: "Manage your students' evaluations"
    },
    addEvaluation: {
      es: "Agregar Evaluación",
      en: "Add Evaluation"
    },
    noEvaluations: {
      es: "No hay evaluaciones registradas",
      en: "No evaluations registered"
    },
    loading: {
      es: "Cargando evaluaciones...",
      en: "Loading evaluations..."
    },
    student: {
      es: "Alumno",
      en: "Student"
    },
    date: {
      es: "Fecha",
      en: "Date"
    },
    time: {
      es: "Hora",
      en: "Time"
    },
    level: {
      es: "Nivel",
      en: "Level"
    },
    result: {
      es: "Resultado",
      en: "Result"
    },
    passed: {
      es: "Aprobado",
      en: "Passed"
    },
    failed: {
      es: "Reprobado",
      en: "Failed"
    },
    pending: {
      es: "Pendiente",
      en: "Pending"
    }
  },

  // Schedules page
  schedules: {
    title: {
      es: "Horarios",
      en: "Schedules"
    },
    description: {
      es: "Gestiona los horarios de clases",
      en: "Manage class schedules"
    },
    addSchedule: {
      es: "Agregar Horario",
      en: "Add Schedule"
    },
    noSchedules: {
      es: "No hay horarios registrados",
      en: "No schedules registered"
    },
    loading: {
      es: "Cargando horarios...",
      en: "Loading schedules..."
    },
    day: {
      es: "Día",
      en: "Day"
    },
    time: {
      es: "Horario",
      en: "Time"
    },
    level: {
      es: "Nivel",
      en: "Level"
    },
    instructor: {
      es: "Instructor",
      en: "Instructor"
    },
    capacity: {
      es: "Capacidad",
      en: "Capacity"
    },
    students: {
      es: "alumnos",
      en: "students"
    }
  },

  // Levels page
  levels: {
    title: {
      es: "Niveles",
      en: "Levels"
    },
    description: {
      es: "Gestiona los niveles y categorías",
      en: "Manage levels and categories"
    },
    addLevel: {
      es: "Agregar Nivel",
      en: "Add Level"
    },
    noLevels: {
      es: "No hay niveles registrados",
      en: "No levels registered"
    },
    loading: {
      es: "Cargando niveles...",
      en: "Loading levels..."
    },
    name: {
      es: "Nombre",
      en: "Name"
    },
    color: {
      es: "Color",
      en: "Color"
    },
    monthlyPrice: {
      es: "Precio Mensual",
      en: "Monthly Price"
    },
    students: {
      es: "Alumnos",
      en: "Students"
    }
  },

  // Representatives page
  representatives: {
    title: {
      es: "Representantes",
      en: "Representatives"
    },
    description: {
      es: "Gestiona la información de los representantes",
      en: "Manage representatives' information"
    },
    addRepresentative: {
      es: "Agregar Representante",
      en: "Add Representative"
    },
    noRepresentatives: {
      es: "No hay representantes registrados",
      en: "No representatives registered"
    },
    loading: {
      es: "Cargando representantes...",
      en: "Loading representatives..."
    },
    name: {
      es: "Nombre",
      en: "Name"
    },
    phone: {
      es: "Teléfono",
      en: "Phone"
    },
    email: {
      es: "Email",
      en: "Email"
    },
    relationship: {
      es: "Parentesco",
      en: "Relationship"
    },
    students: {
      es: "Alumnos",
      en: "Students"
    }
  },

  // Dashboard page
  dashboard: {
    title: {
      es: "Dashboard",
      en: "Dashboard"
    },
    description: {
      es: "Resumen general del dojo",
      en: "Dojo overview"
    },
    totalStudents: {
      es: "Total de Alumnos",
      en: "Total Students"
    },
    activeStudents: {
      es: "Alumnos Activos",
      en: "Active Students"
    },
    pendingPayments: {
      es: "Pagos Pendientes",
      en: "Pending Payments"
    },
    thisMonthEvaluations: {
      es: "Evaluaciones del Mes",
      en: "This Month's Evaluations"
    },
    recentActivity: {
      es: "Actividad Reciente",
      en: "Recent Activity"
    },
    noActivity: {
      es: "No hay actividad reciente",
      en: "No recent activity"
    }
  },

  // Configuration page
  configuration: {
    title: {
      es: "Configuración",
      en: "Configuration"
    },
    description: {
      es: "Configura los parámetros del sistema",
      en: "Configure system parameters"
    },
    generalSettings: {
      es: "Configuración General",
      en: "General Settings"
    },
    dojoName: {
      es: "Nombre del Dojo",
      en: "Dojo Name"
    },
    address: {
      es: "Dirección",
      en: "Address"
    },
    phone: {
      es: "Teléfono",
      en: "Phone"
    },
    email: {
      es: "Email",
      en: "Email"
    },
    save: {
      es: "Guardar",
      en: "Save"
    },
    saved: {
      es: "Configuración guardada",
      en: "Configuration saved"
    }
  },

  // Common terms
  common: {
    loading: {
      es: "Cargando...",
      en: "Loading..."
    },
    save: {
      es: "Guardar",
      en: "Save"
    },
    cancel: {
      es: "Cancelar",
      en: "Cancel"
    },
    edit: {
      es: "Editar",
      en: "Edit"
    },
    delete: {
      es: "Eliminar",
      en: "Delete"
    },
    view: {
      es: "Ver",
      en: "View"
    },
    add: {
      es: "Agregar",
      en: "Add"
    },
    search: {
      es: "Buscar",
      en: "Search"
    },
    filter: {
      es: "Filtrar",
      en: "Filter"
    },
    actions: {
      es: "Acciones",
      en: "Actions"
    },
    yes: {
      es: "Sí",
      en: "Yes"
    },
    no: {
      es: "No",
      en: "No"
    },
    confirm: {
      es: "Confirmar",
      en: "Confirm"
    },
    success: {
      es: "Éxito",
      en: "Success"
    },
    error: {
      es: "Error",
      en: "Error"
    },
    warning: {
      es: "Advertencia",
      en: "Warning"
    },
    info: {
      es: "Información",
      en: "Information"
    }
  },
  
  // Belt colors
  belts: {
    Blanco: {
      es: "Blanco",
      en: "White"
    },
    Amarillo: {
      es: "Amarillo",
      en: "Yellow"
    },
    Naranja: {
      es: "Naranja",
      en: "Orange"
    },
    Verde: {
      es: "Verde",
      en: "Green"
    },
    Azul: {
      es: "Azul",
      en: "Blue"
    },
    Marrón: {
      es: "Marrón",
      en: "Brown"
    },
    Negro: {
      es: "Negro",
      en: "Black"
    }
  },

  // Additional common translations
  commonMessages: {
    couldNotLoad: {
      es: "No se pudieron cargar",
      en: "Could not load"
    },
    couldNotSave: {
      es: "No se pudo guardar",
      en: "Could not save"
    },
    couldNotDelete: {
      es: "No se pudo eliminar",
      en: "Could not delete"
    },
    allCategories: {
      es: "Todas las categorías",
      en: "All categories"
    },
    allLevels: {
      es: "Todos los niveles",
      en: "All levels"
    },
    noTime: {
      es: "Sin hora",
      en: "No time"
    },
    notSpecified: {
      es: "No especificada",
      en: "Not specified"
    },
    noCategory: {
      es: "Sin categoría",
      en: "No category"
    },
    class: {
      es: "clase",
      en: "class"
    },
    classes: {
      es: "clases",
      en: "classes"
    },
    people: {
      es: "personas",
      en: "people"
    },
    equivalent: {
      es: "Equivalente:",
      en: "Equivalent:"
    },
    student: {
      es: "Alumno:",
      en: "Student:"
    },
    category: {
      es: "Categoría:",
      en: "Category:"
    },
    belt: {
      es: "Cinta:",
      en: "Belt:"
    },
    appliedDiscount: {
      es: "Descuento aplicado:",
      en: "Applied discount:"
    },
    nextPayment: {
      es: "Próximo Pago",
      en: "Next Payment"
    },
    dueDate: {
      es: "Fecha límite:",
      en: "Due date:"
    },
    amount: {
      es: "Monto:",
      en: "Amount:"
    },
    firstPaymentBreakdown: {
      es: "Desglose del primer pago:",
      en: "First payment breakdown:"
    },
    monthlyFee: {
      es: "Mensualidad:",
      en: "Monthly fee:"
    },
    registrationFee: {
      es: "Costo de inscripción:",
      en: "Registration fee:"
    },
    total: {
      es: "Total:",
      en: "Total:"
    },
    rememberToPay: {
      es: "Recuerda pagar antes del día 5 de cada mes",
      en: "Remember to pay before the 5th of each month"
    },
    currentMonth: {
      es: "Mes actual:",
      en: "Current month:"
    },
    lastPayment: {
      es: "Último pago:",
      en: "Last payment:"
    },
    paymentStatus: {
      es: "Estado de pago:",
      en: "Payment status:"
    },
    paid: {
      es: "Pagado",
      en: "Paid"
    },
    pending: {
      es: "Pendiente",
      en: "Pending"
    },
    overdue: {
      es: "Vencido",
      en: "Overdue"
    },
    paymentHistory: {
      es: "Historial de Pagos",
      en: "Payment History"
    },
    yourRecentPayments: {
      es: "Tus últimos pagos registrados",
      en: "Your recent registered payments"
    },
    noPaymentsYet: {
      es: "No hay pagos registrados aún",
      en: "No payments registered yet"
    },
    clickForDetails: {
      es: "Clic para ver detalles completos",
      en: "Click to see complete details"
    },
    name: {
      es: "Nombre:",
      en: "Name:"
    },
    date: {
      es: "Fecha:",
      en: "Date:"
    },
    time: {
      es: "Hora:",
      en: "Time:"
    },
    status: {
      es: "Estado:",
      en: "Status:"
    },
    completed: {
      es: "Completado",
      en: "Completed"
    },
    expand: {
      es: "Expandir",
      en: "Expand"
    },
    collapse: {
      es: "Colapsar",
      en: "Collapse"
    },
    evaluationRegistered: {
      es: "evaluación(es) registrada(s)",
      en: "evaluation(s) registered"
    },
    yourFirstExam: {
      es: "Tu Primer Examen",
      en: "Your First Exam"
    },
    timeRemaining: {
      es: "Tiempo restante hasta poder presentar tu primer examen",
      en: "Time remaining until you can take your first exam"
    },
    estimatedDate: {
      es: "Fecha estimada:",
      en: "Estimated date:"
    },
    preparationProgress: {
      es: "Progreso de preparación",
      en: "Preparation progress"
    },
    months: {
      es: "meses",
      en: "months"
    },
    youCanRegister: {
      es: "¡Ya puedes inscribirte en evaluaciones! Revisa las evaluaciones disponibles abajo.",
      en: "You can now register for evaluations! Check the available evaluations below."
    },
    meanwhileReview: {
      es: "Mientras tanto, puedes revisar las evaluaciones disponibles para familiarizarte con el proceso.",
      en: "Meanwhile, you can review available evaluations to familiarize yourself with the process."
    },
    schedule: {
      es: "Horario",
      en: "Schedule"
    },
    capacity: {
      es: "Capacidad",
      en: "Capacity"
    },
    holidays: {
      es: "Días Festivos / No Laborables",
      en: "Holidays / Non-working Days"
    },
    dojoClosed: {
      es: "El dojo permanecerá cerrado en las siguientes fechas",
      en: "The dojo will be closed on the following dates"
    },
    noHolidaysRegistered: {
      es: "No hay días festivos registrados",
      en: "No holidays registered"
    },
    important: {
      es: "Importante:",
      en: "Important:"
    },
    arriveEarly: {
      es: "Llega al menos 10 minutos antes del inicio de la clase.",
      en: "Arrive at least 10 minutes before class starts."
    },
    notifyInstructor: {
      es: "Si no puedes asistir, por favor notifica con anticipación a tu instructor.",
      en: "If you cannot attend, please notify your instructor in advance."
    },
    contactDojo: {
      es: "Para más información, contacta a la administración del dojo.",
      en: "For more information, contact the dojo administration."
    },
    amountPaid: {
      es: "Monto pagado:",
      en: "Amount paid:"
    },
    method: {
      es: "Método:",
      en: "Method:"
    },
    upToDate: {
      es: "Al día",
      en: "Up to date"
    },
    totalPayments: {
      es: "Total pagos:",
      en: "Total payments:"
    },
    registered: {
      es: "registrados",
      en: "registered"
    },
    yourMonthlyFee: {
      es: "Tu Mensualidad",
      en: "Your Monthly Fee"
    },
    amountOfMonthlyFee: {
      es: "Monto de tu mensualidad. Asegúrate de realizar tu pago antes del día 5 de cada mes.",
      en: "Amount of your monthly fee. Make sure to make your payment before the 5th of each month."
    },
    baseMonthlyFee: {
      es: "Monto base de la mensualidad del dojo. Puede variar según categoría y descuentos.",
      en: "Base amount of the dojo monthly fee. May vary according to category and discounts."
    },
    yourExamWillBe: {
      es: "Tu examen",
      en: "Your exam"
    },
    willBeIn: {
      es: "será en",
      en: "will be in"
    },
    completed: {
      es: "completado",
      en: "completed"
    },
    categoryBelt: {
      es: "Categoría:",
      en: "Category:"
    },
    beltColon: {
      es: "Cinta:",
      en: "Belt:"
    }
  }
};

export function getTranslation(key: string, isEnglish: boolean): string {
  const keys = key.split('.');
  let translation: any = translations;
  
  for (const k of keys) {
    translation = translation[k];
    if (!translation) return key;
  }
  
  return translation[isEnglish ? 'en' : 'es'] || key;
}

// Helper function to translate belt colors
export function translateBelt(beltColor: string, isEnglish: boolean): string {
  if (!beltColor) return beltColor;
  
  const beltKey = beltColor as keyof typeof translations.belts;
  const beltTranslation = translations.belts[beltKey];
  
  if (beltTranslation) {
    return beltTranslation[isEnglish ? 'en' : 'es'];
  }
  
  return beltColor; // Return original if no translation found
}

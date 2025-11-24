// Cliente API para reemplazar Supabase
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Interfaz para las respuestas de la API
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Clase para manejar las peticiones HTTP
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  // Método para establecer el token de autenticación
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Método privado para hacer peticiones HTTP
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Siempre leer el token del localStorage antes de cada petición
    // para asegurar que esté actualizado
    const currentToken = localStorage.getItem('auth_token');
    if (currentToken && currentToken !== this.token) {
      this.token = currentToken;
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Agregar headers personalizados
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        headers[key] = String(value);
      });
    }

    // Usar el token del localStorage directamente para asegurar que esté actualizado
    const tokenToUse = currentToken || this.token;
    if (tokenToUse) {
      headers['Authorization'] = `Bearer ${tokenToUse}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ ERROR EN PETICIÓN:', {
          method: options.method || 'GET',
          endpoint: endpoint,
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          message: errorData.message,
          sqlMessage: errorData.sqlMessage,
          sql: errorData.sql,
          details: errorData.details
        });
        console.error('📋 Datos completos del error:', JSON.stringify(errorData, null, 2));
        const error = new Error(errorData.error || errorData.message || errorData.sqlMessage || `HTTP ${response.status}`) as any;
        error.status = response.status;
        error.data = errorData;
        error.response = { status: response.status, data: errorData };
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error(`❌ Error de red en petición ${options.method || 'GET'} ${endpoint}:`, error);
      if (error.message) {
        console.error('Mensaje de error:', error.message);
      }
      if (error.data) {
        console.error('Datos del error:', error.data);
      }
      throw error;
    }
  }

  // Métodos de autenticación
  async login(email: string, password: string, unlockCode?: string) {
    return this.request<{
      token: string;
      user: {
        id: string;
        username: string;
        email: string;
        nombre_completo: string;
        rol: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, unlockCode }),
    });
  }

  async register(email: string, username: string, password: string, nombre_completo: string) {
    return this.request<{
      token?: string;
      user?: {
        id: string;
        username: string;
        email: string;
        nombre_completo: string;
        rol: string;
      };
      message: string;
      email?: string;
      requiresVerification?: boolean;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, nombre_completo }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{
      message: string;
    }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyResetToken(token: string) {
    return this.request<{
      valid: boolean;
      email?: string;
      error?: string;
    }>(`/auth/reset-password/${token}`, {
      method: 'GET',
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<{
      message: string;
    }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async resendUnlockCode(email: string) {
    return this.request<{
      message: string;
    }>('/auth/resend-unlock-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyUnlockCode(email: string, unlockCode: string) {
    return this.request<{
      message: string;
      unlocked: boolean;
    }>('/auth/verify-unlock-code', {
      method: 'POST',
      body: JSON.stringify({ email, unlockCode }),
    });
  }

  async verifyEmail(email: string, code: string) {
    return this.request<{
      message: string;
      verified: boolean;
    }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async resendVerificationCode(email: string) {
    return this.request<{
      message: string;
    }>('/auth/resend-verification-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyToken() {
    return this.request<{
      valid: boolean;
      user: {
        id: string;
        username: string;
        nombre_completo: string;
        rol: string;
        idioma_preferido?: string;
      };
    }>('/auth/verify', {
      method: 'GET',
    });
  }

  // Método genérico para hacer peticiones POST
  async post<T = any>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Método genérico para hacer peticiones GET
  async get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  // Método genérico para hacer peticiones PUT
  async put<T = any>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // Método genérico para hacer peticiones DELETE
  async delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Métodos para alumnos
  async getAlumnos() {
    return this.request<any[]>('/alumnos');
  }

  async getAlumno(id: string) {
    return this.request<any>(`/alumnos/${id}`);
  }

  async createAlumno(alumno: any) {
    return this.request<any>('/alumnos', {
      method: 'POST',
      body: JSON.stringify(alumno),
    });
  }

  async updateAlumno(id: string, alumno: any) {
    return this.request<any>(`/alumnos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(alumno),
    });
  }

  async deleteAlumno(id: string) {
    return this.request<any>(`/alumnos/${id}`, {
      method: 'DELETE',
    });
  }

  async getAlumnosEliminados() {
    return this.request<any[]>('/alumnos/eliminados/listar');
  }

  async restaurarAlumno(id: string) {
    return this.request<any>(`/alumnos/${id}/restaurar`, {
      method: 'PATCH',
    });
  }

  async deleteAlumnoPermanente(id: string) {
    return this.request<any>(`/alumnos/${id}/permanente`, {
      method: 'DELETE',
    });
  }

  // Métodos para niveles
  async getNiveles() {
    return this.request<any[]>('/niveles');
  }

  async getNivel(id: string) {
    return this.request<any>(`/niveles/${id}`);
  }

  async createNivel(nivel: any) {
    return this.request<any>('/niveles', {
      method: 'POST',
      body: JSON.stringify(nivel),
    });
  }

  async updateNivel(id: string, nivel: any) {
    return this.request<any>(`/niveles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(nivel),
    });
  }

  async deleteNivel(id: string) {
    return this.request<any>(`/niveles/${id}`, {
      method: 'DELETE',
    });
  }

  // Métodos para categorías de edad
  async getCategoriasEdad() {
    return this.request<any[]>('/niveles/categorias-edad');
  }

  async getCategoriaEdad(id: string) {
    return this.request<any>(`/niveles/categorias-edad/${id}`);
  }

  async createCategoriaEdad(categoria: any) {
    return this.request<any>('/niveles/categorias-edad', {
      method: 'POST',
      body: JSON.stringify(categoria),
    });
  }

  async updateCategoriaEdad(id: string, categoria: any) {
    return this.request<any>(`/niveles/categorias-edad/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoria),
    });
  }

  async deleteCategoriaEdad(id: string) {
    return this.request<any>(`/niveles/categorias-edad/${id}`, {
      method: 'DELETE',
    });
  }

  // Métodos para cintas
  async getCintas() {
    return this.request<any[]>('/niveles/cintas');
  }

  async getCinta(id: string) {
    return this.request<any>(`/niveles/cintas/${id}`);
  }

  async createCinta(cinta: any) {
    return this.request<any>('/niveles/cintas', {
      method: 'POST',
      body: JSON.stringify(cinta),
    });
  }

  async updateCinta(id: string, cinta: any) {
    return this.request<any>(`/niveles/cintas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cinta),
    });
  }

  async deleteCinta(id: string) {
    return this.request<any>(`/niveles/cintas/${id}`, {
      method: 'DELETE',
    });
  }

  // Métodos para representantes
  async getRepresentantes() {
    return this.request<any[]>('/representantes');
  }

  async getRepresentante(id: string) {
    return this.request<any>(`/representantes/${id}`);
  }

  async createRepresentante(representante: any) {
    return this.request<any>('/representantes', {
      method: 'POST',
      body: JSON.stringify(representante),
    });
  }

  async updateRepresentante(id: string, representante: any) {
    return this.request<any>(`/representantes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(representante),
    });
  }

  async deleteRepresentante(id: string) {
    return this.request<any>(`/representantes/${id}`, {
      method: 'DELETE',
    });
  }

  // Métodos para evaluaciones
  async getEvaluaciones() {
    return this.request<any[]>('/evaluaciones');
  }

  async getEvaluacion(id: string) {
    return this.request<any>(`/evaluaciones/${id}`);
  }

  async createEvaluacion(evaluacion: any) {
    return this.request<any>('/evaluaciones', {
      method: 'POST',
      body: JSON.stringify(evaluacion),
    });
  }

  async updateEvaluacion(id: string, evaluacion: any) {
    return this.request<any>(`/evaluaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(evaluacion),
    });
  }

  async deleteEvaluacion(id: string) {
    return this.request<any>(`/evaluaciones/${id}`, {
      method: 'DELETE',
    });
  }

  async getEvaluacionResultados(id: string) {
    return this.request<any[]>(`/evaluaciones/${id}/resultados`);
  }

  async createEvaluacionResultado(evaluacionId: string, resultado: any) {
    return this.request<any>(`/evaluaciones/${evaluacionId}/resultados`, {
      method: 'POST',
      body: JSON.stringify(resultado),
    });
  }

  async generarResultadosAleatorios() {
    return this.request<any>('/evaluaciones/generar-resultados-aleatorios', {
      method: 'POST',
    });
  }

  // Métodos para configuración
  async getConfiguracion() {
    return this.request<Record<string, string>>('/configuracion');
  }

  async updateConfiguracion(configuraciones: Record<string, string>) {
    return this.request<{ message: string }>('/configuracion', {
      method: 'PUT',
      body: JSON.stringify({ configuraciones }),
    });
  }

  async resetConfiguracion() {
    return this.request<{ message: string }>('/configuracion/reset', {
      method: 'POST',
    });
  }

  // Métodos para usuarios
  async getUsuarios() {
    return this.request<any[]>('/usuarios');
  }

  async getInstructores() {
    return this.request<any[]>('/usuarios/instructores');
  }

  async createUsuario(usuario: any) {
    return this.request<any>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(usuario),
    });
  }

  async updateUsuario(id: string, usuario: any) {
    return this.request<any>(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(usuario),
    });
  }

  async cambiarPassword(password_actual: string, password_nueva: string) {
    return this.request<any>('/usuarios/cambiar-password', {
      method: 'PUT',
      body: JSON.stringify({ password_actual, password_nueva }),
    });
  }

  async cambiarIdioma(idioma_preferido: string) {
    return this.request<any>('/usuarios/cambiar-idioma', {
      method: 'PUT',
      body: JSON.stringify({ idioma_preferido }),
    });
  }

  async cambiarIdiomaGlobal(idioma_preferido: string) {
    return this.request<any>('/usuarios/cambiar-idioma-global', {
      method: 'PUT',
      body: JSON.stringify({ idioma_preferido }),
    });
  }

  async getIdiomaSistema() {
    return this.request<{ idioma_sistema: string }>('/usuarios/idioma-sistema', {
      method: 'GET',
    });
  }

  async getRoles() {
    return this.request<any[]>('/usuarios/roles');
  }

  async getLogs(limit?: number) {
    return this.request<any[]>(`/usuarios/logs${limit ? `?limit=${limit}` : ''}`);
  }

  async limpiarLogs(days: number = 90) {
    return this.request<any>(`/usuarios/logs/cleanup?days=${days}`, {
      method: 'DELETE',
    });
  }

  // Métodos para pagos
  async getConfigPagos() {
    return this.request<any>('/pagos/config');
  }

  async updateConfigPagos(config: any) {
    return this.request<any>('/pagos/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getPagos(params?: { mes?: number; anio?: number; limit?: number }) {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request<any[]>(`/pagos${queryString}`);
  }

  async getPagosAlumno(idAlumno: string) {
    return this.request<any[]>(`/pagos/alumno/${idAlumno}`);
  }

  async createPago(pago: any) {
    return this.request<any>('/pagos', {
      method: 'POST',
      body: JSON.stringify(pago),
    });
  }

  async getPagosPendientes() {
    return this.request<any[]>('/pagos/pendientes');
  }

  // Nuevos métodos para sistema de precios dinámicos
  async getPrecioAlumno(idAlumno: string, esPagoAdelantado?: boolean) {
    const queryParam = esPagoAdelantado ? '?esPagoAdelantado=true' : '';
    return this.request<any>(`/pagos/precio/${idAlumno}${queryParam}`);
  }

  async getTodosLosPrecios() {
    return this.request<any[]>('/pagos/precios');
  }

  async updatePrecioPersonalizado(idAlumno: string, data: {
    precio_personalizado?: number | null;
    descuento_porcentaje?: number;
    observaciones_pago?: string;
  }) {
    return this.request<any>(`/pagos/precio-personalizado/${idAlumno}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Métodos para horarios
  async getHorarios() {
    return this.request<any[]>('/horarios');
  }

  async createHorario(horario: any) {
    return this.request<any>('/horarios', {
      method: 'POST',
      body: JSON.stringify(horario),
    });
  }

  async updateHorario(id: string, horario: any) {
    return this.request<any>(`/horarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(horario),
    });
  }

  async deleteHorario(id: string) {
    return this.request<any>(`/horarios/${id}`, {
      method: 'DELETE',
    });
  }

  async getDiasFestivos() {
    return this.request<any[]>('/horarios/festivos');
  }

  async createDiaFestivo(festivo: any) {
    return this.request<any>('/horarios/festivos', {
      method: 'POST',
      body: JSON.stringify(festivo),
    });
  }

  async updateDiaFestivo(id: string, festivo: any) {
    return this.request<any>(`/horarios/festivos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(festivo),
    });
  }

  async deleteDiaFestivo(id: string) {
    return this.request<any>(`/horarios/festivos/${id}`, {
      method: 'DELETE',
    });
  }

  // Métodos para senseis
  async getSenseisDisponibles() {
    return this.request<any[]>('/alumnos/senseis/disponibles');
  }

  async updateSenseiAlumno(alumnoId: string, senseiId: number) {
    return this.request<any>(`/alumnos/${alumnoId}/sensei`, {
      method: 'PUT',
      body: JSON.stringify({ sensei_id: senseiId }),
    });
  }



  // Métodos para backup
  async exportarJSON() {
    const url = `${this.baseURL}/backup/export/json`;
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `backup_dojo_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async exportarSQL() {
    const url = `${this.baseURL}/backup/export/sql`;
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `backup_dojo_${Date.now()}.sql`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async importarJSON(archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    return this.request<any>('/backup/import/json', {
      method: 'POST',
      body: formData,
    });
  }

  async getStats() {
    return this.request<any>('/backup/stats');
  }


  async verificarIntegridad() {
    return this.request<any>('/backup/verificar-integridad');
  }

  async registrarBackup() {
    return this.request<any>('/backup/registrar-backup', {
      method: 'POST',
    });
  }

  // Método para generar datos de demostración
  async generateDemoData() {
    return this.request<any>('/demo/generate', {
      method: 'POST',
    });
  }

  // Método para eliminar datos de demostración
  async deleteDemoData() {
    return this.request<any>('/demo/delete', {
      method: 'DELETE',
    });
  }


  // Método para hacer logout
  logout() {
    this.setToken(null);
  }
}

// Crear instancia única del cliente API
export const apiClient = new ApiClient(API_BASE_URL);

// Exportar también como 'api' para mantener compatibilidad
export const api = apiClient;

// Función helper para manejar errores de API
export const handleApiError = (error: any) => {
  console.error('Error de API:', error);
  return error.message || 'Error desconocido';
};

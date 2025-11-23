import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Aplicar autenticación a todas las rutas (excepto GET público)
// router.use(authenticateToken);

// Obtener todas las configuraciones (público para que el frontend pueda cargar temas)
router.get('/', async (req, res) => {
  try {
    const { data: configuraciones, error } = await supabase
      .from('configuracion')
      .select('*')
      .order('clave', { ascending: true });
    
    if (error) {
      console.error('Error obteniendo configuraciones:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
    
    // Convertir array a objeto clave-valor para facilitar el uso
    const config = {};
    if (configuraciones) {
      configuraciones.forEach(item => {
        config[item.clave] = item.valor;
      });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener una configuración específica
router.get('/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    
    const { data: configs, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('clave', clave)
      .limit(1);

    if (error) {
      console.error('Error obteniendo configuración:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    if (!configs || configs.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json(configs[0]);
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Actualizar o crear configuración (requiere autenticación)
router.put('/', authenticateToken, [
  body('configuraciones').isObject().withMessage('Se requiere un objeto de configuraciones')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { configuraciones } = req.body;
    
    // Actualizar cada configuración
    for (const [clave, valor] of Object.entries(configuraciones)) {
      // Verificar si existe
      const { data: existing } = await supabase
        .from('configuracion')
        .select('id')
        .eq('clave', clave)
        .limit(1);

      if (existing && existing.length > 0) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('configuracion')
          .update({ valor, updated_at: new Date().toISOString() })
          .eq('clave', clave);
        
        if (updateError) {
          console.error(`Error actualizando configuración ${clave}:`, updateError);
        }
      } else {
        // Insertar nueva
        const { error: insertError } = await supabase
          .from('configuracion')
          .insert({ clave, valor, tipo: 'texto' });
        
        if (insertError) {
          console.error(`Error insertando configuración ${clave}:`, insertError);
        }
      }
    }

    res.json({ 
      message: 'Configuraciones actualizadas exitosamente',
      actualizadas: Object.keys(configuraciones).length
    });
  } catch (error) {
    console.error('Error actualizando configuraciones:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Actualizar una configuración específica
router.put('/:clave', authenticateToken, [
  body('valor').notEmpty().withMessage('El valor es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clave } = req.params;
    const { valor } = req.body;

    // Verificar si existe
    const { data: existing } = await supabase
      .from('configuracion')
      .select('id')
      .eq('clave', clave)
      .limit(1);

    if (existing && existing.length > 0) {
      // Actualizar
      const { error: updateError } = await supabase
        .from('configuracion')
        .update({ valor, updated_at: new Date().toISOString() })
        .eq('clave', clave);
      
      if (updateError) {
        console.error('Error actualizando configuración:', updateError);
        return res.status(500).json({ error: 'Error interno del servidor', details: updateError.message });
      }
    } else {
      // Insertar nueva
      const { error: insertError } = await supabase
        .from('configuracion')
        .insert({ clave, valor, tipo: 'texto' });
      
      if (insertError) {
        console.error('Error insertando configuración:', insertError);
        return res.status(500).json({ error: 'Error interno del servidor', details: insertError.message });
      }
    }

    res.json({ 
      message: 'Configuración actualizada exitosamente',
      clave,
      valor
    });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Restaurar configuraciones por defecto
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    // Valores por defecto
    const defaults = {
      'dojo_nombre': 'Mi Dojo de Judo',
      'dojo_lema': 'Excelencia en el arte marcial',
      'dojo_direccion': '',
      'dojo_telefono': '',
      'dojo_email': '',
      'dojo_facebook': '',
      'dojo_instagram': '',
      'dojo_twitter': '',
      'dojo_horarios': '',
      'dojo_logo_url': '',
      'dojo_fondo_url': '',
      'tema_color_primario': '#0ea5e9',
      'tema_modo': 'light',
      'tema_sidebar': 'current'
    };

    for (const [clave, valor] of Object.entries(defaults)) {
      const { error } = await supabase
        .from('configuracion')
        .update({ valor, updated_at: new Date().toISOString() })
        .eq('clave', clave);
      
      if (error) {
        console.error(`Error restaurando configuración ${clave}:`, error);
      }
    }

    res.json({ message: 'Configuraciones restauradas a valores por defecto' });
  } catch (error) {
    console.error('Error restaurando configuraciones:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

export default router;


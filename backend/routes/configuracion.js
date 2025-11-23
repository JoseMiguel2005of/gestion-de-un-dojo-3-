import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Aplicar autenticación a todas las rutas (excepto GET público)
// router.use(authenticateToken);

// Obtener todas las configuraciones (público para que el frontend pueda cargar temas)
router.get('/', async (req, res) => {
  try {
    const configuraciones = await executeQuery('SELECT * FROM configuracion ORDER BY clave');
    
    // Convertir array a objeto clave-valor para facilitar el uso
    const config = {};
    configuraciones.forEach(item => {
      config[item.clave] = item.valor;
    });
    
    res.json(config);
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener una configuración específica
router.get('/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    
    const configs = await executeQuery(
      'SELECT * FROM configuracion WHERE clave = ?',
      [clave]
    );

    if (configs.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json(configs[0]);
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
      const existing = await executeQuery(
        'SELECT id FROM configuracion WHERE clave = ?',
        [clave]
      );

      if (existing.length > 0) {
        // Actualizar
        await executeQuery(
          'UPDATE configuracion SET valor = ? WHERE clave = ?',
          [valor, clave]
        );
      } else {
        // Insertar nueva
        await executeQuery(
          'INSERT INTO configuracion (clave, valor) VALUES (?, ?)',
          [clave, valor]
        );
      }
    }

    res.json({ 
      message: 'Configuraciones actualizadas exitosamente',
      actualizadas: Object.keys(configuraciones).length
    });
  } catch (error) {
    console.error('Error actualizando configuraciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    const existing = await executeQuery(
      'SELECT id FROM configuracion WHERE clave = ?',
      [clave]
    );

    if (existing.length > 0) {
      // Actualizar
      await executeQuery(
        'UPDATE configuracion SET valor = ? WHERE clave = ?',
        [valor, clave]
      );
    } else {
      // Insertar nueva
      await executeQuery(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?)',
        [clave, valor]
      );
    }

    res.json({ 
      message: 'Configuración actualizada exitosamente',
      clave,
      valor
    });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
      await executeQuery(
        'UPDATE configuracion SET valor = ? WHERE clave = ?',
        [valor, clave]
      );
    }

    res.json({ message: 'Configuraciones restauradas a valores por defecto' });
  } catch (error) {
    console.error('Error restaurando configuraciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;


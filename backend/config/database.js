import supabase from '../utils/supabaseClient.js';

// Función para probar la conexión
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('usuario').select('id').limit(1);
    if (error) {
      console.error('❌ Error conectando a Supabase:', error.message);
      return false;
    }
    console.log('✅ Conexión a Supabase establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error.message);
    return false;
  }
};

// Función para ejecutar consultas (compatibilidad con código existente)
// Convierte consultas SQL a Supabase
export const executeQuery = async (query, params = []) => {
  try {
    const queryUpper = query.trim().toUpperCase();
    
    // SELECT queries
    if (queryUpper.startsWith('SELECT')) {
      // Extraer tabla y condiciones básicas
      const match = query.match(/FROM\s+(\w+)/i);
      if (!match) {
        throw new Error('No se pudo extraer la tabla de la consulta SELECT');
      }
      
      const table = match[1];
      let supabaseQuery = supabase.from(table).select('*');
      
      // Manejar WHERE básico
      if (query.includes('WHERE')) {
        const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && params.length > 0) {
          supabaseQuery = supabaseQuery.eq(whereMatch[1], params[0]);
        }
      }
      
      // Manejar ORDER BY
      if (query.includes('ORDER BY')) {
        const orderMatch = query.match(/ORDER BY\s+(\w+)/i);
        if (orderMatch) {
          const orderField = orderMatch[1];
          const isDesc = query.includes('DESC');
          supabaseQuery = supabaseQuery.order(orderField, { ascending: !isDesc });
        }
      }
      
      const { data, error } = await supabaseQuery;
      if (error) throw error;
      return data || [];
    }
    
    // INSERT queries
    if (queryUpper.startsWith('INSERT')) {
      const match = query.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (!match) {
        throw new Error('Formato de INSERT no soportado');
      }
      
      const table = match[1];
      const columns = match[2].split(',').map(c => c.trim());
      const values = match[3].split(',').map((v, i) => {
        if (v.trim() === '?') {
          return params[i];
        }
        return v.trim().replace(/['"]/g, '');
      });
      
      const record = {};
      columns.forEach((col, i) => {
        record[col] = values[i];
      });
      
      const { data, error } = await supabase.from(table).insert(record).select();
      if (error) throw error;
      return data;
    }
    
    // UPDATE queries
    if (queryUpper.startsWith('UPDATE')) {
      const match = query.match(/UPDATE\s+(\w+)\s+SET\s+(\w+)\s*=\s*\?\s+WHERE\s+(\w+)\s*=\s*\?/i);
      if (!match) {
        throw new Error('Formato de UPDATE no soportado');
      }
      
      const table = match[1];
      const setField = match[2];
      const whereField = match[3];
      
      const { data, error } = await supabase
        .from(table)
        .update({ [setField]: params[0] })
        .eq(whereField, params[1])
        .select();
      
      if (error) throw error;
      return data;
    }
    
    // DELETE queries
    if (queryUpper.startsWith('DELETE')) {
      const match = query.match(/DELETE FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
      if (!match) {
        throw new Error('Formato de DELETE no soportado');
      }
      
      const table = match[1];
      const whereField = match[2];
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(whereField, params[0]);
      
      if (error) throw error;
      return { affectedRows: 1 };
    }
    
    throw new Error('Tipo de consulta no soportado: ' + query);
  } catch (error) {
    console.error('Error ejecutando consulta:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
};

export default supabase;

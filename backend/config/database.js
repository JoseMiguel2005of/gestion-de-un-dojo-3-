import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dojo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para probar la conexión
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    return false;
  }
};

// Función para ejecutar consultas
export const executeQuery = async (query, params = []) => {
  try {
    const [rows, fields] = await pool.execute(query, params);
    // Para INSERT, UPDATE, DELETE, MySQL2 devuelve un ResultSetHeader
    // Para SELECT, devuelve un array de filas
    if (query.trim().toUpperCase().startsWith('INSERT')) {
      // rows es un ResultSetHeader para INSERT
      return rows;
    }
    return rows;
  } catch (error) {
    console.error('Error ejecutando consulta:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
};

export default pool;

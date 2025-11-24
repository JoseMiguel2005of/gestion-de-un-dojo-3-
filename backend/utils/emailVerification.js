import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const resolveMx = promisify(dns.resolveMx);

/**
 * Verifica si un dominio tiene registros MX válidos
 */
const verifyDomainMx = async (domain) => {
  try {
    const mxRecords = await resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    console.error(`Error verificando MX para ${domain}:`, error.message);
    return false;
  }
};

/**
 * Verifica si un email existe mediante verificación SMTP
 * Esta función intenta conectarse al servidor SMTP y verificar el buzón
 */
export const verifyEmailExists = async (email) => {
  const [localPart, domain] = email.split('@');
  
  if (!localPart || !domain) {
    return { valid: false, reason: 'Formato de email inválido' };
  }

  // 1. Verificar que el dominio tenga registros MX
  console.log(`🔍 Verificando dominio MX para: ${domain}`);
  const hasMx = await verifyDomainMx(domain);
  
  if (!hasMx) {
    console.log(`❌ Dominio ${domain} no tiene registros MX válidos`);
    return { valid: false, reason: 'El dominio del email no tiene servidores de correo configurados' };
  }

  // 2. Obtener registros MX
  let mxRecords;
  try {
    mxRecords = await resolveMx(domain);
    mxRecords.sort((a, b) => a.priority - b.priority); // Ordenar por prioridad
  } catch (error) {
    console.error(`Error obteniendo registros MX:`, error);
    return { valid: false, reason: 'No se pudo verificar el dominio del email' };
  }

  // 3. Intentar verificación SMTP (sin enviar correo)
  // Nota: Muchos servidores modernos bloquean esta verificación por seguridad
  // Por eso esta es una verificación "suave" - si falla, no rechazamos el email
  // Solo la usamos como indicador adicional
  
  for (const mx of mxRecords.slice(0, 2)) { // Intentar con los 2 primeros servidores
    try {
      const smtpCheck = await checkSmtpMailbox(mx.exchange, email);
      if (smtpCheck.valid) {
        console.log(`✅ Email verificado exitosamente: ${email}`);
        return { valid: true, method: 'smtp' };
      }
    } catch (error) {
      console.log(`⚠️ Verificación SMTP falló para ${mx.exchange}:`, error.message);
      // Continuar con el siguiente servidor
    }
  }

  // Si la verificación SMTP falla (común en Gmail, Outlook, etc.),
  // asumimos que el email es válido si el dominio tiene MX válidos
  // La verificación real será cuando el usuario ingrese el código
  console.log(`⚠️ Verificación SMTP no disponible, pero dominio tiene MX válidos`);
  return { valid: true, method: 'mx_only', warning: 'No se pudo verificar el buzón directamente, pero el dominio es válido' };
};

/**
 * Verifica un buzón de correo mediante SMTP (sin enviar correo)
 */
const checkSmtpMailbox = (smtpServer, email) => {
  return new Promise((resolve, reject) => {
    const timeout = 5000; // 5 segundos de timeout
    const socket = net.createConnection(25, smtpServer);
    let response = '';

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Timeout en conexión SMTP'));
    }, timeout);

    socket.on('connect', () => {
      socket.on('data', (data) => {
        response += data.toString();
        
        if (response.includes('220')) {
          // Servidor listo, enviar HELO
          socket.write(`HELO ${smtpServer}\r\n`);
        } else if (response.includes('250') && !response.includes('MAIL FROM')) {
          // Respuesta a HELO, enviar MAIL FROM
          socket.write(`MAIL FROM: <verification@${smtpServer}>\r\n`);
        } else if (response.includes('250') && response.includes('MAIL FROM')) {
          // Respuesta a MAIL FROM, enviar RCPT TO
          socket.write(`RCPT TO: <${email}>\r\n`);
        } else if (response.includes('250') && response.includes('RCPT TO')) {
          // Email válido
          clearTimeout(timer);
          socket.write('QUIT\r\n');
          socket.end();
          resolve({ valid: true });
        } else if (response.includes('550') || response.includes('551') || response.includes('553')) {
          // Email no válido
          clearTimeout(timer);
          socket.write('QUIT\r\n');
          socket.end();
          resolve({ valid: false, reason: 'Buzón no existe' });
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      socket.on('close', () => {
        clearTimeout(timer);
        if (!response.includes('250') && response.includes('RCPT TO')) {
          resolve({ valid: false, reason: 'No se pudo verificar el buzón' });
        }
      });
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

/**
 * Verificación simple de formato y dominio común
 * Rechaza emails de dominios temporales conocidos
 */
export const verifyEmailFormat = (email) => {
  const [localPart, domain] = email.split('@');
  
  if (!localPart || !domain) {
    return { valid: false, reason: 'Formato inválido' };
  }

  // Lista de dominios temporales conocidos (puedes expandir esta lista)
  const temporaryDomains = [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'tempmail.com',
    'throwaway.email',
    'yopmail.com',
    'temp-mail.org',
    'mohmal.com',
    'fakeinbox.com',
    'trashmail.com'
  ];

  const domainLower = domain.toLowerCase();
  
  if (temporaryDomains.some(temp => domainLower.includes(temp))) {
    return { valid: false, reason: 'No se permiten emails temporales' };
  }

  return { valid: true };
};


import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Obtener credenciales de variables de entorno
const emailUser = process.env.EMAIL_USER || 'gestiondojo86@gmail.com';
const emailPass = process.env.EMAIL_PASS || 'GestionDojo12';

console.log('📧 Configurando servicio de correo...');
console.log('   Usuario:', emailUser);
console.log('   Contraseña configurada:', emailPass ? '✅ Sí' : '❌ No');

// Configuración del transporte de correo (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

/**
 * Envía un correo de recuperación de contraseña
 * @param {string} to - Dirección de correo del destinatario
 * @param {string} resetToken - Token de recuperación
 * @param {string} resetUrl - URL para restablecer la contraseña
 */
export const sendPasswordResetEmail = async (to, resetToken, resetUrl) => {
  try {
    console.log(`📨 Intentando enviar correo de recuperación a: ${to}`);
    
    const mailOptions = {
      from: `"Dojo de Judo" <${emailUser}>`,
      to: to,
      subject: 'Restablecer tu contraseña',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              border: 1px solid #ddd;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .emoji {
              font-size: 48px;
              margin-bottom: 10px;
            }
            h1 {
              color: #d32f2f;
              margin: 0;
            }
            .content {
              background-color: #ffffff;
              padding: 20px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #d32f2f;
              color: #ffffff;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .button:hover {
              background-color: #b71c1c;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🥋</div>
              <h1>Restablecer tu contraseña</h1>
            </div>
            <div class="content">
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Restablecer contraseña</a>
              </p>
              
              <p><strong>Este enlace expira en 15 minutos.</strong></p>
              
              <div class="warning">
                <p><strong>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo sin problema.</strong></p>
                <p>Es posible que alguien más haya escrito tu dirección de correo por error.</p>
              </div>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas.</p>
              <p>&copy; ${new Date().getFullYear()} Dojo de Judo</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Restablecer tu contraseña
        
        Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        
        Restablecer contraseña: ${resetUrl}
        
        Este enlace expira en 15 minutos.
        
        Si no solicitaste restablecer tu contraseña, puedes ignorar este correo sin problema. Es posible que alguien más haya escrito tu dirección de correo por error.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de recuperación enviado exitosamente');
    console.log('   MessageId:', info.messageId);
    console.log('   Destinatario:', to);
    return info;
  } catch (error) {
    console.error('❌ ERROR al enviar correo de recuperación:');
    console.error('   Destinatario:', to);
    console.error('   Error:', error.message);
    
    // Mensajes de error más específicos
    if (error.code === 'EAUTH') {
      console.error('   ⚠️ Error de autenticación. Verifica:');
      console.error('      1. Si tienes 2FA activado, usa una "Contraseña de aplicación"');
      console.error('      2. Ve a: https://myaccount.google.com/apppasswords');
      console.error('      3. Genera una contraseña de aplicación y úsala en EMAIL_PASS');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('   ⚠️ Error de conexión. Verifica tu conexión a internet');
    } else {
      console.error('   ⚠️ Detalles completos:', error);
    }
    
    throw error;
  }
};

/**
 * Verifica la configuración del transporte de correo
 */
export const verifyEmailConfig = async () => {
  try {
    console.log('🔍 Verificando configuración de correo...');
    await transporter.verify();
    console.log('✅ Configuración de correo verificada correctamente');
    return true;
  } catch (error) {
    console.error('❌ ERROR en verificación de configuración de correo:');
    console.error('   Error:', error.message);
    console.error('   Código:', error.code);
    
    if (error.code === 'EAUTH') {
      console.error('\n⚠️ SOLUCIÓN:');
      console.error('   Si tu cuenta de Gmail tiene autenticación de dos factores (2FA):');
      console.error('   1. Ve a: https://myaccount.google.com/apppasswords');
      console.error('   2. Genera una nueva "Contraseña de aplicación"');
      console.error('   3. Usa esa contraseña en EMAIL_PASS en tu archivo .env');
      console.error('   4. Reinicia el servidor backend');
    } else if (error.code === 'EENVELOPE') {
      console.error('\n⚠️ Verifica que EMAIL_USER esté correctamente configurado');
    }
    
    return false;
  }
};

/**
 * Envía un correo con código de desbloqueo de cuenta
 * @param {string} to - Dirección de correo del destinatario
 * @param {string} unlockCode - Código de 6 dígitos para desbloquear
 * @param {string} username - Nombre de usuario
 */
export const sendUnlockCodeEmail = async (to, unlockCode, username) => {
  try {
    console.log(`📨 Intentando enviar código de desbloqueo a: ${to}`);
    
    const mailOptions = {
      from: `"Dojo de Judo" <${emailUser}>`,
      to: to,
      subject: 'Código de desbloqueo de cuenta',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              border: 1px solid #ddd;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .emoji {
              font-size: 48px;
              margin-bottom: 10px;
            }
            h1 {
              color: #d32f2f;
              margin: 0;
            }
            .content {
              background-color: #ffffff;
              padding: 20px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .code-box {
              background-color: #f5f5f5;
              border: 2px solid #d32f2f;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              color: #d32f2f;
              font-family: 'Courier New', monospace;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🔒</div>
              <h1>Tu cuenta ha sido bloqueada</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${username}</strong>,</p>
              
              <p>Tu cuenta ha sido bloqueada temporalmente debido a múltiples intentos fallidos de inicio de sesión.</p>
              
              <p>Usa el siguiente código para desbloquear tu cuenta:</p>
              
              <div class="code-box">
                ${unlockCode}
              </div>
              
              <p><strong>Este código expira en 30 minutos.</strong></p>
              
              <div class="warning">
                <p><strong>Importante:</strong> Si no solicitaste este código, es posible que alguien esté intentando acceder a tu cuenta. Por favor, contacta al administrador.</p>
              </div>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas.</p>
              <p>&copy; ${new Date().getFullYear()} Dojo de Judo</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Tu cuenta ha sido bloqueada
        
        Hola ${username},
        
        Tu cuenta ha sido bloqueada temporalmente debido a múltiples intentos fallidos de inicio de sesión.
        
        Usa el siguiente código para desbloquear tu cuenta:
        
        ${unlockCode}
        
        Este código expira en 30 minutos.
        
        Si no solicitaste este código, es posible que alguien esté intentando acceder a tu cuenta.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Código de desbloqueo enviado exitosamente');
    console.log('   MessageId:', info.messageId);
    console.log('   Destinatario:', to);
    return info;
  } catch (error) {
    console.error('❌ ERROR al enviar código de desbloqueo:');
    console.error('   Destinatario:', to);
    console.error('   Error:', error.message);
    throw error;
  }
};


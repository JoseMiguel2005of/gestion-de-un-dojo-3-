import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Obtener credenciales de variables de entorno
const emailUser = process.env.EMAIL_USER || 'gestiondojo86@gmail.com';
const emailPass = process.env.EMAIL_PASS || 'GestionDojo12';

console.log('📧 Configurando servicio de correo...');
console.log('   EMAIL_USER desde env:', process.env.EMAIL_USER ? '✅ Configurado' : '❌ No configurado');
console.log('   EMAIL_PASS desde env:', process.env.EMAIL_PASS ? '✅ Configurado' : '❌ No configurado');
console.log('   Usuario final:', emailUser);
console.log('   Contraseña final configurada:', emailPass ? '✅ Sí (longitud: ' + emailPass.length + ')' : '❌ No');

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
/**
 * Envía un correo con código de verificación de email
 * @param {string} to - Dirección de correo del destinatario
 * @param {string} verificationCode - Código de verificación de 6 dígitos
 * @param {string} username - Nombre de usuario
 */
export const sendEmailVerificationCode = async (to, verificationCode, username) => {
  try {
    console.log(`📨 Intentando enviar código de verificación a: ${to}`);
    
    const mailOptions = {
      from: `"Dojo de Judo" <${emailUser}>`,
      to: to,
      subject: 'Verifica tu correo electrónico - Dojo de Judo',
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
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .code-box {
              background-color: #fff;
              border: 2px solid #d97706;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
              font-size: 32px;
              font-weight: bold;
              color: #d97706;
              letter-spacing: 8px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #d97706;">Dojo de Judo</h1>
              <h2>Verificación de Correo Electrónico</h2>
            </div>
            
            <p>Hola <strong>${username}</strong>,</p>
            
            <p>Gracias por registrarte en nuestro sistema de gestión. Para completar tu registro, por favor verifica tu correo electrónico usando el siguiente código:</p>
            
            <div class="code-box">
              ${verificationCode}
            </div>
            
            <p>Este código es válido por <strong>30 minutos</strong>.</p>
            
            <p>Si no solicitaste este código, puedes ignorar este correo.</p>
            
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas.</p>
              <p>&copy; ${new Date().getFullYear()} Dojo de Judo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Código de verificación enviado exitosamente a: ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ ERROR enviando código de verificación:');
    console.error('   Email destino:', to);
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
};

export const sendUnlockCodeEmail = async (to, unlockCode, username) => {
  if (!emailUser || !emailPass) {
    console.error('❌ No se puede enviar código de desbloqueo: EMAIL_USER o EMAIL_PASS no configurados.');
    throw new Error('Configuración de correo incompleta.');
  }
  try {
    console.log(`📨 Intentando enviar código de desbloqueo a: ${to}`);
    console.log(`   Usuario de correo: ${emailUser}`);
    console.log(`   Contraseña configurada: Sí (longitud: ${emailPass.length})`);
    
    // Verificar que el transporte esté configurado
    if (!transporter) {
      throw new Error('Transporte de correo no configurado');
    }
    
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
    console.log('   Código:', unlockCode);
    return info;
  } catch (error) {
    console.error('❌ ERROR al enviar código de desbloqueo:');
    console.error('   Destinatario:', to);
    console.error('   Mensaje:', error.message);
    console.error('   Código:', error.code);
    if (error.response) {
      console.error('   Respuesta del servidor:', error.response);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    
    // Si es un error de autenticación de Gmail, dar un mensaje más claro
    if (error.code === 'EAUTH' || error.message.includes('Invalid login') || error.message.includes('authentication')) {
      console.error('   ⚠️ ERROR DE AUTENTICACIÓN:');
      console.error('      - Verifica que EMAIL_USER y EMAIL_PASS estén configurados en Vercel');
      console.error('      - Para Gmail, debes usar una "Contraseña de aplicación" (no tu contraseña normal)');
      console.error('      - Genera una en: https://myaccount.google.com/apppasswords');
      throw new Error('Error de autenticación con Gmail. Verifica que EMAIL_USER y EMAIL_PASS estén correctamente configurados en Vercel. Para Gmail, necesitas usar una "Contraseña de aplicación" en lugar de tu contraseña normal.');
    }
    
    throw error;
  }
};


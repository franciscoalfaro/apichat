import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';  // Usar promises para lectura asincrónica

// Función para crear el transporter
function crearTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    return nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 587,
        secure: false,
        auth: {
            user: emailUser, // Cambia con tu dirección de correo de tu servidor 
            pass: emailPassword // Cambia con tu contraseña
        }
    });
}

// Función para enviar correo de recuperación utilizando servidor SMTP
async function enviarCorreoRecuperacion(email, nuevaContrasena) {
    const transporter = crearTransporter();
    const emailUser = process.env.EMAIL_USER;

    try {
        const emailTemplatePath = path.join('uploads', 'html', 'reset-password.html');
        const emailTemplate = await fs.readFile(emailTemplatePath, 'utf8'); // Lectura asincrónica

        const mailOptions = {
            from: emailUser,
            to: email,
            subject: 'Recuperación de Contraseña',
            html: emailTemplate.replace('${nuevaContrasena}', nuevaContrasena)
        };

        await transporter.sendMail(mailOptions);
        console.log('Correo de recuperación enviado a', email);
    } catch (error) {
        console.error('Error al enviar correo de recuperación:', error);
    }
}

// Función para enviar correo de bienvenida con nueva clave de administrador
async function enviarCorreoBienvenida(email, nuevaContrasena) {
    const transporter = crearTransporter();
    const emailUser = process.env.EMAIL_USER;

    try {
        const mailOptions = {
            from: emailUser,
            to: email,
            subject: 'Bienvenido',
            text: `Tu contraseña temporal es: ${nuevaContrasena}. Te recomendamos cambiarla una vez hayas iniciado sesión.`
        };

        await transporter.sendMail(mailOptions);
        console.log('Correo de bienvenida enviado a', email);
    } catch (error) {
        console.error('Error al enviar correo de bienvenida:', error);
    }
}

// Función para enviar correo de contacto utilizando servidor SMTP
async function enviarCorreoContacto(email, apellido, telefono, mensaje, nombre) {
    const transporter = crearTransporter();
    const emailUser = process.env.EMAIL_USER;

    try {
        const emailTemplatePath = path.join('uploads', 'html', 'contacto.html');
        const emailTemplate = await fs.readFile(emailTemplatePath, 'utf8'); // Lectura asincrónica

        const mailOptions = {
            from: emailUser,
            cc: emailUser,
            to: email,
            subject: 'Solicitud de contacto',
            html: emailTemplate
                .replace('{{nombre}}', nombre)
                .replace('{{apellido}}', apellido)
                .replace('{{telefono}}', telefono)
                .replace('{{mensaje}}', mensaje)
        };

        await transporter.sendMail(mailOptions);
        console.log('Correo de contacto enviado a', email);
    } catch (error) {
        console.error('Error al enviar correo de contacto:', error);
    }
}

// Función para enviar correo informativo sobre una nueva publicación
async function enviarCorreoInformativo(name, email, newArticulo, isLoggedIn) {
    const transporter = crearTransporter();
    const emailUser = process.env.EMAIL_USER;

    try {
        // Ruta al archivo HTML
        const emailTemplatePath = path.join('uploads', 'html', 'informativo.html');
        const emailTemplate = await fs.readFile(emailTemplatePath, 'utf8'); // Lectura asincrónica

        // Determinar la URL en función del estado de login
        const sitioWeb = isLoggedIn
            ? `http://localhost:5173/auth/publicacion/${newArticulo._id}` // URL privada
            : `http://localhost:5173/publicacion/${newArticulo._id}`; // URL pública

        // Reemplazar las variables en el template con los datos reales
        const htmlContent = emailTemplate
            .replace('{{titulo}}', newArticulo.titulo)
            .replace('{{autor}}', newArticulo.Autor)
            .replace('{{descripcion}}', newArticulo.descripcion)
            .replace('{{sitio_web}}', sitioWeb);

        const mailOptions = {
            from: emailUser,
            to: email,
            subject: `Hola ${name}, nuevo artículo publicado: ${newArticulo.titulo}`,
            html: htmlContent  // Usar el contenido HTML procesado
        };

        await transporter.sendMail(mailOptions);
        console.log('Correo informativo enviado a', email);
    } catch (error) {
        console.error('Error al enviar correo informativo:', error);
    }
}


export default { enviarCorreoRecuperacion, enviarCorreoBienvenida, enviarCorreoContacto, enviarCorreoInformativo};

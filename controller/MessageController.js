import Message from '../models/message.js';

// Enviar mensaje
export const sendMessage = async (req, res) => {
    try {
        const { to, message } = req.body;
        const from = req.user.id

        // Validar que todos los campos requeridos estén presentes
        if (!from || !to || !message) {
            return res.status(400).json({ message: 'from, to y message son requeridos' });
        }

        const newMessage = new Message({ from, to, message });
        await newMessage.save();
        
        res.status(200).json({ status:'success', message: 'Mensaje enviado', newMessage });
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Error de validación', errors: error.errors });
        }
        res.status(500).json({ message: 'Error al enviar el mensaje', error: error.message });
    }
};

// Obtener mensajes entre dos usuarios
// Obtener mensajes entre dos usuarios
export const getMessages = async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const { page = 1, limit = 20 } = req.query; // Soporte para paginación

        // Validación de los parámetros de paginación
        const parsedLimit = Math.max(parseInt(limit) || 20, 1); // Mínimo 1
        const parsedPage = Math.max(parseInt(page) || 1, 1); // Mínimo 1
        const skip = (parsedPage - 1) * parsedLimit;

        // Buscar los mensajes entre los dos usuarios
        const messages = await Message.find({
            $or: [
                { from: userId1, to: userId2 },
                { from: userId2, to: userId1 }
            ]
        })
        .sort('-createdAt')  // Orden descendente para obtener los mensajes más recientes primero
        .skip(skip)
        .limit(parsedLimit)
        .select('from to message createdAt')  // Selecciona solo los campos relevantes
        .populate('from', 'name image')       // Población de datos de usuario remitente
        .populate('to', 'name image')         // Población de datos de usuario destinatario
        .lean();  // Optimización de la consulta

        // Obtener el número total de mensajes para calcular el total de páginas
        const totalMessages = await Message.countDocuments({
            $or: [
                { from: userId1, to: userId2 },
                { from: userId2, to: userId1 }
            ]
        });

        const totalPages = Math.ceil(totalMessages / parsedLimit);

        // Validar que la página solicitada no exceda el total de páginas
        if (parsedPage > totalPages && totalMessages > 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'La página solicitada no existe'
            });
        }

        // Calcular si hay páginas siguientes y anteriores
        const hasNextPage = parsedPage < totalPages;
        const hasPreviousPage = parsedPage > 1;

        res.status(200).json({
            status: 'success',
            message: 'Mensajes encontrados',
            messages,
            page: parsedPage,
            totalPages,
            totalMessages,
            hasNextPage,
            hasPreviousPage
        });
    } catch (error) {
        console.error('Error al obtener los mensajes:', error);
        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json({ message: 'Error al obtener los mensajes', error: error.message });
    }
};



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
export const getMessages = async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const { page = 1, limit = 20 } = req.query; // Soporte para paginación

        // Calcular el "skip" para paginar resultados
        const skip = (page - 1) * limit;

        // Buscar los mensajes entre los dos usuarios
        const messages = await Message.find({
            $or: [
                { from: userId1, to: userId2 },
                { from: userId2, to: userId1 }
            ]
        })
        .sort('createdAt') // Orden descendente para obtener los mensajes más recientes primero
        .skip(skip)
        .select('from to message createdAt')  // Selección de campos para optimización
        .populate('from', 'name image')       // Solo mostrar el 'name' e 'image' del usuario 'from'
        .populate('to', 'name image');        // Solo mostrar el 'name' e 'image' del usuario 'to'

        // Obtener el número total de mensajes para calcular el total de páginas
        const totalMessages = await Message.countDocuments({
            $or: [
                { from: userId1, to: userId2 },
                { from: userId2, to: userId1 }
            ]
        });

        const totalPages = Math.ceil(totalMessages / limit);

        res.status(200).json({
            status: 'success',
            message: 'mensajes encontrados',
            messages,
            page: parseInt(page),
            totalPages,
            totalMessages
        });
    } catch (error) {
        console.error('Error al obtener los mensajes:', error);
        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json({ message: 'Error al obtener los mensajes', error: error.message });
    }
};

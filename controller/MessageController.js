import Message from '../models/message.js';

// Enviar mensaje
export const sendMessage = async (req, res) => {
    try {
        const { from, to, message } = req.body;

        // Validar que todos los campos requeridos estén presentes
        if (!from || !to || !message) {
            return res.status(400).json({ message: 'from, to y message son requeridos' });
        }

        const newMessage = new Message({ from, to, message });
        await newMessage.save();
        
        res.status(200).json({ message: 'Mensaje enviado', newMessage });
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

        const messages = await Message.find({
            $or: [
                { from: userId1, to: userId2 },
                { from: userId2, to: userId1 }
            ]
        }).sort('createdAt');

        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los mensajes', error: error.message });
    }
};

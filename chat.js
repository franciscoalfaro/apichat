//importar dependencia de conexion
import { connection } from './database/connection.js'
import express from "express"
import cors from "cors"
import { createServer } from "http";
import { Server } from "socket.io";
import User from './models/user.js';
import Message from './models/message.js';

// efectuar conexion a BD
connection();

//crear conexion a servidor de node
const app = express();
const puerto = 3009;

// crear servidor HTTP con express
const server = createServer(app);

// configurar Socket.IO
const io = new Server(server, {
    path: '/apichat/socket.io/',
    wssEngine: ['ws', 'wss'],
    transports: ['websocket', 'polling'],
    cors: {
        origin: "*",
        allowedHeaders: ["Content-Disposition"],
        credentials: true
    }

});

//configurar cors
app.use(cors({
    exposedHeaders: ['Content-Disposition']
}));

//conertir los datos del body a obj js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//cargar rutas
import UserRoutes from "./routes/user.js";
import ChatRoutes from "./routes/chat.js";




// llamado a la ruta user
app.use("/api/user", UserRoutes);

//recovery
app.use("/api/chat", ChatRoutes)





// lógica de Socket.IO
// Configuración de Socket.IO
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Cuando un usuario se conecta, puedes actualizar su estado como en línea
    socket.on('user_online', async (id) => {
        console.log('usuario online', id)
        try {
            // Actualizar el estado del usuario a online en la base de datos
            await User.findByIdAndUpdate(id, { online: true });

            // Emitir el estado de usuario en línea a todos los usuarios conectados
            io.emit('user_status', { id, online: true });
        } catch (error) {
            console.error('Error al actualizar el estado del usuario', error);
        }
    });



    socket.on("userOffline", async (id) => {
        try {
            // Actualizar el estado del usuario a online en la base de datos
            await User.findByIdAndUpdate(id, { online: false });

            // Emitir el estado de usuario en línea a todos los usuarios conectados
            io.emit('user_status', { id, online: false });
        } catch (error) {
            console.error('Error al actualizar el estado del usuario', error);
        }
    });


    // Recibir y manejar mensajes en tiempo real
    socket.on('send_message', async (data) => {
        const { from, to, message } = data; // 'from' debería contener solo el ID
    
        try {
            // Buscar el usuario en la base de datos
            const sender = await User.findById(from._id).select('name image'); // Selecciona solo el nombre e imagen
    
            // Guardar el mensaje en la base de datos
            const newMessage = new Message({ from: sender, to, message });
            await newMessage.save();
    
            // Emitir el mensaje a los usuarios destinatarios
            io.emit('new_message', {
                _id: newMessage._id,
                from: {
                    _id: sender._id,
                    name: sender.name,
                    image: sender.image
                },
                to,
                message,
                createdAt: newMessage.createdAt // Si es necesario
            });
    
            console.log(newMessage);
        } catch (error) {
            console.error('Error al enviar el mensaje', error);
        }
    });
      
});


server.listen(puerto, () => {
    console.log("Server runing in port :" + puerto)
})
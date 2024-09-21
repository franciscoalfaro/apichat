//importar dependencia de conexion
import {connection} from './database/connection.js'
import express from "express"
import cors from  "cors"
import { createServer } from "http";
import { Server } from "socket.io";

// efectuar conexion a BD
connection();

//crear conexion a servidor de node
const app = express();
const puerto = 3008;

// crear servidor HTTP con express
const server = createServer(app);

// configurar Socket.IO
const io = new Server(server, {
  path: '/api-chat/socket.io/',
  wssEngine:['ws','wss'],
  transports:['websocket','polling'],
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
app.use(express.urlencoded({extended:true}));


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
  socket.on('user_online', async (userId) => {
      try {
          // Actualizar el estado del usuario a online en la base de datos
          await User.findByIdAndUpdate(userId, { online: true });
          
          // Emitir el estado de usuario en línea a todos los usuarios conectados
          io.emit('user_status', { userId, online: true });
      } catch (error) {
          console.error('Error al actualizar el estado del usuario', error);
      }
  });

  // Recibir y manejar mensajes en tiempo real
  socket.on('send_message', async (data) => {
      const { from, to, message } = data;

      try {
          // Guardar el mensaje en la base de datos
          const newMessage = new Message({ from, to, message });
          await newMessage.save();

          // Emitir el mensaje a los usuarios destinatarios
          io.to(from).emit('new_message', newMessage);
          io.to(to).emit('new_message', newMessage);
      } catch (error) {
          console.error('Error al enviar el mensaje', error);
      }
  });

  // Detectar desconexiones
  socket.on('disconnect', async () => {
      console.log(`Usuario desconectado: ${socket.id}`);
      const userId = socket.handshake.query.userId; // Suponiendo que envías el userId en la conexión

      if (userId) {
          try {
              // Actualizar el estado del usuario a offline en la base de datos
              await User.findByIdAndUpdate(userId, { online: false });

              // Emitir el estado de usuario desconectado a todos
              io.emit('user_status', { userId, online: false });
          } catch (error) {
              console.error('Error al actualizar el estado del usuario', error);
          }
      }
  });
});


server.listen(puerto, ()=> {
    console.log("Server runing in port :" +puerto)
})
import fs from 'fs';
import bcrypt from 'bcrypt';
import mongoosePagination from 'mongoose-paginate-v2';
import path from 'path';

// importar modelo
import User from '../models/user.js';
import Friends from '../models/friend.js';

// importar servicio
import * as validate from '../helpers/validate.js';
import * as jwt from '../services/jwt.js';


// registro
export const register = async (req, res) => {
    // Recoger datos de la petición
    const params = req.body;

    // Comprobar datos + validación
    if (!params.name || !params.surname || !params.email || !params.password || !params.nick) {
        return res.status(400).json({
            status: "error",
            message: "Faltan datos por enviar"
        });
    }

    try {
        // Validar datos
        validate.validate(params);
    } catch (error) {
        return res.status(400).json({
            status: "error",
            message: "Validación no superada",
        });
    }

    try {
        // Consultar si usuario existe en la BD
        const existingUser = await User.findOne({
            $or: [
                { email: params.email.toLowerCase() },
                { nick: params.nick.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.status(200).json({
                status: "warning",
                message: "El usuario ya existe"
            });
        }

        // Cifrar la contraseña con bcrypt
        const hashedPassword = await bcrypt.hash(params.password, 10);
        params.password = hashedPassword;

        // Crear objeto de usuario para guardar en la BD
        const userToSave = new User(params);

        // Guardar usuario en la BD
        const userStored = await userToSave.save();

        // Devolver el resultado
        return res.status(200).json({
            status: "success",
            message: "Usuario registrado correctamente",
            user: userStored,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error al registrar el usuario",
            error: error.message || "Error desconocido",
        });
    }
};

// login
export const login = async (req, res) => {
    let params = req.body;

    // Validar que email y password sean cadenas
    if (!params.email || typeof params.email !== 'string' || !params.password || typeof params.password !== 'string') {
        return res.status(400).send({
            status: "error_400",
            message: "Email o contraseña no válidos"
        });
    }

    try {
        // Buscar usuario en la BD
        let user = await User.findOne({ email: params.email });

        if (!user) {
            return res.status(404).json({ status: "Not Found", message: "Usuario no registrado" });
        }

        // Comprobar password que llega por el body y con la password del usuario de la BD
        const pwd = await bcrypt.compare(params.password, user.password);

        if (!pwd) {
            return res.status(400).send({
                error: "error",
                message: "No te has identificado de forma correcta."
            });
        }

        // Si el usuario está desactivado, cambiar el estado
        user.eliminado = false;
        await user.save();

        // Generar y devolver el token
        const token = jwt.createToken(user);
        return res.status(200).json({
            status: "success",
            message: "Te has identificado de forma correcta.",
            user: {
                id: user._id,
                name: user.name,
            },
            token,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            status: "error",
            message: "error al obtener el usuario en servidor"
        });
    }
};

//actualizar datos del usuario
export const update = async (req, res) => {
    try {
      // Recoger datos del usuario que se actualizará
      const userIdentity = req.user;
      let userToUpdate = req.body;
  
      // Eliminar campos sobrantes
      delete userToUpdate.iat;
      delete userToUpdate.exp;
      delete userToUpdate.role;
      delete userToUpdate.image;
  
      // Comprobar si el usuario ya existe
      const users = await User.find({
        $or: [{ email: userToUpdate.email.toLowerCase() }],
      });
  
      if (!users) {
        return res.status(500).send({ status: "error", message: "No existe el usuario a actualizar" });
      }
  
      let userIsset = false;
      users.forEach((user) => {
        if (user && user._id != userIdentity.id) userIsset = true;
      });
  
      if (userIsset) {
        return res.status(200).send({
          status: "warning",
          message: "El usuario ya existe",
        });
      }
  
      // Si hay contraseña, cifrarla
      if (userToUpdate.password) {
        let pwd = await bcrypt.hash(userToUpdate.password, 10);
        userToUpdate.password = pwd;
      } else {
        delete userToUpdate.password;
      }
  
      // Buscar el usuario y actualizarlo
      const userUpdate = await User.findByIdAndUpdate(userIdentity.id, userToUpdate, { new: true });
  
      if (!userUpdate) {
        return res.status(400).json({ status: "error", message: "Error al actualizar" });
      }
  
      return res.status(200).json({
        status: "success",
        message: "Profile update success",
        user: userUpdate, // Enviar el usuario actualizado
      });
    } catch (error) {
      return res.status(500).send({
        status: "error",
        message: "Error al obtener la información en el servidor",
      });
    }
  };

// perfil
export const profile = async (req, res) => {
    try {
        // Recibir parámetro id por URL
        const id = req.params.id;

        // Buscar el usuario por ID y excluir campos sensibles
        const userProfile = await User.findById(id).select({ "password": 0 });

        if (!userProfile) {
            return res.status(404).json({ status: "error", message: "NO SE HA ENCONTRADO EL USUARIO" });
        }

        // Enviar la respuesta con el perfil del usuario
        return res.status(200).json({
            status: "success",
            message: "profile found successfully",
            user: userProfile
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: "error al obtener el usuario en el servidor" });
    }
};


export const avatar = (req, res) => {

    //obtener parametro de la url
    const file = req.params.file
    
    //montar el path real de la image
    const filePath = "./uploads/avatars/" + file

    try {
        //comprobar si archivo existe
        fs.stat(filePath, (error, exist) => {
            if (!exist) {
                return res.status(404).send({
                    status: "error",
                    message: "la image no existe"
                })
            }
            //devolver archivo en el caso de existir  
            return res.sendFile(path.resolve(filePath));
        })

    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "error al obtener la informacion en servidor"
        })
    }
}

//subida de image
export const upload = async (req, res) => {
    
    //recoger el fichero de image
    if (!req.file) {
        return res.status(404).send({
            status: "error",
            message: "imagen no seleccionada"
        })
    }

    //conseguir nombre del archivo
    let image = req.file.originalname

    //obtener extension del archivo
    const imageSplit = image.split("\.");
    const extension = imageSplit[1].toLowerCase();

    //comprobar extension
    if (extension != "png" && extension != "jpg" && extension != "jpeg" && extension != "gif") {

        //borrar archivo y devolver respuesta en caso de que archivo no sea de extension valida.
        const filePath = req.file.path
        const fileDelete = fs.unlinkSync(filePath)

        //devolver respuesta.        
        return res.status(400).json({
            status: "error",
            mensaje: "Extension no valida"
        })

    }

    try {
        const ImaUpdate = await User.findOneAndUpdate({ _id: req.user.id }, { image: req.file.filename }, { new: true })

        if (!ImaUpdate) {
            return res.status(400).json({ status: "error", message: "error al actualizar" })
        }
        //entrega respuesta corrrecta de image subida
        return res.status(200).json({
            status: "success",
            message: "avatar actualizado",
            user: req.user,
            file: req.file,
            image
        });
    } catch (error) {
        if (error) {
            const filePath = req.file.path
            const fileDelete = fs.unlinkSync(filePath)
            return res.status(500).send({
                status: "error",
                message: "error al obtener la informacion en servidor",
            })
        }

    }

}

//end-point para listar informacion del usuario publico como el nombre la descripcion, necesito popular
export const listado = async (req, res) => {
    try {
        // Obtener todos los skills sin paginación y excluyendo el campo userId
        const usuario = await User.find({}, "-userId -password -eliminado -role -email -nick").sort({ fecha: -1 });

        return res.status(200).json({
            status: 'success',
            message: 'Listado de usuario',
            User: usuario,
            totalItems: usuario.length
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Error al listar las usuario',
            error: error.message
        });
    }
}


// Aceptar solicitud de amistad
export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const request = await Friends.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: 'Solicitud de amistad no encontrada' });
        }

        request.status = 'accepted';
        await request.save();

        // Añadir como amigo a ambos usuarios
        const fromUser = await User.findById(request.from);
        const toUser = await User.findById(request.to);

        if (!fromUser || !toUser) {
            return res.status(404).json({ message: 'Usuarios no encontrados' });
        }

        fromUser.friends.push(toUser._id);
        toUser.friends.push(fromUser._id);
        await fromUser.save();
        await toUser.save();

        res.status(200).json({ message: 'Amistad aceptada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al aceptar la solicitud de amistad', error: error.message });
    }
};

// Obtener listado de amigos
export const getFriendsList = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('friends');

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json(user.friends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener la lista de amigos', error: error.message });
    }
};

// Enviar solicitud de amistad
export const sendFriendRequest = async (req, res) => {
    try {
        const { fromId, toId } = req.body;

        // Validar que los IDs no estén vacíos y sean del tamaño correcto
        if (!fromId || !toId || fromId.length !== 24 || toId.length !== 24) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        const request = new Friends({ from: fromId, to: toId });
        await request.save();
        res.status(200).json({ message: 'Solicitud de amistad enviada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al enviar la solicitud de amistad', error: error.message });
    }
};

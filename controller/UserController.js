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

//end-point para listar informacion de los usuarios
export const listado = async (req, res) => {

    const userId = req.user.id; // ID del usuario autenticado
    let page = 1
    if (req.params.page) {
        page = req.params.page
    }
    page = parseInt(page)

    let itemPerPage = 6

    try {
        // Configurar opciones de paginación
        const options = {
            page,
            limit: itemPerPage,
            sort: { createdAt: -1 },  // Ordenar por fecha de creación, de más reciente a más antiguo
            select: "-password -role -__v",  // Excluir campos sensibles como contraseña, rol y versión
        };

        // Excluir al usuario autenticado de los resultados
        const usuarios = await User.paginate({ _id: { $ne: userId } }, options);

        // Comprobar si se encontraron usuarios
        if (!usuarios.docs.length) {
            return res.status(404).json({
                status: 'error',
                message: 'No se encontraron usuarios'
            });
        }

        // Buscar solicitudes de amistad enviadas y recibidas
        const solicitudesEnviadas = await Friends.find({ from: userId }).select('to status _id');
        const solicitudesRecibidas = await Friends.find({ to: userId }).select('from status _id');

        // Mapeamos los usuarios y añadimos el estado de la solicitud de amistad y el requestId
        const usuariosConEstado = usuarios.docs.map(usuario => {
            const solicitudEnviada = solicitudesEnviadas.find(solicitud => solicitud.to.equals(usuario._id));
            const solicitudRecibida = solicitudesRecibidas.find(solicitud => solicitud.from.equals(usuario._id));

            return {
                ...usuario._doc,  // Incluimos los datos del usuario
                solicitudAmistad: solicitudEnviada ? solicitudEnviada.status : 'no enviada',  // Estado de la solicitud enviada
                solicitudRecibida: solicitudRecibida ? solicitudRecibida.status : 'no recibida', // Estado de la solicitud recibida
                requestIdEnviada: solicitudEnviada ? solicitudEnviada._id : null,  // ID de la solicitud enviada
                requestIdRecibida: solicitudRecibida ? solicitudRecibida._id : null   // ID de la solicitud recibida
            };
        });

        // Respuesta de éxito con la lista de usuarios y el estado de la amistad
        return res.status(200).json({
            status: 'success',
            message: 'Usuarios encontrados',
            usuarios: usuariosConEstado,      // Lista de los usuarios en la página actual con el estado de la amistad
            totalPages: usuarios.totalPages,  // Número total de páginas
            totalDocs: usuarios.totalDocs,    // Total de documentos
            itemsPerPage: usuarios.limit,     // Número de usuarios por página
            page: usuarios.page               // Página actual
        });

    } catch (error) {
        console.error("Error al listar los usuarios:", error);

        return res.status(500).json({
            status: 'error',
            message: 'Error al listar los usuarios',
            error: error.message
        });
    }
};

// Aceptar solicitud de amistad
export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        console.log(requestId)
        const request = await Friends.findById(requestId);

        if (!request) {
            return res.status(404).json({ status: 'error', message: 'Solicitud de amistad no encontrada' });
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

        res.status(200).json({ status: 'success', message: 'Amistad aceptada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al aceptar la solicitud de amistad', error: error.message });
    }
};

// Obtener listado de mis amigos
export const getFriendsList = async (req, res) => {
    const userId = req.user.id; // ID del usuario autenticado
    let page = parseInt(req.params.page) || 1; // Número de página, por defecto es 1
    const itemPerPage = 6; // Número de items por página

    try {
        // Configurar opciones de paginación
        const options = {
            page,
            limit: itemPerPage,
            sort: { createdAt: -1 }, // Ordenar por fecha de creación
            populate: [
                { path: 'from', select: 'name email online image' },  // Poblamos los campos de 'from' y 'to'
                { path: 'to', select: 'name email online image' }
            ]
        };

        // Buscar las relaciones de amistad en las que el usuario autenticado es 'from' o 'to'
        // y cuyo estado sea 'accepted'
        const query = {
            $or: [{ from: userId }, { to: userId }],
            status: 'accepted' // Solo amigos aceptados
        };

        // Paginación usando el modelo 'Friends'
        const friendsList = await Friends.paginate(query, options);

        return res.status(200).json({
            status: 'success',
            message: 'Amigos encontrados',
            friends: friendsList.docs,        // Lista de amigos en la página actual
            totalPages: friendsList.totalPages, // Número total de páginas
            totalDocs: friendsList.totalDocs,  // Total de amigos
            itemsPerPage: friendsList.limit,   // Número de amigos por página
            page: friendsList.page      // Página actual
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: 'error',
            message: 'Error al listar los amigos',
            error: error.message
        });
    }
};


// Enviar solicitud de amistad
export const sendFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const userId = req.user.id

        // Validar que los IDs no estén vacíos y sean del tamaño correcto
        if (!userId || !requestId || userId.length !== 24 || requestId.length !== 24) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        const request = new Friends({ from: userId, to: requestId });
        await request.save();
        res.status(200).json({ status: 'success', message: 'Solicitud de amistad enviada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al enviar la solicitud de amistad', error: error.message });
    }
};


//listar solicitudes de amistad
export const requestFriendsList = async (req, res) => {
    const userId = req.user.id;

    let page = 1
    if (req.params.page) {
        page = req.params.page
    }
    page = parseInt(page)

    let itemPerPage = 6

    try {
        // Configurar opciones de paginación
        const options = {
            page,
            limit: itemPerPage,
            sort: { createdAt: -1 },
            populate: [
                { path: 'from', select: 'name surname email online image' },  // Poblamos los campos de 'from' y 'to'
                { path: 'to', select: 'name surname email online image' }
            ]
        };

        
        // Buscar todas las solicitudes de amistad
        const requestList = await Friends.paginate({ to: userId }, options);


        // Buscar solicitudes de amistad enviadas y recibidas
        const solicitudesEnviadas = await Friends.find({ from: userId }).select('to status _id');
        const solicitudesRecibidas = await Friends.find({ to: userId }).select('from status _id');

        // Mapeamos los usuarios y añadimos el estado de la solicitud de amistad y el requestId
        const usuariosConEstado = requestList.docs.map(usuario => {
            const solicitudEnviada = solicitudesEnviadas.find(solicitud => solicitud.to.equals(usuario._id));
            const solicitudRecibida = solicitudesRecibidas.find(solicitud => solicitud.from.equals(usuario._id));

            return {
                ...usuario._doc,  // Incluimos los datos del usuario
                solicitudAmistad: solicitudEnviada ? solicitudEnviada.status : 'no enviada',  // Estado de la solicitud enviada
                solicitudRecibida: solicitudRecibida ? solicitudRecibida.status : 'no recibida', // Estado de la solicitud recibida
                requestIdEnviada: solicitudEnviada ? solicitudEnviada._id : null,  // ID de la solicitud enviada
                requestIdRecibida: solicitudRecibida ? solicitudRecibida._id : null   // ID de la solicitud recibida
            };
        });



        return res.status(200).json({
            status: 'success',
            message: 'solicitudes encontradas',
            solicitudes: usuariosConEstado, // Lista de los amigos en la página actual
                    
            totalPages: requestList.totalPages,  // Número total de páginas
            totalDocs: requestList.totalDocs,  // Total de documentos
            itemsPerPage: requestList.limit,   // Número de requestList por página
            page: requestList.page      // Página actual
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: 'error',
            message: 'Error al listar las solicitudes',
            error: error.message
        });
    }
};


//buscar amigos por nombre o email
export const searchNewFriends = async (req, res) => {
    const userId = req.user.id; // ID del usuario autenticado
    const { searchTerm } = req.query; // Término de búsqueda, página y límite de resultados por página
    console.log(userId)
    let page = 1;

    if (req.params.page) {
        page = parseInt(req.params.page);
    }
    const limit = 10

    // Validar que el término de búsqueda no esté vacío
    if (!searchTerm || searchTerm.trim() === '') {
        return res.status(400).json({
            status: 'error',
            message: 'Debe proporcionar un término de búsqueda'
        });
    }

    try {
        // Buscar los usuarios que coincidan por nombre, email o nickname
        const searchQuery = {
            $or: [
                { name: new RegExp(searchTerm, 'i') }, // Búsqueda insensible a mayúsculas/minúsculas
                { email: new RegExp(searchTerm, 'i') },
                { nickname: new RegExp(searchTerm, 'i') }
            ],
            _id: { $ne: userId } // Excluir al usuario autenticado
        };

        // Obtener las relaciones de amistad del usuario autenticado
        const friendsAndPending = await Friends.find({
            $or: [{ from: userId }, { to: userId }]
        });

        // Obtener una lista de los IDs de usuarios que ya son amigos o tienen solicitudes pendientes
        const excludedUserIds = friendsAndPending.map(friend =>
            friend.from.toString() === userId ? friend.to.toString() : friend.from.toString()
        );

        // Incluir el usuario autenticado en la lista de exclusiones
        excludedUserIds.push(userId);

        // Filtrar los usuarios que no estén en la lista de exclusión y aplicar paginación
        const users = await User.find({
            ...searchQuery,
            _id: { $nin: excludedUserIds } // Excluir usuarios que ya son amigos o tienen solicitudes pendientes
        })
            .select('name email nick image surname online friends create_at') // Seleccionar campos relevantes
            .skip((page - 1) * limit) // Saltar registros según la página
            .limit(parseInt(limit)); // Limitar el número de registros por página

        // Obtener el número total de usuarios que coinciden con la búsqueda
        const totalUsers = await User.countDocuments({
            ...searchQuery,
            _id: { $nin: excludedUserIds }
        });

        return res.status(200).json({
            status: 'success',
            message: 'Usuarios encontrados',
            users,
            totalPages: Math.ceil(totalUsers / limit), // Número total de páginas
            currentPage: parseInt(page), // Página actual
            totalUsers, // Número total de usuarios encontrados
            itemsPerPage: limit // Usuarios por página
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al buscar nuevos amigos',
            error: error.message
        });
    }
};

import express from "express";
import multer from "multer";
import * as UserController from "../controller/UserController.js";
import { auth as checkAuth } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit"; // Corrección de importación

const router = express.Router();

// Configuración de subida
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/avatars");
    },
    filename: (req, file, cb) => {
        cb(null, "avatar-" + Date.now() + "-" + file.originalname);
    }
});

const windowTime = 1 * 60 * 1000;
// Límite de intentos de login
// Límite de intentos de login
const loginLimiter = rateLimit({
    windowMs: windowTime, // 1 minuto
    max: 5, // Limita a 5 solicitudes por IP en cada ventana de 1 minuto
    message: (req, res) => {
        const minutes = Math.floor(windowTime / 60000); // Convertir ms a minutos
        return {
            status: "error",
            message: `Has realizado demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde. Podrás intentarlo nuevamente en ${minutes} minuto${minutes > 1 ? 's' : ''}.`
        };
    }
});

const uploads = multer({ storage });

// Definir rutas
router.post("/register", UserController.register);
router.post("/login", loginLimiter, UserController.login); // Aplicar el limitador en la ruta de login
router.get("/profile/:id", checkAuth, UserController.profile);
router.put("/update", checkAuth, UserController.update);
router.post("/upload", [checkAuth, uploads.single("file0")], UserController.upload);
router.get("/avatar/:file", UserController.avatar);

// Listado de usuarios
router.get("/listado/:page?", checkAuth, UserController.listado);

// Enviar solicitud de amistad
router.post("/friend/request", checkAuth, UserController.sendFriendRequest);

// Aceptar solicitudes de amistad
router.post("/friend/accept", checkAuth, UserController.acceptFriendRequest);

// Obtener mis amigos
router.get("/friends/:page?", checkAuth, UserController.getFriendsList);

// Listar las solicitudes de amistad
router.get("/requestfriends/:page?", checkAuth, UserController.requestFriendsList);

// Buscar nuevos amigos
router.get("/search", checkAuth, UserController.searchNewFriends);

router.get("/getprofile/:id", checkAuth, UserController.profileGet)

// Exportar router
export default router;

import express from "express";
import multer from "multer";
import * as UserController from "../controller/UserController.js";
import { auth as checkAuth } from "../middlewares/auth.js";

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

const uploads = multer({ storage });

// Definir rutas
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/profile/:id", checkAuth, UserController.profile);
router.put("/update", checkAuth, UserController.update);
router.post("/upload", [checkAuth, uploads.single("file0")], UserController.upload);
router.get("/avatar/:file", UserController.avatar);

//listado de usuarios 
router.get("/listado/:page?",checkAuth, UserController.listado)

// enviar solicitud de amistar
router.post("/friend/request", checkAuth, UserController.sendFriendRequest);

//aceptar solicitudes de amistad
router.post("/friend/accept", checkAuth, UserController.acceptFriendRequest);

//obtener mis amigos
router.get("/friends/:page?", checkAuth, UserController.getFriendsList);

//listar las solicitudes de amistad
router.get("/requestfriends/:page?", checkAuth, UserController.requestFriendsList);

router.get("/search", checkAuth, UserController.searchNewFriends);


// Exportar router
export default router;

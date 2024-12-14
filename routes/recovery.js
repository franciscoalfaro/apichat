import express from "express";
import * as RecoveryController from "../controller/recoveryController.js";

const router = express.Router()

router.post("/newpass", RecoveryController.recuperarContrasena)

// Exportar router
export default router;





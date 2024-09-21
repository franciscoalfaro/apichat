import express from 'express';
import * as MessageController from '../controller/MessageController.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

router.post('/send', auth, MessageController.sendMessage);
router.get('/conversation/:userId1/:userId2', auth, MessageController.getMessages);

export default router;

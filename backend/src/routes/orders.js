import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import * as orderController from "../controllers/orderController.js";

const router = express.Router();

router.get("/", authMiddleware, orderController.getOrders);

export default router;

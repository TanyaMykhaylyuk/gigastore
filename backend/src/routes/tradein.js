import express from "express";
import * as tradeinController from "../controllers/tradeinController.js";

const router = express.Router();

router.post("/", tradeinController.createTradeIn);

export default router;

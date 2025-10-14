import express from "express";
import * as productsController from "../controllers/productsController.js";

const router = express.Router();

router.get("/", productsController.getProducts);

export default router;

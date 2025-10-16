import express from "express";
import * as productsController from "../controllers/productsController.js";

const router = express.Router();

router.get("/", productsController.getProducts);

router.get("/all", productsController.getAllProducts);

router.get("/count", productsController.getProductsCount);

export default router;

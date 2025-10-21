import express from "express";
import * as repairController from "../controllers/repairController.js";

const router = express.Router();

router.post("/", repairController.createRepair);

export default router;

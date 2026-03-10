import express from "express";
import * as stripeController from "../controllers/stripeController.js";

const router = express.Router();

router.post("/create-checkout-session", stripeController.createCheckoutSession);

export default router;

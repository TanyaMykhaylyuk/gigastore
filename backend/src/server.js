import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import tradeinRoutes from "./routes/tradein.js";
import repairRoutes from "./routes/repair.js";
import stripeRoutes from "./routes/stripe.js";
import webhookRoutes from "./routes/webhook.js";
import ordersRoutes from "./routes/orders.js";

dotenv.config();

const app = express();

app.use("/webhook", webhookRoutes);

app.use(express.json());
app.use(cookieParser());

const FRONTEND = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: FRONTEND,
    credentials: true,
  })
);

app.use("/auth", authRoutes);
app.use("/products", productsRoutes);
app.use("/cart", cartRoutes);
app.use("/tradein", tradeinRoutes);
app.use("/repair", repairRoutes);
app.use("/orders", ordersRoutes);

app.use("/stripe", stripeRoutes);

app.get("/", (req, res) => {
  res.send(" Backend running!");
});

const port = process.env.PORT || 5012;
app.listen(port, () => {
  console.log(` Backend listening on http://localhost:${port}`);
  console.log("Use Stripe CLI for testing webhooks locally:");
  console.log("stripe listen --forward-to localhost:5011/webhook");
});

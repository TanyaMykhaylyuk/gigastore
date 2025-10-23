import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import tradeinRoutes from "./routes/tradein.js"; 
import repairRoutes from "./routes/repair.js"

const app = express();
const PORT = process.env.PORT || 5011;
const FRONTEND = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(express.json());
app.use(
  cors({
    origin: FRONTEND,
    credentials: true,
  })
);

app.use("/auth", authRoutes); 
app.use("/products", productsRoutes);
app.use("/tradein", tradeinRoutes);
app.use("/repair", repairRoutes);


app.get("/", (req, res) => res.send("Backend (products API) running"));

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

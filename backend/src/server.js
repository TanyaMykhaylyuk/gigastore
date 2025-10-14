import express from "express";
import cors from "cors";
import productsRoutes from "./routes/products.js";

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

app.use("/products", productsRoutes);

app.get("/", (req, res) => res.send("Backend (products API) running"));

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

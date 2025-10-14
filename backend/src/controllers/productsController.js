import pool from "../lib/db.js";

export async function getProducts(req, res) {
  try {
    const { category, limit, page } = req.query;
    const limitRaw = limit ? parseInt(limit, 10) : null;
    const pageRaw = page ? parseInt(page, 10) : null;

    let query = "SELECT id, title, price, img, category FROM public.products";
    const values = [];

    if (category) {
      values.push(category);
      query += ` WHERE category = $${values.length}`;
    }

    if (limitRaw && pageRaw) {
      values.push(limitRaw, limitRaw * (pageRaw - 1));
      query += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    const result = await pool.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    console.error("Products error:", err);
    return res.status(500).json({ error: "Failed to load products" });
  }
}

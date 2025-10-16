import pool from "../lib/db.js";

function buildWhereClause(category, values) {
  let where = "";
  if (category) {
    values.push(category);
    where = ` WHERE category = $${values.length}`;
  }
  return where;
}

export async function getProducts(req, res) {
  try {
    const { category, limit, page } = req.query;
    const limitRaw = limit ? parseInt(limit, 10) : null;
    const pageRaw = page ? parseInt(page, 10) : null;

    const values = [];
    let query = "SELECT id, title, price, img, category FROM public.products";
    query += buildWhereClause(category, values);

    if (limitRaw) {
      if (pageRaw && pageRaw > 0) {
        values.push(limitRaw, limitRaw * (pageRaw - 1));
        query += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
      } else {
        values.push(limitRaw);
        query += ` LIMIT $${values.length}`;
      }
    }

    const result = await pool.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    console.error("Products error:", err);
    return res.status(500).json({ error: "Failed to load products" });
  }
}

export async function getAllProducts(req, res) {
  try {
    const result = await pool.query("SELECT id, title, price, img, category FROM public.products");
    return res.json(result.rows);
  } catch (err) {
    console.error("getAllProducts error:", err);
    return res.status(500).json({ error: "Failed to load products" });
  }
}

export async function getProductsCount(req, res) {
  try {
    const { category } = req.query;
    const values = [];
    let query = "SELECT COUNT(*)::int AS count FROM public.products";
    query += buildWhereClause(category, values);

    const { rows } = await pool.query(query, values);
    return res.json({ count: rows[0].count });
  } catch (err) {
    console.error("getProductsCount error:", err);
    return res.status(500).json({ error: "Failed to count products" });
  }
}

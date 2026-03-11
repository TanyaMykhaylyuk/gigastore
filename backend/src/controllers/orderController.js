import pool from "../lib/db.js";

export async function getOrders(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { rows: userOrders } = await pool.query(
      "SELECT id, items, created_at, user_id, status FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    return res.json({ success: true, orders: userOrders });
  } catch (err) {
    console.error("Get orders error:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

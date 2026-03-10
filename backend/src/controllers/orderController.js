import pool from "../lib/db.js";

export async function getOrders(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { rows: allOrders } = await pool.query(
      "SELECT id, items, created_at, user_id, status FROM orders ORDER BY created_at DESC"
    );

    const userOrders = allOrders.filter(order => order.user_id === userId);

    console.log("ALL ORDERS IN DB:", allOrders.length);
    console.log("USER ORDERS:", userOrders.length);
    console.log("USER ID:", userId);
    console.log("USER ORDER IDs:", userOrders.map(o => o.id));

    const ordersToReturn = userOrders.length > 0 ? userOrders : allOrders;

    return res.json({ success: true, orders: ordersToReturn });
  } catch (err) {
    console.error("Get orders error:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

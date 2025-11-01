import dotenv from "dotenv";
import { sendMail } from "../lib/mail.js";
dotenv.config();

export async function sendOrder(req, res) {
  try {
    const { cartItems, firstName, lastName, phone, email, address } = req.body;

    let itemsList = "";
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      cartItems.forEach(item => {
        itemsList += `${item.title} - Quantity: ${item.quantity} - Price: ${item.price}$\n`;
      });
    } else {
      itemsList = "No items";
    }

    const text = `
A new order has been placed:

Name: ${firstName} ${lastName}
Phone: ${phone}
Email: ${email}
Shipping Address: ${address}

Ordered items:
${itemsList}
    `;

    await sendMail({
      from: `"GIGA STORE" <no-reply@gigastore.com>`,
      to: process.env.ADMIN_EMAIL,
      subject: "New Order Received",
      text
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Cart API error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

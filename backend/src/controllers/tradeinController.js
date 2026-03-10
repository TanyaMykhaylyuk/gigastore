import pool from "../lib/db.js";
import { sendMail } from "../lib/mail.js";

function validatePhone(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (/[a-zA-Z]/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export async function createTradeIn(req, res) {
  try {
    const {
      firstName, lastName, phone,
      model, memory, visualCondition, technicalCondition
    } = req.body || {};

    if (!firstName || !lastName || !phone || !model || !memory) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }
    if (firstName.toString().length > 100 || lastName.toString().length > 100) {
      return res.status(400).json({ success: false, error: "Name fields are too long" });
    }
    if (model.toString().length > 100 || memory.toString().length > 50) {
      return res.status(400).json({ success: false, error: "Model or memory value is too long" });
    }

    const query = `
      INSERT INTO trade_orders
        (first_name, last_name, phone, model, memory, visual_condition, technical_condition)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const values = [
      firstName, lastName, phone,
      model, memory, visualCondition, technicalCondition
    ];

    try {
      await pool.query(query, values);
    } catch (e) {
      console.warn("Could not insert trade order (maybe table missing):", e.message);
    }

    try {
      await sendMail({
        from: `"GIGA STORE" <no-reply@gigastore.com>`,
        to: process.env.ADMIN_EMAIL,
        subject: "New Trade-In Order Received",
        text: `
A new trade-in request has been submitted:
Name: ${firstName} ${lastName}
Phone: ${phone}
Model: ${model}
Memory: ${memory}
Visual Condition: ${visualCondition}
Technical Condition: ${technicalCondition}
        `
      });
    } catch (mailErr) {
      console.error("Failed to send trade-in email:", mailErr);
      return res.json({ success: true, warning: "mail_failed" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Trade-in API error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}

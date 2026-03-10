import { sendMail } from "../lib/mail.js";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePhone(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (/[a-zA-Z]/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function validateEmail(value) {
  if (!value || typeof value !== "string" || value.length > 254) return false;
  return emailRe.test(value.trim().toLowerCase());
}

export async function createRepair(req, res) {
  try {
    const { devices, model, description, phone, email } = req.body || {};

    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ success: false, error: "No devices selected" });
    }
    if (!model || !model.toString().trim()) {
      return res.status(400).json({ success: false, error: "Model required" });
    }
    if (model.toString().length > 100) {
      return res.status(400).json({ success: false, error: "Model name is too long" });
    }
    if (!description || !description.toString().trim()) {
      return res.status(400).json({ success: false, error: "Description required" });
    }
    if (description.toString().length > 2000) {
      return res.status(400).json({ success: false, error: "Description is too long" });
    }
    if (!phone || !phone.toString().trim()) {
      return res.status(400).json({ success: false, error: "Phone required" });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }
    if (!email || !email.toString().trim()) {
      return res.status(400).json({ success: false, error: "Email required" });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, error: "Invalid email format" });
    }

    const deviceText = devices.join(", ");

    const text = `
A new repair request has been submitted:

Device(s) to repair: ${deviceText}
Model: ${model}
Problem Description: ${description}

Contact Phone: ${phone}
Contact Email: ${email}
    `;

    try {
      await sendMail({
        from: `"GIGA STORE" <no-reply@gigastore.com>`,
        to: process.env.ADMIN_EMAIL,
        subject: "New Repair Request",
        text,
      });
    } catch (mailErr) {
      console.error("Failed to send repair email:", mailErr);
      return res.json({ success: true, warning: "mail_failed" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Repair API error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}

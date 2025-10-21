import { sendMail } from "../lib/mail.js";

export async function createRepair(req, res) {
  try {
    const { devices, model, description, phone, email } = req.body || {};

    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ success: false, error: "No devices selected" });
    }
    if (!model || !model.toString().trim()) {
      return res.status(400).json({ success: false, error: "Model required" });
    }
    if (!description || !description.toString().trim()) {
      return res.status(400).json({ success: false, error: "Description required" });
    }
    if (!phone || !phone.toString().trim()) {
      return res.status(400).json({ success: false, error: "Phone required" });
    }
    if (!email || !email.toString().trim()) {
      return res.status(400).json({ success: false, error: "Email required" });
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

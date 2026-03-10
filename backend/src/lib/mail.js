import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let transporter = null;

export function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return transporter;
}

export async function sendMail(opts) {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("[mail] SMTP configuration missing");
      console.log("[mail] EMAIL WOULD BE SENT (development mode):");
      console.log("[mail] To:", opts.to);
      console.log("[mail] Subject:", opts.subject);
      console.log("[mail] Body:", opts.text);
      return { messageId: "dev-mode-no-send", development: true };
    }

    const t = getTransporter();
    
    await t.verify();
    
    console.log("[mail] Sending email to:", opts.to);
    console.log("[mail] Subject:", opts.subject);
    
    const result = await t.sendMail(opts);
    console.log("[mail] Email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("[mail] Email sending failed:", error);
    console.error("[mail] SMTP config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? "configured" : "missing",
      pass: process.env.SMTP_PASS ? "configured" : "missing",
      adminEmail: process.env.ADMIN_EMAIL
    });
    throw error;
  }
}

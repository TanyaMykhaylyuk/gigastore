import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const defaultFrom = process.env.MAIL_FROM || "GIGA STORE <onboarding@resend.dev>";

export async function sendMail(opts) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("[mail] RESEND_API_KEY is missing");
      console.log("[mail] EMAIL WOULD BE SENT (development):");
      console.log("[mail] To:", opts.to);
      console.log("[mail] Subject:", opts.subject);
      return { messageId: "dev-no-send", development: true };
    }

    const to = Array.isArray(opts.to) ? opts.to : [opts.to];
    const from = defaultFrom;

    console.log("[mail] Sending email to:", opts.to);
    console.log("[mail] Subject:", opts.subject);

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: opts.subject || "",
      text: opts.text || "",
      html: opts.html || undefined
    });

    if (error) {
      console.error("[mail] Resend error:", error);
      throw new Error(error.message || "Resend send failed");
    }

    console.log("[mail] Email sent successfully:", data?.id);
    return { messageId: data?.id, ...data };
  } catch (error) {
    console.error("[mail] Email sending failed:", error);
    throw error;
  }
}

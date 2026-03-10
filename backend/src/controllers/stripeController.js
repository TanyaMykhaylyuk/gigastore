import Stripe from "stripe";
import dotenv from "dotenv";
import { sendMail } from "../lib/mail.js";
dotenv.config();

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

export async function createCheckoutSession(req, res) {
  try {
    const { cartItems, firstName, lastName, phone, email, address } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }
    if (!firstName || !firstName.toString().trim()) {
      return res.status(400).json({ error: "First name is required" });
    }
    if (!lastName || !lastName.toString().trim()) {
      return res.status(400).json({ error: "Last name is required" });
    }
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!phone || !validatePhone(phone)) {
      return res.status(400).json({ error: "Valid phone number is required" });
    }
    if (!address || !address.toString().trim()) {
      return res.status(400).json({ error: "Shipping address is required" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set");
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = cartItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: item.img ? [item.img] : undefined,
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url:
        `${process.env.FRONTEND_ORIGIN || "http://localhost:3000"}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_ORIGIN || "http://localhost:3000"}/cart`,
      metadata: {
        firstName: firstName || "",
        lastName: lastName || "",
        phone: phone || "",
        email: email || "",
        address: address || "",
      },
    });

    try {
      let itemsList = "";
      cartItems.forEach((it) => {
        itemsList += `${it.title} — Qty: ${it.quantity} — Price: ${it.price}$\n`;
      });

      const text = `
New order (checkout session created, payment pending):

Name: ${firstName || ""} ${lastName || ""}
Phone: ${phone || ""}
Email: ${email || ""}
Address: ${address || ""}

Checkout session id: ${session.id}
Checkout URL: ${session.url || "n/a"}

Items:
${itemsList}
      `;

      await sendMail({
        from: `"GIGA STORE" <no-reply@gigastore.com>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New order (pending payment) — ${firstName || ""} ${lastName || ""}`,
        text,
      });

      console.info("[stripeController] admin notified about new checkout session (pending payment)", session.id);
    } catch (mailErr) {
      console.error("[stripeController] failed to send admin notification on session create:", mailErr);
    }

    return res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return res.status(500).json({ error: err.message });
  }
}

import Stripe from "stripe";
import { sendMail } from "../lib/mail.js";
import dotenv from "dotenv";
import pool from "../lib/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
dotenv.config();

let processedTableReady = false;

async function ensureProcessedTable() {
  if (processedTableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_processed_sessions (
      session_id TEXT PRIMARY KEY,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  processedTableReady = true;
}

async function lockSessionProcessing(sessionId) {
  await ensureProcessedTable();
  const { rows } = await pool.query(
    `INSERT INTO stripe_processed_sessions (session_id)
     VALUES ($1)
     ON CONFLICT (session_id) DO NOTHING
     RETURNING session_id`,
    [sessionId]
  );
  return rows.length > 0;
}

export async function processPaidCheckoutSession(stripe, session) {
  const canProcess = await lockSessionProcessing(session.id);
  if (!canProcess) {
    console.info("[stripe] session already processed:", session.id);
    return { success: true, duplicate: true };
  }

  const meta = session.metadata || {};

  let itemsText = "No line items available";
  let lineItemsResp = null;
  try {
    lineItemsResp = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    if (Array.isArray(lineItemsResp.data) && lineItemsResp.data.length > 0) {
      itemsText = lineItemsResp.data
        .map(li => `${li.description || li.price?.product || li.price?.id} — qty: ${li.quantity} — unit_amount: ${li.price?.unit_amount ? (li.price.unit_amount / 100).toFixed(2) : "n/a"} ${session.currency ? session.currency.toUpperCase() : ""}`)
        .join("\n");
    }
  } catch (liErr) {
    console.warn("[webhook] failed to fetch line items:", liErr);
  }

  const adminText = `
Paid order received:

Name: ${meta.firstName || ""} ${meta.lastName || ""}
Phone: ${meta.phone || ""}
Email: ${meta.email || ""}
Address: ${meta.address || ""}

Stripe session id: ${session.id}
Amount total: ${session.amount_total ? (session.amount_total / 100).toFixed(2) : "N/A"} ${(session.currency || "usd").toUpperCase()}
Payment status: ${session.payment_status || "N/A"}

Items:
${itemsText}
      `;

  sendMail({
    from: `"GIGA STORE" <no-reply@gigastore.com>`,
    to: process.env.ADMIN_EMAIL,
    subject: "Paid order received",
    text: adminText,
  })
    .then(() => {
      console.log("[webhook] Admin notified about paid order", session.id);
    })
    .catch((mailErr) => {
      console.error("[webhook] Failed to send admin mail:", mailErr);
    });

  const userEmail = meta.email && meta.email.trim().toLowerCase();
  if (!userEmail) {
    console.warn("[webhook] No email metadata provided with session - cannot link order to user");
    return { success: false, error: "No email in metadata" };
  }

  let userId = null;
  const { rows: existingUsers } = await pool.query("SELECT id FROM users WHERE email = $1", [userEmail]);
  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
  } else {
    const generatedPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const insertRes = await pool.query(
      `INSERT INTO users (first_name, last_name, phone, email, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        meta.firstName || "",
        meta.lastName || "",
        meta.phone || "",
        userEmail,
        hashedPassword
      ]
    );
    userId = insertRes.rows[0].id;

    sendMail({
      from: `"GIGA STORE" <no-reply@gigastore.com>`,
      to: userEmail,
      subject: "Your new GIGA STORE account",
      text: `Hello ${meta.firstName || ""},

An account has been created for you at GIGA STORE after your recent purchase.

Email: ${userEmail}
Password: ${generatedPassword}`,
    })
      .catch((userMailErr) => {
        console.error("[webhook] Failed to send user account email:", userMailErr);
      });
  }

  let itemsData = [];
  try {
    lineItemsResp = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    const lineItemsToProcess = lineItemsResp.data || [];

    for (const li of lineItemsToProcess) {
      const productId = li.price?.product;
      let imageUrl = null;
      let productTitle = li.description || "";

      if (productId) {
        try {
          const product = await stripe.products.retrieve(productId);
          if (product.images && product.images.length > 0) {
            imageUrl = product.images[0];
          }
          if (product.name) {
            productTitle = product.name;
          }
        } catch (prodErr) {
          console.warn("[webhook] failed to retrieve product:", prodErr);
        }
      }

      itemsData.push({
        title: productTitle,
        quantity: li.quantity || 1,
        price: li.price?.unit_amount ? (li.price.unit_amount / 100).toFixed(2) : "0.00",
        img: imageUrl || "/categories/phones.png"
      });
    }
  } catch (itemsErr) {
    console.error("[webhook] Failed to prepare order items:", itemsErr);
  }

  const calculatedTotal = itemsData.reduce((sum, item) => {
    return sum + (parseFloat(item.price) || 0) * (item.quantity || 0);
  }, 0);
  const finalTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : calculatedTotal.toFixed(2);

  await pool.query(
    "INSERT INTO orders (user_id, items, total, status) VALUES ($1, $2, $3, $4)",
    [userId, JSON.stringify(itemsData), finalTotal, "completed"]
  );
  console.log("[webhook] Stored completed order for user:", userId, "with total:", finalTotal);
  return { success: true, duplicate: false };
}

export async function handleStripeWebhook(req, res) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not set in environment");
    return res.status(500).send("Stripe secret key not configured");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (signature && webhookSecret) {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "", "utf8");
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString("utf8"));
      } else if (typeof req.body === "string") {
        event = JSON.parse(req.body);
      } else if (typeof req.body === "object" && req.body !== null) {
        event = req.body;
      } else {
        throw new Error("Invalid webhook body");
      }
      console.warn("[webhook] Signature verification skipped (missing stripe-signature or STRIPE_WEBHOOK_SECRET)");
    }
  } catch (err) {
    console.error("[webhook] signature verification/parsing failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  res.json({ received: true });

  try {
    console.info(`[webhook] received event type=${event.type}`);
    console.info(`[webhook] session payment_status:`, event.data.object?.payment_status);
    console.info(`[webhook] session metadata:`, event.data.object?.metadata);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      try {
        await processPaidCheckoutSession(stripe, session);
      } catch (procErr) {
        console.error("[webhook] error creating user or storing order:", procErr);
      }
    } else {
      console.log(`[webhook] Unhandled Stripe event type: ${event.type}`);
    }
  } catch (handlerErr) {
    console.error("Error handling webhook event:", handlerErr);
  }
}

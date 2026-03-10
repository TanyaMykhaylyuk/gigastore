import Stripe from "stripe";
import { sendMail } from "../lib/mail.js";
import dotenv from "dotenv";
import pool from "../lib/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
dotenv.config();

export async function handleStripeWebhook(req, res) {
  console.log("[webhook] Headers:", Object.keys(req.headers));
  console.log("[webhook] Body type:", typeof req.body);
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not set in environment");
    return res.status(500).send("Stripe secret key not configured");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    } else if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString());
    } else if (typeof body === 'object') {
      body = body;
    } else {
      throw new Error('Invalid body type');
    }
    
    event = body;
    console.warn("[webhook] Processing event in test mode - SUCCESS");
  } catch (err) {
    console.error("Failed to parse webhook body:", err.message);
    event = req.body;
  }

  res.json({ received: true });

  try {
    console.info(`[webhook] received event type=${event.type}`);
    console.info(`[webhook] session payment_status:`, event.data.object?.payment_status);
    console.info(`[webhook] session metadata:`, event.data.object?.metadata);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const meta = session.metadata || {};

      let itemsText = "No line items available";
      let lineItemsResp = null;
      try {
        lineItemsResp = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
        if (Array.isArray(lineItemsResp.data) && lineItemsResp.data.length > 0) {
          itemsText = lineItemsResp.data
            .map(li => `${li.description || li.price?.product || li.price?.id} — qty: ${li.quantity} — unit_amount: ${li.price?.unit_amount ? (li.price.unit_amount/100).toFixed(2) : "n/a"} ${session.currency ? session.currency.toUpperCase() : ""}`)
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

      try {
        await sendMail({
          from: `"GIGA STORE" <no-reply@gigastore.com>`,
          to: process.env.ADMIN_EMAIL,
          subject: "Paid order received",
          text: adminText,
        });
        console.log("[webhook] Admin notified about paid order", session.id);
      } catch (mailErr) {
        console.error("[webhook] Failed to send admin mail:", mailErr);
      }

      try {
        const userEmail = meta.email && meta.email.trim().toLowerCase();
        let userId = null;
        if (userEmail) {
          const { rows: existingUsers } = await pool.query("SELECT id FROM users WHERE email = $1", [userEmail]);
          if (existingUsers.length > 0) {
            userId = existingUsers[0].id;
          } else {
            const generatedPassword = crypto.randomBytes(6).toString('hex');
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

            try {
              await sendMail({
                from: `"GIGA STORE" <no-reply@gigastore.com>`,
                to: userEmail,
                subject: "Your new GIGA STORE account",
                text: `Hello ${meta.firstName || ""},

An account has been created for you at GIGA STORE after your recent purchase.

Email: ${userEmail}
Password: ${generatedPassword}

Please log in and change your password.`,
              });
            } catch (userMailErr) {
              console.error("[webhook] Failed to send user account email:", userMailErr);
            }
          }

          let itemsData = [];
          try {
            lineItemsResp = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
            const lineItemsToProcess = lineItemsResp.data || [];
            
            console.log("[webhook] Processing line items:", lineItemsToProcess.length);
            
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
            
            console.log("[webhook] Final items data:", JSON.stringify(itemsData, null, 2));
          } catch (itemsErr) {
            console.error("[webhook] Failed to prepare order items:", itemsErr);
          }

          try {
            const calculatedTotal = itemsData.reduce((sum, item) => {
              return sum + (parseFloat(item.price) || 0) * (item.quantity || 0);
            }, 0);
            
            const finalTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : calculatedTotal.toFixed(2);

            await pool.query(
              "INSERT INTO orders (user_id, items, total, status) VALUES ($1, $2, $3, $4)",
              [userId, JSON.stringify(itemsData), finalTotal, "completed"]
            );
            console.log("[webhook] Stored completed order for user:", userId, "with total:", finalTotal);
          } catch (dbErr) {
            console.error("[webhook] Failed to store order in database:", dbErr);
          }
        } else {
          console.warn("[webhook] No email metadata provided with session - cannot link order to user");
        }
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

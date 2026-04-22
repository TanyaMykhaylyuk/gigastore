"use client";

import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";

export default function OrderSuccess() {
  const { clearCart } = useCart();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setSessionId(params.get("session_id"));
    } catch {
      setSessionId(null);
    }
  }, []);

  useEffect(() => {
    try {
      clearCart();
      try { window.dispatchEvent(new Event("cart-changed")); } catch {}
    } catch (e) {
      console.error("Failed to clear cart:", e);
    }

    if (sessionId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/finalize-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => null);
          if (!r.ok) {
            console.error("Finalize checkout failed:", data);
          } else {
            try { window.dispatchEvent(new CustomEvent("orders-need-refresh")); } catch {}
          }
        })
        .catch((err) => {
          console.error("Finalize checkout request error:", err);
        });
    }
  }, [clearCart, sessionId]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Thank you for your order!</h1>
      <p>Payment was successful. We will contact you shortly.</p>
    </main>
  );
}

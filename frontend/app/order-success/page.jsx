"use client";

import { useEffect } from "react";
import { useCart } from "../context/CartContext";

export default function OrderSuccess() {
  const { setCartItems } = useCart();

  useEffect(() => {
    try {
      setCartItems([]);
      try { localStorage.removeItem("cart"); } catch (e) { console.warn("localStorage remove cart failed", e); }
      try { window.dispatchEvent(new Event("cart-changed")); } catch {}
    } catch (e) {
      console.error("Failed to clear cart:", e);
    }
  }, [setCartItems]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Thank you for your order!</h1>
      <p>Payment was successful. We will contact you shortly.</p>
    </main>
  );
}

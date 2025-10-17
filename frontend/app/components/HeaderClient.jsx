"use client";

import { useEffect, useState } from "react";
import { FiShoppingCart, FiUser } from "react-icons/fi";
import { FaWrench } from "react-icons/fa";
import Link from "next/link";
import { useCart } from "../context/CartContext";

export default function HeaderClient() {
  const { cartItems } = useCart();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    try {
      const count = Array.isArray(cartItems) ? cartItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0;
      setCartCount(count);
    } catch (err) {
      setCartCount(0);
    }
  }, [cartItems]);

  return (
    <header className="site-header" role="banner">
      <div className="site-header__left">
        <h1
          className="brand"
          onClick={() => (window.location.href = "/")}
          style={{ cursor: "pointer" }}
        >
          GIGA STORE
        </h1>
      </div>

      <div
        className="site-header__right"
        role="navigation"
        aria-label="Header actions"
      >
        <Link href="/repair" className="btn" title="Repair">
          <FaWrench className="btn-icon" />
          Repair
        </Link>

        <Link href="/account" className="btn" title="Account">
          <FiUser className="btn-icon" />
          Account
        </Link>

        <div style={{ position: "relative", display: "inline-block" }}>
          <Link href="/cart" className="btn btn--cart" title="Cart">
            <FiShoppingCart className="btn-icon" />
            Cart
          </Link>

          {cartCount > 0 && (
            <span
              aria-live="polite"
              style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                background: "#ff3b30",
                borderRadius: "50%",
                padding: "3px 7px",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                lineHeight: 1,
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              {cartCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

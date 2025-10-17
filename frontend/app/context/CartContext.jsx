"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) setCartItems(JSON.parse(stored));
    } catch (e) {
      console.warn("[Cart] restore failed:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    } catch (e) {
      console.warn("[Cart] persist failed:", e);
    }
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const exists = prev.find((it) => String(it.id) === String(product.id));
      if (exists) {
        const next = prev.map((it) =>
          String(it.id) === String(product.id)
            ? { ...it, quantity: (Number(it.quantity) || 0) + 1 }
            : it
        );
        return next;
      } else {
        const toStore = {
          id: product.id,
          title: product.title,
          price: product.price,
          img: product.img,
          quantity: 1,
        };
        return [...prev, toStore];
      }
    });
  };

  const updateQuantity = (id, qty) => {
    setCartItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: qty } : it)));
  };

  const normalizeQuantity = (id) => {
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const q = parseInt(it.quantity, 10);
        const final = Number.isInteger(q) && q > 0 ? q : 1;
        return { ...it, quantity: final };
      })
    );
  };

  const removeItem = (id) => setCartItems((prev) => prev.filter((it) => it.id !== id));

  const computeTotal = () =>
    cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      return sum + price * qty;
    }, 0);

  const value = useMemo(
    () => ({ cartItems, setCartItems, addToCart, updateQuantity, normalizeQuantity, removeItem, computeTotal }),
    [cartItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

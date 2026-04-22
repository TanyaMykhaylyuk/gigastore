"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem("cart");
      if (stored) {
        const parsedCart = JSON.parse(stored);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          setCartItems(parsedCart);
        }
      }
    } catch (e) {
      console.warn("[Cart] restore failed:", e);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    try {
      if (cartItems.length === 0) {
        localStorage.removeItem("cart");
      } else {
        const currentCart = localStorage.getItem("cart");
        if (!currentCart || JSON.stringify(cartItems) !== currentCart) {
          localStorage.setItem("cart", JSON.stringify(cartItems));
        }
      }
    } catch (e) {
      console.warn("[Cart] persist failed:", e);
    }
  }, [cartItems, isClient]);

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

  const removeItem = (id) => setCartItems((prev) => prev.filter((it) => it.id !== id));

  const clearCart = useCallback(() => {
    setCartItems([]);
    try {
      localStorage.removeItem("cart");
    } catch (e) {
      console.warn("[Cart] clear failed:", e);
    }
  }, []);

  const computeTotal = () =>
    cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      return sum + price * qty;
    }, 0);

  const value = useMemo(
    () => ({ cartItems, setCartItems, addToCart, removeItem, clearCart, computeTotal }),
    [cartItems, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

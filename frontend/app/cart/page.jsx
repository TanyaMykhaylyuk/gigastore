"use client";

import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import "../styles/cart.css";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d+$/;

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function CartPage() {
  const { cartItems, addToCart, updateQuantity, normalizeQuantity, removeItem, computeTotal, setCartItems } = useCart();
  const { token, user, setUserField, displayName } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("crimson");
  const [sending, setSending] = useState(false);

  const pickField = (obj, keys) => {
    if (!obj) return "";
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const v = obj[k];
        if (typeof v === "string" && v.trim()) return v.trim();
        if (typeof v === "number") return String(v);
      }
    }
    return "";
  };

  useEffect(() => {
    let mounted = true;
    setIsLoggedIn(!!token);

    const fillFromUserLike = (u) => {
      if (!mounted) return;

      const firstKeys = ["firstName", "firstname", "givenName", "given_name", "givenname"];
      const lastKeys = ["lastName", "lastname", "familyName", "surname", "sur_name", "family_name"];
      const phoneKeys = ["phone", "phoneNumber", "phone_number", "tel", "mobile"];
      const emailKeys = ["email", "mail"];

      const first = pickField(u, firstKeys);
      const last = pickField(u, lastKeys);
      const ph = pickField(u, phoneKeys);
      const em = pickField(u, emailKeys);

      let finalFirst = first || "";
      let finalLast = last || "";
      if ((!finalFirst || !finalLast) && displayName) {
        const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
        if (parts.length > 0 && !finalFirst) finalFirst = parts[0];
        if (parts.length > 1 && !finalLast) finalLast = parts.slice(1).join(" ");
      }

      setFirstName(finalFirst);
      setLastName(finalLast);
      setPhone(ph || "");
      setEmail(em || "");
    };

    if (token) {
      const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/auth/profile`;
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (res) => {
          if (!mounted) return;
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success && data.user) {
            fillFromUserLike(data.user);
          } else {
            fillFromUserLike(user || {});
          }
        })
        .catch((err) => {
          console.warn("[Cart] profile fetch failed:", err);
          if (!mounted) return;
          fillFromUserLike(user || {});
        });

      return () => { mounted = false; };
    }

    fillFromUserLike(user || {});
    return () => { mounted = false; };
  }, [token, user, displayName]);

  const validateCartClient = () => {
    const errors = {};
    if (!address.trim()) errors.address = "Shipping address is required.";
    if (!firstName.trim()) errors.firstName = "First name is required.";
    if (!lastName.trim()) errors.lastName = "Last name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    else if (!emailRe.test(email.trim())) errors.email = "Invalid email format.";
    if (!phone.trim()) errors.phone = "Phone number is required.";
    else if (!phoneRe.test(phone.trim())) errors.phone = "Phone must contain digits only.";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setFieldErrors({});

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      setMessage("Your cart is empty.");
      setMessageColor("crimson");
      return;
    }

    const errors = validateCartClient();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("Please fix form errors.");
      setMessageColor("crimson");
      return;
    }

    const normalizedCartItems = cartItems.map(ci => ({ ...ci, quantity: Math.max(1, parseInt(ci.quantity, 10) || 1) }));

    setCartItems(normalizedCartItems);

    const orderData = {
      cartItems: normalizedCartItems,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
    };

    setSending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Create session error:", data);
        setMessage(data.error || "Failed to create checkout session.");
        setMessageColor("crimson");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (error) {
        console.error("Stripe redirect error:", error);
        setMessage(error.message || "Stripe redirect failed");
        setMessageColor("crimson");
      }
    } catch (err) {
      console.error("Request failed:", err);
      setMessage("Network error. Please try again.");
      setMessageColor("crimson");
    } finally {
      setSending(false);
    }
  };

  const onFirstNameChange = (v) => {
    setFirstName(v);
    setUserField("firstName", v);
  };
  const onLastNameChange = (v) => {
    setLastName(v);
    setUserField("lastName", v);
  };
  const onPhoneChange = (v) => {
    setPhone(v);
    setUserField("phone", v);
  };
  const onEmailChange = (v) => {
    setEmail(v);
    setUserField("email", v);
  };

  return (
    <main className="page-root" style={{ padding: "20px" }}>
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        <div className="cart-items" style={{ flex: 1 }}>
          {(!Array.isArray(cartItems) || cartItems.length === 0) ? (
            <p>Your cart is empty.</p>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="product-card"
                style={{
                  marginBottom: "15px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  className="product-image"
                  style={{ flex: "0 0 80px", marginRight: "10px" }}
                >
                  <img
                    src={item.img || "/categories/phones.png"}
                    alt={item.title}
                    style={{
                      maxWidth: "80px",
                      maxHeight: "80px",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="product-title">{item.title}</h3>
                  <div className="product-price">{item.price} $</div>
                  <div style={{ marginTop: "8px" }}>
                    <label>
                      Quantity:
                      <input
                        type="number"
                        min="1"
                        className="qty-input"
                        value={item.quantity ?? ""}
                        onChange={(e) => updateQuantity(item.id, e.target.value)}
                        onBlur={() => normalizeQuantity(item.id)}
                        style={{ width: "70px", marginLeft: "8px" }}
                      />
                    </label>
                    <button
                      type="button"
                      className="remove-btn"
                      style={{ marginLeft: "10px" }}
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 16, padding: "10px", borderTop: "1px solid #ddd" }}>
          <strong>Total:</strong> {computeTotal().toFixed(2)} $
        </div>

        <div className="checkout-form cart-summary" style={{ flex: 1 }}>
          {orderPlaced ? (
            <div>
              <h2>Thank you for your order!</h2>
              <p>Your order has been placed. We will contact you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2>Checkout</h2>

              {message && <div style={{ marginBottom: 12, color: messageColor }}>{message}</div>}

              <label>
                Shipping Address:<br />
                <textarea
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: "100%", height: "60px", marginTop: "4px" }}
                />
                {fieldErrors.address && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.address}</div>}
              </label>

              <label>
                First Name:<br />
                <input
                  type="text"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => onFirstNameChange(e.target.value)}
                  style={{ marginTop: "4px", width: "100%" }}
                />
                {fieldErrors.firstName && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.firstName}</div>}
              </label>

              <label>
                Last Name:<br />
                <input
                  type="text"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => onLastNameChange(e.target.value)}
                  style={{ marginTop: "4px", width: "100%" }}
                />
                {fieldErrors.lastName && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.lastName}</div>}
              </label>

              <label>
                Phone Number:<br />
                <input
                  type="tel"
                  name="phone"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  style={{ marginTop: "4px", width: "100%" }}
                />
                {fieldErrors.phone && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.phone}</div>}
              </label>

              <label>
                Email:<br />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  style={{ marginTop: "4px", width: "100%" }}
                />
                {fieldErrors.email && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.email}</div>}
              </label>

              <button
                type="submit"
                className="submit-btn"
                style={{ marginTop: "12px" }}
                disabled={sending}
              >
                {sending ? "Processing..." : "Pay"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

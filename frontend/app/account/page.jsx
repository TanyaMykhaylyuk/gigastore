"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "../styles/account.css";
import { useAuth } from "../context/AuthContext";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d+$/;
const passwordRe = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

function looksLikeEmail(v) {
  return typeof v === "string" && v.includes("@");
}

function parseFullName(full) {
  if (!full || typeof full !== "string") return { first: "", last: "" };
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export default function AccountPage() {
  const router = useRouter();
  const sectionRef = useRef(null);
  const emailInputRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("crimson");
  const [fieldErrors, setFieldErrors] = useState({});
  const [sending, setSending] = useState(false);

  const { token, user, isAuthenticated, setAuthFromResponse, logout, displayName } = useAuth();

  const [orders, setOrders] = useState([]);

  const computedName = useMemo(() => {
    if (displayName && String(displayName).trim()) return String(displayName).trim();

    if (user && typeof user.firstName === "string" && user.firstName.trim()) return user.firstName.trim();

    const possible = (user && (user.name || user.fullName || user.displayName)) || "";
    if (possible && typeof possible === "string" && possible.trim() && !looksLikeEmail(possible)) {
      const p = parseFullName(possible);
      return p.first || p.last || "";
    }

    try {
      const storedFirst = localStorage.getItem("giga_user_firstName");
      if (storedFirst && String(storedFirst).trim()) return String(storedFirst).trim();
      const storedUser = localStorage.getItem("giga_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.firstName && String(parsed.firstName).trim()) return String(parsed.firstName).trim();

        if (parsed && parsed.name && typeof parsed.name === "string" && !looksLikeEmail(parsed.name)) {
          const p = parseFullName(parsed.name);
          return p.first || p.last || "";
        }
      }
    } catch (e) {
    }

    return ""; 
  }, [displayName, user]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isAuthenticated && isLogin) {
      const timer = setTimeout(() => {
        const el = emailInputRef.current;
        if (el && typeof el.focus === "function") {
          el.focus();
        }
      }, 80);

      return () => clearTimeout(timer);
    }
    return;
  }, [isLogin, isAuthenticated]);

  useEffect(() => {
    if (!token) return;

    const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/auth/profile`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          logout();
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.success && data.user) {
          setAuthFromResponse({ token, user: data.user });
        }
      })
      .catch((err) => {
        console.error("Profile fetch error:", err);
      });
  }, [token, logout, setAuthFromResponse]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOrders([]);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setOrders(data.orders || []);
      } else {
        console.error("Failed to fetch orders", data);
        setOrders([]);
      }
    })
    .catch((err) => {
      console.error("Orders fetch error:", err);
      setOrders([]);
    });
  }, [isAuthenticated, token]);

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
    setMessage("");
    setFieldErrors((fe) => ({ ...fe, [e.target.name]: undefined }));
  };

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", phone: "", email: "", password: "", confirmPassword: "" });
    setFieldErrors({});
    setMessage("");
    setMessageColor("crimson");
  };

  const toggleMode = () => {
    setIsLogin(v => !v);
    resetForm();
  };

  const validateRegisterClient = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required.";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
    if (!formData.email.trim()) errors.email = "Email is required.";
    else if (!emailRe.test(formData.email.trim())) errors.email = "Invalid email format.";
    if (formData.phone && !phoneRe.test(formData.phone.trim())) errors.phone = "Phone must contain digits only.";
    if (!formData.password) errors.password = "Password is required.";
    else if (!passwordRe.test(formData.password)) errors.password = "Password must be at least 6 characters and include letters and digits.";
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match.";
    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageColor("crimson");
    const errors = validateRegisterClient();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("Please fix form errors.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        })
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        resetForm();
        setIsLogin(true);
        setMessageColor("lime");
        setMessage("Registration successful! Please log in.");
      } else {
        setMessage(body.error || "Registration failed.");
        setMessageColor("crimson");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setMessage("Network or server error.");
      setMessageColor("crimson");
    } finally {
      setSending(false);
    }
  };

  const validateLoginClient = () => {
    const errors = {};
    if (!formData.email.trim()) errors.email = "Email is required.";
    else if (!emailRe.test(formData.email.trim())) errors.email = "Invalid email format.";
    if (!formData.password) errors.password = "Password is required.";
    return errors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageColor("crimson");
    const errors = validateLoginClient();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("Please fix form errors.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        })
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setAuthFromResponse({ token: body.token, user: body.user || {} });
        setFormData({ firstName: "", lastName: "", phone: "", email: "", password: "", confirmPassword: "" });
        setFieldErrors({});
      } else {
        setMessage(body.error || "Invalid credentials.");
        setMessageColor("crimson");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("Network or server error.");
      setMessageColor("crimson");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <section ref={sectionRef} className="trade-in-section account-section" aria-labelledby="account-title">
      <img src="/Trade/Trade1.png" alt="Decor left" className={`img-left ${visible ? "slide-in" : ""}`} aria-hidden="true" />
      <img src="/Trade/Trade2.png" alt="Decor right" className={`img-right ${visible ? "slide-in" : ""}`} aria-hidden="true" />

      <div className={`trade-form-container ${visible ? "slide-in" : ""}`} role="region" aria-live="polite">
        {isAuthenticated ? (
          <div className="account-auth-wrap">
            <div className="account-auth-header">
              <h2 style={{ margin: 0 }}>{(computedName || "User") + ", your orders:"}</h2>
              <button
                onClick={handleLogout}
                className="submit-btn logout-btn"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>

            <div className="orders-scroll" role="list" aria-label="Your orders">
              {orders.length > 0 ? (
                orders.map(order => (
                  <div key={order.id} className="order-card" role="listitem">
                    <div className="order-meta">Order #{order.id} — {new Date(order.created_at).toLocaleString()}</div>

                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="order-item">
                          <div className="order-item-image">
                            <img
                              src={item.img || "/categories/phones.png"}
                              alt={item.title || "Product image"}
                              width={80}
                              height={80}
                              loading="lazy"
                            />
                          </div>
                          <div className="order-item-body">
                            <div className="order-item-title">{item.title}</div>
                            <div className="order-item-note">Order accepted. Shipping within 1-3 days.</div>
                          </div>
                          <div className="order-item-right">
                            <div className="order-item-price">{(parseFloat(item.price) || 0).toFixed(2)} $</div>
                            <div className="order-item-qty">Qty: {item.quantity}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-items">No items in this order.</div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: 12 }}>No orders found.</div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h2 id="account-title" style={{ margin: 0 }}>{isLogin ? "Login" : "Register"}</h2>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { if (!isLogin) toggleMode(); }}
                  className="submit-btn"
                  style={{ padding: "8px 12px", fontSize: 14, borderRadius: 8, background: isLogin ? "var(--neon)" : "transparent", color: isLogin ? "#000" : "var(--white)" }}
                >
                  Login
                </button>
                <button
                  onClick={() => { if (isLogin) toggleMode(); }}
                  className="submit-btn"
                  style={{ padding: "8px 12px", fontSize: 14, borderRadius: 8, background: !isLogin ? "var(--neon)" : "transparent", color: !isLogin ? "#000" : "var(--white)" }}
                >
                  Register
                </button>
              </div>
            </div>

            {message && (
              <div style={{ marginBottom: 12, color: messageColor }}>
                {message}
              </div>
            )}

            {isLogin ? (
              <form onSubmit={handleLogin} noValidate>
                <label>
                  Email:<br />
                  <input ref={emailInputRef} type="email" name="email" value={formData.email} onChange={handleChange} required />
                  {fieldErrors.email && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.email}</div>}
                </label>

                <label>
                  Password:<br />
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                  {fieldErrors.password && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.password}</div>}
                </label>

                <button type="submit" className="submit-btn" disabled={sending} aria-disabled={sending ? "true" : "false"}>
                  {sending ? "Logging in..." : "Login"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} noValidate>
                <label>
                  First Name:<br />
                  <input name="firstName" value={formData.firstName} onChange={handleChange} required />
                  {fieldErrors.firstName && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.firstName}</div>}
                </label>

                <label>
                  Last Name:<br />
                  <input name="lastName" value={formData.lastName} onChange={handleChange} required />
                  {fieldErrors.lastName && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.lastName}</div>}
                </label>

                <label>
                  Phone Number:<br />
                  <input name="phone" value={formData.phone} onChange={handleChange} />
                  {fieldErrors.phone && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.phone}</div>}
                </label>

                <label>
                  Email:<br />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                  {fieldErrors.email && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.email}</div>}
                </label>

                <label>
                  Password:<br />
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                  {fieldErrors.password && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.password}</div>}
                </label>

                <label>
                  Confirm Password:<br />
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                  {fieldErrors.confirmPassword && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.confirmPassword}</div>}
                </label>

                <button type="submit" className="submit-btn" disabled={sending} aria-disabled={sending ? "true" : "false"}>
                  {sending ? "Registering..." : "Register"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}

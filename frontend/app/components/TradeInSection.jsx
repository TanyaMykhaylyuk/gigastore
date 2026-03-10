"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function TradeInSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const { token, user, displayName } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    model: "",
    memory: "",
    visualCondition: "good",
    technicalCondition: "working",
  });

  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverMessage, setServerMessage] = useState(null);

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

    const fillFromUserLike = (u) => {
      if (!mounted) return;

      const firstKeys = ["firstName", "firstname", "givenName", "given_name", "givenname"];
      const lastKeys = ["lastName", "lastname", "familyName", "surname", "sur_name", "family_name"];
      const phoneKeys = ["phone", "phoneNumber", "phone_number", "tel", "mobile"];

      const first = pickField(u, firstKeys);
      const last = pickField(u, lastKeys);
      const phone = pickField(u, phoneKeys);

      let finalFirst = first || "";
      let finalLast = last || "";
      if ((!finalFirst || !finalLast) && displayName) {
        const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
        if (parts.length > 0 && !finalFirst) finalFirst = parts[0];
        if (parts.length > 1 && !finalLast) finalLast = parts.slice(1).join(" ");
      }

      setFormData((s) => ({
        ...s,
        firstName: finalFirst,
        lastName: finalLast,
        phone: phone || "",
      }));
    };

    if (!token) {
      fillFromUserLike(user || {});
      return () => {
        mounted = false;
      };
    }

    const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/auth/profile`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!mounted) return;
        if (!res.ok) {
          fillFromUserLike(user || {});
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.success && data.user) {
          fillFromUserLike(data.user);
        } else {
          fillFromUserLike(user || {});
        }
      })
      .catch(() => {
        if (!mounted) return;
        fillFromUserLike(user || {});
      });

    return () => {
      mounted = false;
    };
  }, [token, user, displayName]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const cp = { ...prev };
      delete cp[name];
      return cp;
    });
  };

  const validatePhone = (value) => {
    if (!value || typeof value !== "string") return { valid: false };
    const trimmed = value.trim();
    if (/[a-zA-Z]/.test(trimmed)) return { valid: false, msg: "Phone must not contain letters." };
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 7) return { valid: false, msg: "Phone must have at least 7 digits." };
    if (digits.length > 15) return { valid: false, msg: "Phone number is too long." };
    return { valid: true };
  };

  const validate = (data) => {
    const e = {};
    if (!data.firstName?.trim()) e.firstName = "First name is required.";
    else if (data.firstName.length > 100) e.firstName = "First name is too long.";
    if (!data.lastName?.trim()) e.lastName = "Last name is required.";
    else if (data.lastName.length > 100) e.lastName = "Last name is too long.";
    if (!data.phone?.trim()) e.phone = "Phone number is required.";
    else {
      const ph = validatePhone(data.phone);
      if (!ph.valid) e.phone = ph.msg;
    }
    if (!data.model?.trim()) e.model = "Phone model is required.";
    else if (data.model.length > 100) e.model = "Model name is too long.";
    if (!data.memory?.trim()) e.memory = "Memory capacity is required.";
    else if (data.memory.length > 50) e.memory = "Memory value is too long.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (sending) return;

    setServerMessage(null);

    const trimmed = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      model: formData.model.trim(),
      memory: formData.memory.trim(),
      visualCondition: formData.visualCondition,
      technicalCondition: formData.technicalCondition,
    };

    const v = validate(trimmed);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      const first = Object.keys(v)[0];
      const el = document.querySelector(`[name="${first}"]`);
      if (el) el.focus();
      return;
    }

    setSending(true);
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim()) || window.location.origin;
      const url = `${apiBase.replace(/\/+$/,"")}/tradein`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmed),
      });

      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitted(true);
        setFormData({
          firstName: "",
          lastName: "",
          phone: "",
          model: "",
          memory: "",
          visualCondition: "good",
          technicalCondition: "working",
        });
        setErrors({});
        if (body?.warning) {
          setServerMessage("Request stored, but email notification failed (admin will be informed).");
        } else {
          setServerMessage("Request sent successfully.");
        }
      } else {
        let body = {};
        try {
          body = await res.json();
        } catch (e) {
          body = { message: `HTTP ${res.status}` };
        }
        console.error("Server error:", body);
        setServerMessage("Server error while submitting form. Please try again later.");
      }
    } catch (err) {
      console.error("Request failed:", err);
      setServerMessage("Network error while submitting form. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section ref={sectionRef} className="trade-in-section" aria-labelledby="tradein-title">
      <img
        src="/Trade/Trade1.png"
        alt="Trade Image 1"
        className={`img-left ${visible ? "slide-in" : ""}`}
        aria-hidden="true"
      />
      <img
        src="/Trade/Trade2.png"
        alt="Trade Image 2"
        className={`img-right ${visible ? "slide-in" : ""}`}
        aria-hidden="true"
      />

      <div className={`trade-form-container ${visible ? "slide-in" : ""}`} role="region" aria-live="polite">
        <h2 id="tradein-title">Trade-In</h2>

        {serverMessage && (
          <div role="status" style={{ marginBottom: 10, color: serverMessage.includes("success") ? "green" : "crimson" }}>
            {serverMessage}
          </div>
        )}

        {!submitted ? (
          <form onSubmit={handleSubmit} noValidate>
            <div className="user-info">
              <label>
                First Name:<br />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.firstName ? "true" : "false"}
                  aria-describedby={errors.firstName ? "err-firstName" : undefined}
                />
              </label>
              {errors.firstName && (
                <div id="err-firstName" role="alert" style={{ color: "crimson", marginTop: 6 }}>
                  {errors.firstName}
                </div>
              )}

              <label>
                Last Name:<br />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.lastName ? "true" : "false"}
                  aria-describedby={errors.lastName ? "err-lastName" : undefined}
                />
              </label>
              {errors.lastName && (
                <div id="err-lastName" role="alert" style={{ color: "crimson", marginTop: 6 }}>
                  {errors.lastName}
                </div>
              )}

              <label>
                Phone Number:<br />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.phone ? "true" : "false"}
                  aria-describedby={errors.phone ? "err-phone" : undefined}
                />
              </label>
              {errors.phone && (
                <div id="err-phone" role="alert" style={{ color: "crimson", marginTop: 6 }}>
                  {errors.phone}
                </div>
              )}
            </div>

            <div className="device-info">
              <label>
                Phone Model:<br />
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.model ? "true" : "false"}
                  aria-describedby={errors.model ? "err-model" : undefined}
                />
              </label>
              {errors.model && (
                <div id="err-model" role="alert" style={{ color: "crimson", marginTop: 6 }}>
                  {errors.model}
                </div>
              )}

              <label>
                Memory Capacity:<br />
                <input
                  type="text"
                  name="memory"
                  value={formData.memory}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.memory ? "true" : "false"}
                  aria-describedby={errors.memory ? "err-memory" : undefined}
                />
              </label>
              {errors.memory && (
                <div id="err-memory" role="alert" style={{ color: "crimson", marginTop: 6 }}>
                  {errors.memory}
                </div>
              )}

              <label>
                Visual Condition:<br />
                <select name="visualCondition" value={formData.visualCondition} onChange={handleChange}>
                  <option value="good">Good (minor scratches or chips)</option>
                  <option value="excellent">Excellent (no scratches)</option>
                </select>
              </label>

              <label>
                Technical Condition:<br />
                <select name="technicalCondition" value={formData.technicalCondition} onChange={handleChange}>
                  <option value="faulty">Faulty (some part not working)</option>
                  <option value="working">Works (everything works)</option>
                </select>
              </label>
            </div>

            <button type="submit" className="submit-btn" disabled={sending} aria-disabled={sending ? "true" : "false"}>
              {sending ? "Sending..." : "Exchange for New"}
            </button>
          </form>
        ) : (
          <div style={{ padding: 12 }}>
            <p>Your request has been received. Our administrator will contact you soon.</p>
            <button className="submit-btn" onClick={() => { setSubmitted(false); setServerMessage(null); }} style={{ marginTop: 12 }}>
              Send another request
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import "../styles/repair.css";
import { useAuth } from "../context/AuthContext";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d+$/;

export default function RepairPage() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const { token, user, isAuthenticated, displayName } = useAuth();

  const [devices, setDevices] = useState({
    phone: false,
    tablet: false,
    headphones: false,
    smartwatch: false,
    computer: false,
  });
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [requestPlaced, setRequestPlaced] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("crimson");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (mounted) setIsLoggedIn(!!isAuthenticated);

    const ctxPhone = user?.phone || "";
    const ctxEmail = user?.email || "";

    if (mounted) {
      setPhone(ctxPhone);
      setEmail(ctxEmail);
    }
    return () => {
      mounted = false;
    };
  }, [user, isAuthenticated, displayName]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleCheckbox = (e) => {
    const { name, checked } = e.target;
    setDevices((prev) => ({ ...prev, [name]: checked }));
  };

  const validateRepairClient = () => {
    const errors = {};
    const selectedDevices = Object.entries(devices).filter(([_, val]) => val);
    if (selectedDevices.length === 0) errors.devices = "Please select at least one device.";
    if (!model.trim()) errors.model = "Device model is required.";
    if (!description.trim()) errors.description = "Problem description is required.";
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
    const errors = validateRepairClient();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("Please fix form errors.");
      setMessageColor("crimson");
      return;
    }

    const selectedDevices = Object.entries(devices)
      .filter(([_, val]) => val)
      .map(([key]) => {
        if (key === "smartwatch") return "Smart Watch";
        if (key === "headphones") return "Headphones";
        if (key === "computer") return "Computer";
        return key.charAt(0).toUpperCase() + key.slice(1);
      });

    const requestData = { devices: selectedDevices, model, description, phone, email };

    setSending(true);
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim()) || window.location.origin;
      const url = `${apiBase.replace(/\/+$/,"")}/repair`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(requestData),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (err) {
        data = {};
      }

      if (res.ok) {
        setRequestPlaced(true);
        setMessageColor("green");
        setMessage("Repair request sent. Administrator will contact you.");
      } else {
        const serverMsg = data?.error || data?.message || data?.warning || `Failed to send repair request (HTTP ${res.status})`;
        setMessage(serverMsg);
        setMessageColor("crimson");
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessage("Network error. Please check connection and try again.");
      setMessageColor("crimson");
    } finally {
      setSending(false);
    }
  };

  if (requestPlaced) {
    return (
      <main className="page-root" style={{ padding: "20px" }}>
        <h2>Your repair request for {model || "device"} has been received.</h2>
        <p>The administrator will contact you soon.</p>
      </main>
    );
  }

  return (
    <main className="page-root">
      <section ref={sectionRef} className="trade-in-section">
        <img
          src="/repair/repair.png"
          alt="Decor left"
          className={`img-left ${visible ? "slide-in" : ""}`}
          aria-hidden="true"
        />

        <div className={`trade-form-container ${visible ? "slide-in" : ""}`}>
          <h2>Repair Request</h2>

          {message && <div style={{ marginBottom: 12, color: messageColor }}>{message}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <label>Devices to Repair:</label>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
              {["phone","tablet","headphones","smartwatch","computer"].map((dev) => (
                <label key={dev}>
                  <input type="checkbox" name={dev} checked={devices[dev]} onChange={handleCheckbox} />{" "}
                  {dev.charAt(0).toUpperCase() + dev.slice(1)}
                </label>
              ))}
            </div>
            {fieldErrors.devices && <div style={{ color: "crimson", marginBottom: 10 }}>{fieldErrors.devices}</div>}

            <label>
              Model:<br />
              <input type="text" name="model" value={model} onChange={(e) => setModel(e.target.value)} />
              {fieldErrors.model && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.model}</div>}
            </label>

            <label>
              Problem Description:<br />
              <textarea
                name="description"
                className="description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {fieldErrors.description && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.description}</div>}
            </label>

            <label>
              Phone Number:<br />
              <input type="tel" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {fieldErrors.phone && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.phone}</div>}
            </label>

            <label>
              Email Address:<br />
              <input type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              {fieldErrors.email && <div style={{ color: "crimson", marginTop: 6 }}>{fieldErrors.email}</div>}
            </label>

            <button type="submit" className="submit-btn" disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";

const AuthContext = createContext(null);

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "";
}

function looksLikeEmail(v) {
  return typeof v === "string" && v.includes("@");
}

function extractNameParts(u) {
  if (!u || typeof u !== "object") return { firstName: "", lastName: "" };

  const pick = (keys) => {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(u, k)) {
        const v = u[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
    return "";
  };

  const firstCandidate = pick(["firstName", "firstname", "givenName", "given_name", "givenname", "given"]);
  const lastCandidate = pick(["lastName", "lastname", "familyName", "surname", "sur_name", "family_name", "family"]);

  if (firstCandidate || lastCandidate) {
    return {
      firstName: firstCandidate || "",
      lastName: lastCandidate || ""
    };
  }

  const fullCandidate = pick(["name", "fullName", "displayName", "fullname", "username", "userName"]);
  if (fullCandidate && !looksLikeEmail(fullCandidate)) {
    const parts = fullCandidate.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }

  return { firstName: "", lastName: "" };
}

function hasAnyUserField(u) {
  if (!u) return false;
  return isNonEmptyString(u.firstName) || isNonEmptyString(u.lastName) || isNonEmptyString(u.phone) || isNonEmptyString(u.email);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const lastAppliedRef = useRef(null);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("giga_user");
      if (storedToken) {
        setToken(storedToken);
        setIsAuthenticated(true);
        console.info("[Auth] token restored from localStorage");
      }
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser({
          firstName: parsed.firstName || "",
          lastName: parsed.lastName || "",
          phone: parsed.phone || "",
          email: parsed.email || "",
        });
        console.info("[Auth] user restored from localStorage:", parsed);
      }
    } catch (err) {
      console.warn("[Auth] restore failed:", err);
    }

    const onAuthChanged = (ev) => {
      try {
        const detail = ev?.detail || {};
        if (detail?.reload) {
          window.location.reload();
          return;
        }
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("giga_user");
        setToken(storedToken || null);
        setIsAuthenticated(!!storedToken);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser({
            firstName: parsed.firstName || "",
            lastName: parsed.lastName || "",
            phone: parsed.phone || "",
            email: parsed.email || "",
          });
        } else {
          setUser({ firstName: "", lastName: "", phone: "", email: "" });
        }
      } catch (e) {
        console.warn("[Auth] onAuthChanged handler error:", e);
      }
    };

    window.addEventListener("auth-changed", onAuthChanged);
    return () => window.removeEventListener("auth-changed", onAuthChanged);
  }, []);

  const safeMergeUser = (existing, incoming) => {
    if (!incoming) return existing;

    const nameParts = extractNameParts(incoming);

    const normalized = {
      firstName: isNonEmptyString(incoming.firstName) ? incoming.firstName.trim() : nameParts.firstName || "",
      lastName: isNonEmptyString(incoming.lastName) ? incoming.lastName.trim() : nameParts.lastName || "",
      phone: isNonEmptyString(incoming.phone) ? incoming.phone.trim() : (isNonEmptyString(incoming.phoneNumber) ? incoming.phoneNumber.trim() : ""),
      email: isNonEmptyString(incoming.email) ? incoming.email.trim() : "",
    };

    return {
      firstName: isNonEmptyString(normalized.firstName) ? normalized.firstName : (existing.firstName || ""),
      lastName: isNonEmptyString(normalized.lastName) ? normalized.lastName : (existing.lastName || ""),
      phone: isNonEmptyString(normalized.phone) ? normalized.phone : (existing.phone || ""),
      email: isNonEmptyString(normalized.email) ? normalized.email : (existing.email || ""),
    };
  };

  const setAuthFromResponse = ({ token: t, user: u }) => {
    try {
      const incomingHasUserFields = hasAnyUserField(u);

   const parsedName = extractNameParts(u || {});
      const canonical = JSON.stringify({
        token: t || null,
        hasUserFields: incomingHasUserFields,
        firstName: isNonEmptyString(u?.firstName) ? u.firstName.trim() : (parsedName.firstName || null),
      });

      if (lastAppliedRef.current === canonical) {
        console.info("[Auth] setAuthFromResponse called but payload canonical identical — skipping");
        return;
      }
      lastAppliedRef.current = canonical;

      const stack = new Error().stack;
      console.info("[Auth] setAuthFromResponse applied – payload canonical:", canonical, "\ncaller stack:", stack);

      if (t) {
        setToken(t);
        try { localStorage.setItem("token", t); } catch (e) { console.warn("[Auth] can't persist token:", e); }
      }

      if (incomingHasUserFields || (u && Object.keys(u).length > 0)) {
        setUser((prev) => {
          const merged = safeMergeUser(prev, u || {});
          try {
            localStorage.setItem("giga_user", JSON.stringify(merged));
            if (isNonEmptyString(merged.firstName)) {
              localStorage.setItem("giga_user_firstName", merged.firstName);
            }
          } catch (e) {
            console.warn("[Auth] can't persist user:", e);
          }
          console.info("[Auth] user stored (merged):", merged);
          return merged;
        });
      } else {
        console.info("[Auth] incoming user payload empty — skipping user overwrite");
      }

      setIsAuthenticated(true);
      setShowWelcome(true);

      try { window.dispatchEvent(new CustomEvent("auth-changed", { detail: { isAuthenticated: true } })); } catch {}
    } catch (err) {
      console.error("[Auth] setAuthFromResponse failed:", err);
    }
  };

  const logout = () => {
    try {
      setToken(null);
      setUser({ firstName: "", lastName: "", phone: "", email: "" });
      setIsAuthenticated(false);
      setShowWelcome(false);

      try {
        localStorage.removeItem("token");
        localStorage.removeItem("giga_user");
        localStorage.removeItem("giga_user_firstName");
        localStorage.removeItem("giga_show_welcome");
        console.info("[Auth] cleared localStorage auth keys");
      } catch (e) {
        console.warn("[Auth] error clearing storage:", e);
      }

      lastAppliedRef.current = null;

      try { window.dispatchEvent(new CustomEvent("auth-changed", { detail: { isAuthenticated: false, reload: true } })); } catch {}
      setTimeout(() => window.location.reload(), 60);
    } catch (e) {
      console.warn("[Auth] logout error:", e);
      try { window.location.reload(); } catch {}
    }
  };

  const setUserField = (key, value) => {
    setUser((s) => {
      const next = { ...s, [key]: value };
      try {
        localStorage.setItem("giga_user", JSON.stringify(next));
        if (key === "firstName") localStorage.setItem("giga_user_firstName", value || "");
      } catch {}
      return next;
    });
  };

  const triggerWelcome = () => setShowWelcome(true);
  const clearWelcome = () => {
    setShowWelcome(false);
    try { localStorage.removeItem("giga_show_welcome"); } catch {}
  };

 const getDisplayName = (u) => {
    if (!u) return "";
    const f = (s) => (typeof s === "string" ? s.trim() : "");
    const first = f(u.firstName);
    const last = f(u.lastName);
    const phone = f(u.phone);

    if (first) return first + (last ? ` ${last}` : "");
    if (last) return last;
    if (phone) return phone;
    return ""; 
  };

  const displayName = useMemo(() => getDisplayName(user), [user]);

  const value = useMemo(
    () => ({ token, user, isAuthenticated, setAuthFromResponse, logout, setUserField, showWelcome, triggerWelcome, clearWelcome, displayName }),
    [token, user, isAuthenticated, showWelcome, displayName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

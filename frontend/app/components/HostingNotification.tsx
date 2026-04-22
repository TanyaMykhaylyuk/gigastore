"use client";

import { useState, useEffect } from "react";

export default function HostingNotification() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const INACTIVITY_MS = 15 * 60 * 1000;
    const LAST_ACTIVE_KEY = "hosting_last_active_at";
    const LAST_NOTICE_KEY = "hosting_last_notice_at";

    const now = Date.now();
    let shouldShow = false;

    try {
      const lastActiveRaw = window.localStorage.getItem(LAST_ACTIVE_KEY);
      const lastNoticeRaw = window.localStorage.getItem(LAST_NOTICE_KEY);

      const lastActive = lastActiveRaw ? parseInt(lastActiveRaw, 10) : null;
      const lastNotice = lastNoticeRaw ? parseInt(lastNoticeRaw, 10) : null;

      if (!lastActive || Number.isNaN(lastActive) || now - lastActive > INACTIVITY_MS) {
        shouldShow = true;
      }

      if (shouldShow && lastNotice && !Number.isNaN(lastNotice) && now - lastNotice < INACTIVITY_MS) {
        shouldShow = false;
      }

      if (shouldShow) {
        setIsVisible(true);
        window.localStorage.setItem(LAST_NOTICE_KEY, String(now));
      } else {
        setIsVisible(false);
      }

      window.localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    } catch {
      setIsVisible(true);
    }

    if (!isVisible && !shouldShow) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 20000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`hosting-notification ${isVisible ? "visible" : ""}`}>
      The first request may take a few seconds because the site is running on{" "}
      <span className="hosting-notification__highlight">free hosting</span>.
      After about 30 seconds, the site will load and respond much faster.
    </div>
  );
}

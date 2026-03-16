"use client";

import { useState, useEffect } from "react";

export default function HostingNotification() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
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

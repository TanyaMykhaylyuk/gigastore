"use client";

import React, { useEffect } from "react";

export default function Footer() {
  useEffect(() => {
    const hosts = [
      "https://maps.google.com",
      "https://maps.googleapis.com",
      "https://maps.gstatic.com",
    ];
    const created = hosts.map((href) => {
      const l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      l.crossOrigin = "anonymous";
      document.head.appendChild(l);
      return l;
    });

    return () => {
      created.forEach((l) => {
        try {
          document.head.removeChild(l);
        } catch (e) {}
      });
    };
  }, []);

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer__left">
        <h3>Contact &amp; Questions</h3>
        <div className="contact-lines" aria-label="Contact information">
          <p className="contact-line">
            Email: <a href="mailto:ggggg@gmail.com">ggggg@gmail.com</a>
          </p>
          <p className="contact-line">
            Phone: <a href="tel:+07788888888">0 7788888888</a>
          </p>
          <p className="contact-line">Hours: 09:00 — 22:00</p>
        </div>
      </div>

      <div className="site-footer__right" aria-label="Store location map">
        <h3>Store Location</h3>
        <div
          className="map-wrapper"
          aria-hidden="false"
          style={{ width: "100%", minHeight: 260 }}
        >
          <iframe
            title="Store location — Berlin"
            src="https://maps.google.com/maps?q=52.5200,13.4050&z=14&output=embed"
            width="100%"
            height="260"
            style={{ border: 0, display: "block" }}
            allowFullScreen
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </footer>
  );
}


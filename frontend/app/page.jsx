"use client";

import React, { useState, useEffect } from "react";
import CategoriesCarousel from "./components/CategoriesCarousel.jsx";
import DeliverySection from "./components/DeliverySection.jsx";
import ProductCard from "./components/ProductCard.jsx";

export default function Home() {
  const [expanded, setExpanded] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!expanded) return;

    let mounted = true;
    const sample = [
      { id: "1", title: "Phone X", price: 799, img: "/categories/phones.png", category: "phones" },
      { id: "2", title: "Laptop Pro", price: 1299, img: "/categories/laptop.png", category: "laptops" },
      { id: "3", title: "Wireless Headphones", price: 199, img: "/categories/headphones.png", category: "headphones" },
      { id: "4", title: "Smartwatch Z", price: 249, img: "/categories/watch.png", category: "wearables" },
      { id: "5", title: "Tablet S", price: 499, img: "/categories/tablet.png", category: "tablets" },
      { id: "6", title: "Camera M", price: 899, img: "/categories/camera.png", category: "cameras" }
    ];

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const BACKEND = process.env.NEXT_PUBLIC_API_URL || "";
        if (!BACKEND) throw new Error("No BACKEND configured");
        const res = await fetch(`${BACKEND}/products?limit=45&page=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data.rows ?? [];
        if (mounted) setProducts(rows.length ? rows : sample);
      } catch (e) {
        if (mounted) {
          setError(null);
          setProducts(sample);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => { mounted = false; };
  }, [expanded]);

  return (
    <main style={{ padding: 20 }}>
      <CategoriesCarousel />

      <section style={{ textAlign: "center", marginTop: 18 }}>
        <button
          className={`show-all-btn ${expanded ? "active" : ""}`}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide all products" : "Show all products"}
        </button>
      </section>

      <div className={`products-expand ${expanded ? "open" : ""}`}>
        <div className="products-grid-wrapper" style={{ paddingTop: 18 }}>
          {loading && <div style={{ textAlign: "center", color: "var(--white)", padding: 12 }}>Loading...</div>}
          {error && <div style={{ textAlign: "center", color: "crimson", padding: 12 }}>{String(error)}</div>}

          <div className="products-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>

      <DeliverySection />
    </main>
  );
}

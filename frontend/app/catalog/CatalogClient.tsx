"use client";

import React, { useMemo, useState, useEffect } from "react";
import ProductCard from "../components/ProductCard";



export default function CatalogClient({ products = [], category = "" }) {
  const [sortBy, setSortBy] = useState("default");
  const [searchTerm, setSearchTerm] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [localProducts, setLocalProducts] = useState(Array.isArray(products) ? products : []);

  useEffect(() => {
    setLocalProducts(Array.isArray(products) ? products : []);
  }, [products]);

  const computed = useMemo(() => {
    let list = Array.isArray(localProducts) ? localProducts.slice() : [];

    const min = parseFloat(String(minPrice).replace(",", "."));
    const max = parseFloat(String(maxPrice).replace(",", "."));
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      list = list.filter((p) => {
        const price = Number(p.price) || 0;
        if (!Number.isNaN(min) && price < min) return false;
        if (!Number.isNaN(max) && price > max) return false;
        return true;
      });
    }

    const term = String(searchTerm || "").trim().toLowerCase();
    if (term !== "") {
      list = list.filter((p) => {
        const title = String(p.title || "").toLowerCase();
        if (title.includes(term)) return true;

        const priceStr = String(p.price || "").toLowerCase();
        if (priceStr.includes(term)) return true;

        const numeric = parseFloat(term.replace(",", "."));
        if (!Number.isNaN(numeric)) {
          const pnum = Number(p.price) || 0;
          if (Math.abs(pnum - numeric) < 1e-6) return true;
        }

        return false;
      });
    }

    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case "price-desc":
        list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case "alpha-asc":
        list.sort((a, b) =>
          String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })
        );
        break;
      case "alpha-desc":
        list.sort((a, b) =>
          String(b.title || "").localeCompare(String(a.title || ""), undefined, { sensitivity: "base" })
        );
        break;
    }

    return list;
  }, [localProducts, sortBy, searchTerm, minPrice, maxPrice]);

  return (
    <div className="catalog-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, textAlign: "left" }}>
          {category ? `Category: ${category}` : "All products"}
        </h1>

        <div style={{ color: "var(--muted)", fontWeight: 700 }}>
          {computed.length} product{computed.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 18,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="sort-select" style={{ fontWeight: 700 }}>Sort:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: "transparent",
              color: "var(--white)",
              border: "1px solid var(--muted-2)"
            }}
          >
            <option value="default">Default</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="alpha-asc">Alphabet: A → Z</option>
            <option value="alpha-desc">Alphabet: Z → A</option>
          </select>

          <label style={{ fontWeight: 700 }}>Price range:</label>
          <input
            placeholder="min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{
              width: 84,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--muted-2)",
              background: "transparent",
              color: "var(--white)"
            }}
            inputMode="decimal"
          />
          <input
            placeholder="max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{
              width: 84,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--muted-2)",
              background: "transparent",
              color: "var(--white)"
            }}
            inputMode="decimal"
          />
          <button
            className="pagination-btn"
            onClick={() => { setMinPrice(""); setMaxPrice(""); }}
            style={{ marginLeft: 6 }}
            type="button"
          >
            Clear range
          </button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            id="search-term"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: 220,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--muted-2)",
              background: "transparent",
              color: "var(--white)"
            }}
          />
          <button
            className="pagination-btn"
            onClick={() => setSearchTerm("")}
            title="Clear"
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="products-grid-wrapper">
        <div className="products-grid">
          {computed.length === 0 ? (
            <div style={{ padding: 24, color: "var(--muted)" }}>
              No products found.
            </div>
          ) : (
            computed.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

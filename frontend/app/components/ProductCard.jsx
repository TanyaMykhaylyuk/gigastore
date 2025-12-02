"use client";

import React, { useState } from "react";
import { useCart } from "../context/CartContext";



export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState("256GB");
  const [selectedWarranty, setSelectedWarranty] = useState("none"); 

  const basePrice = Number(product.price) || 0;

  const memoryExtra = selectedMemory === "512GB" ? 100
                    : selectedMemory === "1TB"   ? 200
                    : 0;

  const warrantyPrice = selectedWarranty === "1y" ? 50
                      : selectedWarranty === "2y" ? 100
                      : 0;

  const combinedPrice = basePrice + memoryExtra + warrantyPrice;

  const cat = String(product.category || "").toLowerCase();
  const hasMemoryOptions = !["headphones", "headset", "earphones", "earbuds", "tws"].includes(cat);

   const addProductWithOptions = ({ memory = selectedMemory, warranty = selectedWarranty, closeAfter = true } = {}) => {
    const mem = memory || "256GB";
    const memExtra = mem === "512GB" ? 100 : mem === "1TB" ? 200 : 0;
    const wPrice = warranty === "1y" ? 50 : warranty === "2y" ? 100 : 0;
    const finalPrice = basePrice + memExtra + wPrice;

    const warrantyText = warranty === "none" ? "" : ` - ${warranty === "1y" ? "1y warranty" : "2y warranty"}`;

    const productItem = {
      ...product,
      id: `${product.id}-${mem}-${warranty}`, 
      title: `${product.title} (${mem})${warrantyText}`,
      price: finalPrice,
    };

    addToCart(productItem);

    if (closeAfter) setModalOpen(false);
  };

  const handleSmallBuy = (e) => {
    e.stopPropagation();
    addProductWithOptions({ memory: "256GB", warranty: "none", closeAfter: false });
  };

  return (
    <>
      <article
        className="product-card"
        tabIndex={0}
        onClick={() => {
          setSelectedMemory("256GB");
          setSelectedWarranty("none");
          setModalOpen(true);
        }}
        style={{ cursor: "pointer" }}
      >
        <div className="product-image">
          <img
            src={product.img || "/categories/phones.png"}
            alt={product.title || "Product"}
            style={{ maxWidth: "100%", maxHeight: 140, objectFit: "contain" }}
          />
        </div>
        <div className="product-info">
          <h3 className="product-title">{product.title}</h3>
          <div className="product-price">
            {Math.trunc(basePrice)} $
          </div>
          <button
            className="add-btn"
            onClick={handleSmallBuy}
          >
            Buy
          </button>
        </div>
      </article>

      {modalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: 20,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="modal-card"
            style={{
              width: "100%",
              maxWidth: 980,
              background: "#0b0b0b",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: "flex", gap: 20, padding: 20, alignItems: "flex-start" }}>
               <div style={{ flex: "0 0 48%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", padding: 12 }}>
                <img
                  src={product.img || "/categories/phones.png"}
                  alt={product.title || "Product"}
                  style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }}
                />
              </div>

              <div style={{ flex: "1 1 52%", paddingRight: 12, color: "var(--white)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h2 style={{ margin: 0 }}>{product.title}</h2>
                  <button
                    aria-label="Close"
                    onClick={() => setModalOpen(false)}
                    style={{ border: "none", background: "transparent", fontSize: 24, color: "var(--white)", cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>

                <p style={{ fontWeight: 700, fontSize: 18, marginTop: 8 }}>
                  Price: {combinedPrice} $
                </p>

                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
                  <div>Base price: {Math.trunc(basePrice)} $</div>
                  <div>Memory extra: {memoryExtra} $</div>
                  <div>Warranty extra: {warrantyPrice} $</div>
                </div>

                {hasMemoryOptions ? (
                  <div style={{ marginTop: 12 }}>
                    <label htmlFor="memory" style={{ fontWeight: 700 }}>Memory</label>
                    <div style={{ marginTop: 8 }}>
                      <select
                        id="memory"
                        value={selectedMemory}
                        onChange={(e) => setSelectedMemory(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 8, minWidth: 160, background: "transparent", color: "var(--white)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <option value="256GB">256 GB</option>
                        <option value="512GB">512 GB (+$100)</option>
                        <option value="1TB">1 TB (+$200)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontStyle: "italic", color: "var(--muted)" }}>Memory options not available for this product.</div>
                  </div>
                )}

                <div style={{ marginTop: 18 }}>
                  <label style={{ fontWeight: 700 }}>Recommended for purchase:</label>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="radio"
                        name={`warranty-${product.id}`}
                        value="none"
                        checked={selectedWarranty === "none"}
                        onChange={() => setSelectedWarranty("none")}
                      />
                      <span>No warranty</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <input
                        type="radio"
                        name={`warranty-${product.id}`}
                        value="1y"
                        checked={selectedWarranty === "1y"}
                        onChange={() => setSelectedWarranty("1y")}
                      />
                      <span>1-year warranty — $50</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <input
                        type="radio"
                        name={`warranty-${product.id}`}
                        value="2y"
                        checked={selectedWarranty === "2y"}
                        onChange={() => setSelectedWarranty("2y")}
                      />
                      <span>2-year warranty — $100</span>
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    onClick={() => {
                      addProductWithOptions({ memory: selectedMemory, warranty: selectedWarranty, closeAfter: true });
                    }}
                    className="add-btn"
                    style={{ padding: "12px 18px", fontSize: 16 }}
                  >
                    Buy
                  </button>

                  
                </div>

                </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React from "react";

export default function ProductCard({ product, onBuy }) {
  const handleBuy = (e) => {
    e.stopPropagation();
    if (typeof onBuy === "function") onBuy(product);
    else console.log("Buy", product);
  };

  return (
    <article className="product-card" tabIndex={0}>
      <div className="product-image">
        <img src={product.img || "/categories/phones.png"} alt={product.title || "Product"} />
      </div>
      <div className="product-info">
        <h3 className="product-title">{product.title}</h3>
        <div className="product-price">{product.price} $</div>
        <button className="add-btn" onClick={handleBuy} style={{ marginTop: 8 }}>Buy</button>
      </div>
    </article>
  );
}
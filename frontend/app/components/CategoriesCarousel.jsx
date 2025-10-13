"use client"

import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import CategoryCard from "./CategoryCard";
import "../styles/carousel.css"

const categories = [
  { slug: "phones", title: "Phones", img: "/categories/phones.png" },
  { slug: "computers", title: "Computers", img: "/categories/computers.png" },
  { slug: "tablets", title: "Tablets", img: "/categories/tablets.png" },
  { slug: "headphones", title: "Headphones", img: "/categories/headphones.png" },
  { slug: "smartwatch", title: "Smartwatches", img: "/categories/smartwatch.png" },
];

export default function CategoriesCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [translateZ, setTranslateZ] = useState(400);
  const slideCount = categories.length;
  const angle = 360 / slideCount;

  useEffect(() => {
    const updateTranslateZ = () => {
      const width = window.innerWidth;
      const cardWidth = width <= 768 ? 150 : 200;
      const baseZ = (width / 2 - cardWidth / 2) / Math.sin(Math.PI / slideCount);
      const z = Math.min(350, baseZ);
      setTranslateZ(z > 0 ? z : 150);
    };

    updateTranslateZ();
    window.addEventListener("resize", updateTranslateZ);
    return () => window.removeEventListener("resize", updateTranslateZ);
  }, [slideCount]);

  const prevSlide = () => setActiveIndex((prev) => (prev - 1 + slideCount) % slideCount);
  const nextSlide = () => setActiveIndex((prev) => (prev + 1) % slideCount);

  return (
    <div className="carousel-3d-container">
      <button className="arrow left" onClick={prevSlide} aria-label="Previous">
        <FiArrowLeft size={24} />
      </button>
      <div className="carousel-3d">
        {categories.map((c, idx) => {
          const rotation = idx * angle - activeIndex * angle;
          return (
            <div
              key={c.slug}
              className="carousel-slide"
              style={{ transform: `translate(-50%, -50%) rotateY(${rotation}deg) translateZ(${translateZ}px)` }}
            >
              <CategoryCard slug={c.slug} title={c.title} img={c.img} />
            </div>
          );
        })}
      </div>
      <button className="arrow right" onClick={nextSlide} aria-label="Next">
        <FiArrowRight size={24} />
      </button>
    </div>
  );
}

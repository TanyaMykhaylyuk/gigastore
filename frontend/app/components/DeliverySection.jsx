"use client";

import { useEffect, useRef, useState } from "react";

export default function DeliverySection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="delivery-section"
      aria-labelledby="delivery-title"
    >
      <img
        src="/delivery/delivery.png"
        alt="Delivery Image"
        className={`img-left ${visible ? "slide-in" : ""}`}
        aria-hidden="true"
      />

      <div
        className={`delivery-text-container ${visible ? "slide-in" : ""}`}
        role="region"
        aria-live="polite"
      >
        <h2 id="delivery-title">Delivery</h2>

        <p>
          <strong>Store pickup:</strong>
        </p>
        <ul>
          <li>Store pickup is free.</li>
          <li>Pickup time is 1 to 3 days.</li>
        </ul>

        <p>
          <strong>Postal delivery:</strong>
        </p>
        <ul>
          <li>Delivery time is 1 to 3 days.</li>
          <li>
            Delivery is available after full prepayment or as cash on delivery
            for new equipment.
          </li>
          <li>
            Delivery to a post office is free after full payment of the product.
          </li>
          <li>
            The delivery cost is paid by the recipient according to the postal service's conditions.
          </li>
        </ul>

        <p>
          <em>
            * Certain product categories are delivered only after an advance
            payment.
          </em>
        </p>
      </div>
    </section>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";
import CategoriesCarousel from "./components/CategoriesCarousel";
import TradeInSection from "./components/TradeInSection";
import DeliverySection from "./components/DeliverySection";
import ProductCard from "./components/ProductCard";

export default function Home() {
  const { showWelcome: ctxShowWelcome, user, clearWelcome, isAuthenticated } = useAuth();
  const { addToCart: ctxAddToCart } = useCart();

  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  useEffect(() => {
    if (!ctxShowWelcome) return;

    if (!isAuthenticated) {
      clearWelcome();
      return;
    }

    let name = (user?.firstName || "").toString().trim();

    if (!name && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem("giga_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          name = (parsed?.firstName || "").toString().trim();
        }
        if (!name) {
          const firstNameKey = localStorage.getItem("giga_user_firstName");
          if (firstNameKey) name = firstNameKey.toString().trim();
        }
      } catch (e) {
        console.warn("[Home] can't read persisted user:", e);
      }
    }

    if (!name) {
      console.info("[Home] no firstName available, skipping welcome banner");
      clearWelcome();
      setShowWelcome(false);
      setWelcomeName("");
      return;
    }

    setWelcomeName(name);
    setShowWelcome(true);

    const timeout = setTimeout(() => {
      setShowWelcome(false);
      clearWelcome();
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem("giga_user_firstName");
          localStorage.removeItem("giga_show_welcome");
        } catch {}
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [ctxShowWelcome, user?.firstName, isAuthenticated, clearWelcome]);

  useEffect(() => {
    if (ctxShowWelcome) return;

    if (typeof window !== 'undefined') {
      try {
        const flag = localStorage.getItem("giga_show_welcome");
        const name = localStorage.getItem("giga_user_firstName");
        if (flag === "1" && name) {
          localStorage.removeItem("giga_show_welcome");
          setWelcomeName(name || "");
          setShowWelcome(true);
        }
      } catch (err) {
        console.warn("localStorage not available:", err);
      }
    }
  }, [ctxShowWelcome]);

  useEffect(() => {
    if (!showWelcome) return;
    const timeout = setTimeout(() => {
      setShowWelcome(false);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem("giga_user_firstName");
        } catch {}
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [showWelcome]);

  const [expanded, setExpanded] = useState(false);
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [visiblePages, setVisiblePages] = useState([]);
  const [noMorePages, setNoMorePages] = useState(false);

  const addToCart = (product) => {
    try {
      if (typeof ctxAddToCart === "function") {
        ctxAddToCart(product);
        return;
      }

      if (typeof window !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem("cart") || "[]");
        const exists = stored.find((item) => item.id === product.id);
        let updated;
        if (exists) {
          updated = stored.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          updated = [...stored, { ...product, quantity: 1 }];
        }
        localStorage.setItem("cart", JSON.stringify(updated));
        window.dispatchEvent(new Event("cart-changed"));
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
    }
  };

  useEffect(() => {
    if (!expanded) {
      setHasFetched(false);
      setError(null);
      setProducts([]);
      setVisiblePages([]);
      setCurrentPage(1);
      setNoMorePages(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNoMorePages(false);

    const ac = new AbortController();

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?limit=45&page=1`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        const rows = Array.isArray(data) ? data : data.rows ?? [];
        const shuffled = rows.slice().sort(() => Math.random() - 0.5);
        setProducts(shuffled);
        setCurrentPage(1);

        const loadedPages = Math.ceil(shuffled.length / itemsPerPage);
        const initialVisible = [];
        for (
          let i = 1;
          i <= Math.min(3, loadedPages === 0 ? 1 : loadedPages);
          i++
        ) {
          initialVisible.push(i);
        }
        setVisiblePages(initialVisible);

        if (loadedPages < 1) setNoMorePages(true);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message || "Load error");
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setLoading(false);
          setHasFetched(true);
        }
      });

    return () => ac.abort();
  }, [expanded]);

  async function loadPage(page) {
    if (loading) return false;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?limit=${itemsPerPage}&page=${page}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.rows ?? [];
      if (!Array.isArray(rows) || rows.length === 0) {
        setNoMorePages(true);
        return false;
      }
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const filtered = rows.filter((p) => !ids.has(p.id));
        return [...prev, ...filtered];
      });
      return true;
    } catch (err) {
      setError(err.message || "Load error");
      return false;
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }

  useEffect(() => {
    if (!expanded) return;
    const loadedPages = Math.ceil(products.length / itemsPerPage);
    if (currentPage > loadedPages) {
      loadPage(currentPage).then((ok) => {
        if (ok) {
          setVisiblePages((prev) => {
            if (prev.includes(currentPage)) return prev;
            return [...prev, currentPage].sort((a, b) => a - b);
          });
        }
      });
    }
  }, [currentPage, expanded, products.length]);

  const start = (currentPage - 1) * itemsPerPage;
  const pageProducts = products.slice(start, start + itemsPerPage);

  function handleNext() {
    if (noMorePages) return;
    const target = currentPage + 1;
    if (visiblePages.includes(target)) {
      setCurrentPage(target);
      return;
    }
    loadPage(target).then((ok) => {
      if (ok) {
        setVisiblePages((prev) => {
          const next = prev.includes(target) ? prev : [...prev, target];
          return next.sort((a, b) => a - b);
        });
        setCurrentPage(target);
      }
    });
  }

  function handleGoTo(page) {
    if (page === currentPage) return;
    if (visiblePages.includes(page)) {
      setCurrentPage(page);
      return;
    }
    loadPage(page).then((ok) => {
      if (ok) {
        setVisiblePages((prev) => {
          const next = prev.includes(page) ? prev : [...prev, page];
          return next.sort((a, b) => a - b);
        });
        setCurrentPage(page);
      }
    });
  }

  function handlePrev() {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }
  const maxVisible = visiblePages.length ? Math.max(...visiblePages) : 0;

  return (
    <main className="page-root">
      <div
        className="welcome-banner"
        style={{
          position: "fixed",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "linear-gradient(90deg, rgba(0,140,255,0.95), rgba(0,200,255,0.9))",
          color: "#000",
          padding: "12px 20px",
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,140,255,0.25)",
          fontWeight: 800,
          fontSize: 18,
          opacity: showWelcome ? 1 : 0,
          pointerEvents: showWelcome ? "auto" : "none",
          transition: "opacity 500ms ease-in-out",
        }}
        aria-hidden={!showWelcome}
      >
        {`Welcome, ${welcomeName || "user"}!`}
      </div>

      <section>
        <CategoriesCarousel />
      </section>

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
        <div className="products-grid-wrapper">
          <div className="products-grid">
            {hasFetched && !error && products.length === 0 && (
              <div style={{ padding: 24, color: "var(--muted)" }}>Products not found.</div>
            )}
            {error && <div style={{ color: "red", padding: 12 }}>{error}</div>}
            {pageProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {expanded && (visiblePages.length > 0 || hasFetched) && (
            <div className="pagination" style={{ marginTop: 20 }}>
              <button className="pagination-btn" onClick={handlePrev} disabled={currentPage === 1}>
                ← Prev
              </button>
              {visiblePages.map((i) => (
                <button
                  key={i}
                  className={`pagination-btn ${currentPage === i ? "active" : ""}`}
                  onClick={() => handleGoTo(i)}
                >
                  {i}
                </button>
              ))}
              <button
                className="pagination-btn"
                onClick={handleNext}
                disabled={noMorePages || loading || maxVisible === 0}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      <TradeInSection />

      
      <DeliverySection />
    </main>
  );
}

import CatalogClient from "./CatalogClient";

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  try {
    const params = searchParams;
    const category = params?.category ? String(params.category) : "";

    const q = new URLSearchParams();
    if (category) q.set("category", category);
    q.set("limit", "100");
    q.set("page", "1");

    const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5011";

    const res = await fetch(`${BACKEND}/products?${q.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Products fetch failed: ${res.status}`);
    }

    const data = await res.json();
    const products = Array.isArray(data) ? data : data.rows ?? [];

    return (
      <main className="page-root" style={{ paddingTop: 28 }}>
        <CatalogClient products={products} category={category} />
      </main>
    );
  } catch (err) {
    console.error("Catalog page fetch error:", err);
    return (
      <main className="page-root" style={{ paddingTop: 28 }}>
        <div style={{ padding: 24, color: "crimson" }}>
          Error loading products. Check server/backend logs.
        </div>
      </main>
    );
  }
}

import Link from "next/link";

export default function CategoryCard({ slug, title, img }) {
  return (
    <Link href={`/catalog?category=${encodeURIComponent(slug)}`} className="category-card">
      <img src={img} alt={title} width={200} height={200} style={{ objectFit: "contain", borderRadius: "16px" }} />
      <div className="title">{title}</div>
    </Link>
  );
}

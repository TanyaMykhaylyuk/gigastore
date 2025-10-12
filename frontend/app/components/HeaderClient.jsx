"use client";

import Link from "next/link";

export default function HeaderClient() {
  return (
    <header className="site-header">
      <div className="site-header__left">
        <h1 className="brand">GIGA STORE</h1>
      </div>
      <div className="site-header__right">
        <Link href="/">Home</Link>
        <Link href="/catalog">Catalog</Link>
        <Link href="/account">Account</Link>
        <Link href="/cart">Cart</Link>
      </div>
    </header>
  );
}

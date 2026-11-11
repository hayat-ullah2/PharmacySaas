"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, ShoppingCart, Store as StoreIcon } from "lucide-react";
import { MedicineCard } from "@/components/pharmacy/MedicineCard";
import { CategoryTabs } from "@/components/pharmacy/CategoryTabs";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { MEDICINES, STORE_CATEGORIES } from "@/lib/data";
import { useCart } from "@/lib/cart";

export default function ManagerStorePage() {
  const { totals } = useCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");
  const [rxOnly, setRxOnly] = useState(false);

  const products = useMemo(() => {
    let list = MEDICINES.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.genericName.toLowerCase().includes(q);
      const matchCat = category === "All" || m.category === category;
      const matchRx = !rxOnly || m.prescriptionRequired;
      return matchSearch && matchCat && matchRx;
    });
    if (sort === "price-low") list = [...list].sort((a, b) => a.sellingPrice - b.sellingPrice);
    else if (sort === "price-high") list = [...list].sort((a, b) => b.sellingPrice - a.sellingPrice);
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [search, category, sort, rxOnly]);

  return (
    <div>
      {/* Store header */}
      <div className="mb-5 flex flex-col gap-4 rounded-[var(--radius-card)] border border-navy-200/70 bg-gradient-to-r from-primary-600 to-primary-700 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5" />
            <h1 className="text-xl font-bold">Pharmacy Store</h1>
          </div>
          <p className="mt-1 text-sm text-primary-100">
            Browse medicines and build a sale — {MEDICINES.length} products available.
          </p>
        </div>
        <Link href="/manager/cart">
          <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
            <ShoppingCart className="h-4 w-4" /> Cart
            {totals.count > 0 && (
              <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-primary-700">
                {totals.count}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Search + sort */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines by name or generic…"
            className="h-11 w-full rounded-lg border border-navy-200 bg-white pl-9 pr-3 text-sm text-navy-900 placeholder:text-navy-400 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRxOnly((v) => !v)}
            className={
              "flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition " +
              (rxOnly
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-navy-200 bg-white text-navy-600 hover:bg-navy-50")
            }
          >
            <SlidersHorizontal className="h-4 w-4" /> Rx only
          </button>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-11 w-40"
            options={[
              { value: "popular", label: "Most Popular" },
              { value: "name", label: "Name A–Z" },
              { value: "price-low", label: "Price: Low to High" },
              { value: "price-high", label: "Price: High to Low" },
            ]}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="mb-5">
        <CategoryTabs categories={[...STORE_CATEGORIES]} active={category} onChange={setCategory} />
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No medicines found"
          description="Try a different search term or category."
          action={<Button variant="outline" onClick={() => { setSearch(""); setCategory("All"); setRxOnly(false); }}>Clear filters</Button>}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-navy-500">
            Showing <span className="font-medium text-navy-700">{products.length}</span> products
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((m) => (
              <MedicineCard key={m.id} medicine={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

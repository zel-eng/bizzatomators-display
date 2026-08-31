import { useMemo, useState } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatMoney, type ProductRecord } from "@/components/inventory/inventory-provider";

export type PurchaseLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
};

export const buildPurchaseLine = (product: ProductRecord, quantity: number, unitCost?: number): PurchaseLine => {
  const cost = unitCost ?? product.costPrice;
  return {
    productId: product.id,
    productName: product.name,
    quantity,
    unitCost: cost,
    lineTotal: quantity * cost,
  };
};

export const purchaseTotal = (items: PurchaseLine[]) => items.reduce((sum, item) => sum + item.lineTotal, 0);

/**
 * Purchase items = what was actually bought. Quantity drives stock, unit cost is the
 * historical cost of this purchase only (it never rewrites earlier purchases).
 */
export function PurchaseItemsEditor({
  products,
  items,
  onChange,
}: {
  products: ProductRecord[];
  items: PurchaseLine[];
  onChange: (items: PurchaseLine[]) => void;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const active = products.filter((row) => row.active);
    if (!term) return active.slice(0, 6);
    return active
      .filter((product) => `${product.name} ${product.sku} ${product.barcode} ${product.category}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, query]);

  const add = (product: ProductRecord) => {
    const existing = items.find((item) => item.productId === product.id);
    if (existing) {
      update(product.id, existing.quantity + 1, existing.unitCost);
      return;
    }
    onChange([...items, buildPurchaseLine(product, 1)]);
  };

  const update = (productId: string, quantity: number, unitCost: number) => {
    if (quantity <= 0) {
      onChange(items.filter((item) => item.productId !== productId));
      return;
    }
    onChange(
      items.map((item) =>
        item.productId === productId
          ? { ...item, quantity, unitCost, lineTotal: quantity * unitCost }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3">
        <Search className="h-4 w-4 shrink-0 text-white/50" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search product by name, SKU or barcode"
          className="h-9 border-0 bg-transparent px-0 text-sm text-white placeholder:text-white/40 focus-visible:ring-0"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {results.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => add(product)}
            className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-left text-xs text-white transition hover:bg-amber-400/20"
          >
            <span className="block font-semibold">{product.name}</span>
            <span className="block text-white/55">stock {product.stockQuantity} · cost {formatMoney(product.costPrice)}</span>
          </button>
        ))}
        {results.length === 0 ? <p className="text-xs text-white/50">No products found — create the product first.</p> : null}
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/20">
        {items.length === 0 ? (
          <p className="p-4 text-xs text-white/50">No purchase items yet — tap a product above, then set quantity and unit cost.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {items.map((item) => (
              <li key={item.productId} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-medium text-white">{item.productName}</p>
                  <button
                    type="button"
                    onClick={() => update(item.productId, 0, item.unitCost)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-rose-200 transition hover:bg-rose-400/20"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => update(item.productId, item.quantity - 1, item.unitCost)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/80"
                      aria-label="Less"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(event) => update(item.productId, Number(event.target.value), item.unitCost)}
                      className="h-8 w-16 border-white/15 bg-black/25 text-center text-sm text-white"
                      aria-label="Quantity"
                    />
                    <button
                      type="button"
                      onClick={() => update(item.productId, item.quantity + 1, item.unitCost)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/80"
                      aria-label="More"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-white/55">
                    Unit cost
                    <Input
                      type="number"
                      value={item.unitCost}
                      onChange={(event) => update(item.productId, item.quantity, Number(event.target.value))}
                      className="h-8 w-28 border-white/15 bg-black/25 text-sm text-white"
                    />
                  </label>
                  <span className="ml-auto text-sm font-semibold text-amber-300">{formatMoney(item.lineTotal)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
        <span className="text-white/70">Purchase total (from items)</span>
        <span className="font-semibold text-amber-300">{formatMoney(purchaseTotal(items))}</span>
      </div>
    </div>
  );
}

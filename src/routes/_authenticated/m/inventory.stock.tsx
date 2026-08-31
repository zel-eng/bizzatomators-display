import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Boxes, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInventory, formatMoney, stockStatus, type MovementType, type ProductRecord } from "@/components/inventory/inventory-provider";
import { RecordDialog, num, str, type FieldValue } from "@/components/tax/record-dialog";
import { DetailsDrawer, StatusBadge, SummaryStrip, TaxTable, TaxWorkspace, exportCsv } from "@/components/tax/tax-workspace";

export const Route = createFileRoute("/_authenticated/m/inventory/stock")({ component: StockPage });

function StockPage() {
  const { products, movements, metrics, adjustStock } = useInventory();
  const [target, setTarget] = useState<ProductRecord | null>(null);
  const [detail, setDetail] = useState<ProductRecord | null>(null);

  const ledgerOf = (product: ProductRecord) => movements.filter((row) => row.productId === product.id).slice(0, 8);

  const submit = (value: Record<string, FieldValue>) => {
    if (!target) return;
    const type = str(value.type) as MovementType;
    const reason = str(value.reason);
    const notes = [reason && reason !== "—" ? reason : "", str(value.notes)].filter(Boolean).join(" — ");
    void adjustStock({
      productId: target.id,
      type,
      quantity: num(value.quantity),
      notes,
      reference: type === "Adjustment" ? "set" : undefined,
    });
    toast.success(`${type} recorded for ${target.name}`);
  };

  return (
    <TaxWorkspace
      title="Stock"
      subtitle="One source of truth: stock changes only through purchases, sales, returns and adjustments"
      icon={Boxes}
      backTo="/m/inventory"
      backLabel="Back to Inventory"
    >
      <SummaryStrip
        items={[
          { label: "Total Stock", value: String(metrics.totalStock), accent: true },
          { label: "Stock Value", value: formatMoney(metrics.stockValue) },

        ]}
      />


      <TaxTable
        rows={products}
        searchKeys={(row) => `${row.name} ${row.sku} ${row.category}`}
        filter={{
          label: "Status",
          options: [
            { value: "In Stock", label: "In Stock" },
            { value: "Low Stock", label: "Low Stock" },
            { value: "Out of Stock", label: "Out of Stock" },
          ],
          match: (row, value) => stockStatus(row) === value,
        }}
        columns={[
          { key: "name", label: "Product", render: (row) => <span className="font-medium text-white">{row.name}</span> },
          { key: "stockQuantity", label: "Available Stock", render: (row) => String(row.stockQuantity) },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={stockStatus(row)} /> },
        ]}
        onRowClick={setDetail}
        onEdit={setTarget}
        onExport={(rows) => exportCsv("stock.csv", ["Product", "Available Stock", "Reorder level", "Status"], rows.map((row) => [row.name, row.stockQuantity, row.reorderLevel, stockStatus(row)]))}
        empty={{ title: "No stock records", description: "Add products first to manage stock levels.", icon: Boxes }}
      />

      <RecordDialog
        open={Boolean(target)}
        title={`Stock movement — ${target?.name ?? ""}`}
        description={`Current stock: ${target?.stockQuantity ?? 0}. "Adjustment" sets the counted stock; Stock In/Out add or remove units.`}
        submitLabel="Save movement"
        initialValue={null}
        onClose={() => setTarget(null)}
        onSubmit={submit}
        fields={[
          { name: "type", label: "Movement type", type: "select", options: ["Stock In", "Stock Out", "Adjustment"], half: true },
          { name: "quantity", label: "Quantity", type: "number", required: true, half: true },
          {
            name: "reason",
            label: "Reason",
            type: "select",
            options: ["Counting Error", "Damaged", "Lost", "Expired", "Internal Use", "Opening Stock", "Other"],
            half: true,
          },
          { name: "notes", label: "Notes", type: "text" },
        ]}
        extra={
          <p className="text-[11px] text-white/45">
            Damaged, lost or expired goods are stock movements only — they never create a sale, customer or revenue.
            Supplier deliveries should be recorded as a purchase so cost and supplier are kept.
          </p>
        }
      />

      <DetailsDrawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description="Stock details"
        rows={
          detail
            ? [
                { label: "SKU", value: detail.sku || "—" },
                { label: "Category", value: detail.category || "—" },
                { label: "Available stock", value: String(detail.stockQuantity) },
                { label: "Reorder level", value: String(detail.reorderLevel) },
                { label: "Inventory cost / unit", value: formatMoney(detail.costPrice) },
                { label: "Stock value", value: formatMoney(detail.stockQuantity * detail.costPrice) },
                { label: "Status", value: <StatusBadge value={stockStatus(detail)} /> },
                {
                  label: "Recent movements",
                  value: (
                    <div className="space-y-1">
                      {ledgerOf(detail).map((row) => (
                        <div key={row.id} className="text-xs text-white/80">
                          {row.movementDate} · {row.type} · {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                          {row.reference ? ` · ${row.reference}` : ""}
                        </div>
                      ))}
                      {ledgerOf(detail).length === 0 ? <span className="text-white/50">No movements yet</span> : null}
                    </div>
                  ),
                },
              ]
            : []
        }

        footer={
          detail ? (
            <Button className="bg-amber-400 text-black hover:bg-amber-300" onClick={() => { setTarget(detail); setDetail(null); }}>
              <ArrowLeftRight className="mr-1.5 h-4 w-4" /> New movement
            </Button>
          ) : null
        }
      />
    </TaxWorkspace>
  );
}

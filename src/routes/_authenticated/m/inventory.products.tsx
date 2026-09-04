import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInventory, formatMoney, stockStatus, type ProductRecord } from "@/components/inventory/inventory-provider";
import { RecordDialog, ConfirmDialog, num, str, type FieldValue } from "@/components/tax/record-dialog";
import { DetailsDrawer, StatusBadge, SummaryStrip, TaxTable, TaxWorkspace, exportCsv } from "@/components/tax/tax-workspace";
import { ProductImagePicker, ProductThumb, uploadProductImage, useProductImageUrl, productPlaceholder } from "@/components/inventory/product-image";
import { useBusinessProfile } from "@/hooks/use-business-profile";
import { generateSku } from "@/lib/product-sku";

function ProductPhoto({ path }: { path?: string }) {
  const url = useProductImageUrl(path);
  return <img src={url ?? productPlaceholder} alt="Product photo" className="max-h-28 rounded-xl object-contain" />;
}

export const Route = createFileRoute("/_authenticated/m/inventory/products")({ component: ProductsPage });


function ProductsPage() {
  const { products, categories, purchases, purchaseItems, saveProduct, deleteProduct, metrics } = useInventory();
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<ProductRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductRecord | null>(null);

  const categoryNames = categories.map((row) => row.name);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (row: ProductRecord) => { setEditing(row); setFormOpen(true); };

  /** Purchase history for a product — this is where supplier and historical cost live. */
  const historyOf = (product: ProductRecord) =>
    purchaseItems
      .filter((item) => item.productId === product.id)
      .map((item) => ({ item, purchase: purchases.find((row) => row.id === item.purchaseId) }))
      .sort((a, b) => (b.purchase?.purchaseDate ?? "").localeCompare(a.purchase?.purchaseDate ?? ""));

  const supplierList = (product: ProductRecord) => {
    const names = Array.from(new Set(historyOf(product).map((row) => row.purchase?.supplierName).filter(Boolean)));
    return names.length ? names.join(", ") : "—";
  };

  const submit = (value: Record<string, FieldValue>) => {
    const categoryName = str(value.category);
    const sku = str(value.sku).trim();
    const barcode = str(value.barcode).trim();
    const clash = products.find(
      (row) =>
        row.id !== editing?.id &&
        ((sku && row.sku.toLowerCase() === sku.toLowerCase()) || (barcode && row.barcode.toLowerCase() === barcode.toLowerCase())),
    );
    if (clash) { toast.error(`SKU or barcode already used by ${clash.name}`); return; }

    saveProduct(
      {
        name: str(value.name),
        sku,
        barcode,
        category: categoryName,
        categoryId: categories.find((row) => row.name === categoryName)?.id ?? "",
        // Suppliers belong to purchases, not to the product master record.
        supplierId: editing?.supplierId ?? "",
        warehouseId: editing?.warehouseId ?? "",
        sellingPrice: num(value.sellingPrice),
        costPrice: editing ? editing.costPrice : num(value.costPrice),
        stockQuantity: editing?.stockQuantity ?? num(value.stockQuantity),
        reorderLevel: num(value.reorderLevel),
        active: editing?.active ?? true,
        description: str(value.description),
      },
      editing?.id,
    );
    toast.success(editing ? "Product updated" : "Product added");
  };



  return (
    <TaxWorkspace
      title="Products"
      subtitle="Catalogue, pricing and stock levels"
      icon={Package}
      backTo="/m/inventory"
      backLabel="Back to Inventory"
      actions={
        <Button size="sm" className="h-9 bg-amber-400 text-black hover:bg-amber-300" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> New product
        </Button>
      }
    >
      <SummaryStrip
        items={[
          { label: "Products", value: String(metrics.totalProducts), accent: true },
          { label: "Stock Value", value: formatMoney(metrics.stockValue) },

        ]}
      />

      <TaxTable
        rows={products}
        searchKeys={(row) => `${row.name} ${row.sku} ${row.barcode} ${row.category}`}
        filter={{
          label: "Status",
          options: [
            { value: "In Stock", label: "In Stock" },
            { value: "Low Stock", label: "Low Stock" },
            { value: "Out of Stock", label: "Out of Stock" },
            { value: "Archived", label: "Archived" },
          ],
          match: (row, value) => (value === "Archived" ? !row.active : row.active && stockStatus(row) === value),
        }}
        columns={[
          { key: "name", label: "Product", render: (row) => <span className="font-medium text-white">{row.name}{row.active ? "" : " (archived)"}</span> },
          { key: "sku", label: "SKU", hideOnMobile: true, render: (row) => row.sku || "—" },
          { key: "category", label: "Category", hideOnMobile: true, render: (row) => row.category || "—" },
          { key: "sellingPrice", label: "Selling price", render: (row) => formatMoney(row.sellingPrice) },
          { key: "stockQuantity", label: "Stock", render: (row) => String(row.stockQuantity) },
        ]}
        onRowClick={setDetail}
        onEdit={openEdit}
        onDelete={setPendingDelete}
        onExport={(rows) =>
          exportCsv(
            "products.csv",
            ["Product", "SKU", "Barcode", "Category", "Selling price", "Inventory cost", "Stock"],
            rows.map((row) => [row.name, row.sku, row.barcode, row.category, row.sellingPrice, row.costPrice, row.stockQuantity]),
          )
        }
        addLabel="New product"
        onAdd={openCreate}
        empty={{ title: "No products yet", description: "A product is what you buy and sell. Adding one does not create stock — stock comes from purchases.", icon: Package }}
      />

      <RecordDialog
        open={formOpen}
        title={editing ? "Edit product" : "New product"}
        description="The master record of what you buy and sell. Suppliers and purchase costs are recorded on purchases, not here."
        submitLabel={editing ? "Update" : "Create"}
        initialValue={
          editing
            ? {
                name: editing.name,
                sku: editing.sku,
                barcode: editing.barcode,
                category: editing.category || (categoryNames[0] ?? ""),
                sellingPrice: editing.sellingPrice,
                reorderLevel: editing.reorderLevel,
                description: editing.description,
              }
            : { reorderLevel: 5, stockQuantity: 0, costPrice: 0 }
        }
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        fields={[
          { name: "name", label: "Product name", type: "text", required: true, half: true },
          { name: "category", label: "Category", type: "select", options: categoryNames.length ? categoryNames : ["Uncategorised"], half: true },
          { name: "sku", label: "SKU", type: "text", half: true },
          { name: "barcode", label: "Barcode", type: "text", half: true },
          { name: "sellingPrice", label: "Selling price (current)", type: "number", required: true, half: true },
          { name: "reorderLevel", label: "Reorder level", type: "number", half: true },
          ...(editing
            ? []
            : ([
                { name: "stockQuantity", label: "Opening stock (optional)", type: "number", half: true },
                { name: "costPrice", label: "Opening cost per unit", type: "number", half: true },
              ] as const)),
          { name: "description", label: "Description", type: "text" },
        ]}
        extra={
          <p className="text-[11px] text-white/45">
            {editing
              ? "Inventory cost is maintained automatically from received purchases. Changing the selling price never changes past sales."
              : "Leave opening stock at 0 if you have no goods yet — stock arrives when you receive a purchase."}
          </p>
        }
      />

      <DetailsDrawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description="Product details"
        rows={
          detail
            ? [
                { label: "Photo", value: <ProductPhoto path={detail.imagePath} /> },
                { label: "SKU", value: detail.sku || "—" },
                { label: "Barcode", value: detail.barcode || "—" },
                { label: "Category", value: detail.category || "—" },
                { label: "Bought from", value: supplierList(detail) },
                { label: "Selling price (current)", value: formatMoney(detail.sellingPrice) },
                { label: "Inventory cost / unit", value: formatMoney(detail.costPrice) },
                { label: "Stock on hand", value: String(detail.stockQuantity) },
                { label: "Stock value", value: formatMoney(detail.stockQuantity * detail.costPrice) },
                { label: "Reorder level", value: String(detail.reorderLevel) },
                { label: "Status", value: <StatusBadge value={detail.active ? stockStatus(detail) : "Archived"} /> },
                {
                  label: "Purchase history",
                  value: (
                    <div className="space-y-1">
                      {historyOf(detail).slice(0, 6).map(({ item, purchase }) => (
                        <div key={item.id} className="text-xs text-white/80">
                          {purchase?.purchaseDate ?? "—"} · {purchase?.supplierName || "—"} · {item.quantity} × {formatMoney(item.unitCost)}
                        </div>
                      ))}
                      {historyOf(detail).length === 0 ? <span className="text-white/50">Not purchased yet</span> : null}
                    </div>
                  ),
                },
                { label: "Description", value: detail.description || "—" },
              ]
            : []
        }
        footer={
          detail ? (
            <>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/15" onClick={() => { openEdit(detail); setDetail(null); }}>Edit</Button>
              <Button className="bg-rose-500 text-white hover:bg-rose-400" onClick={() => { setPendingDelete(detail); setDetail(null); }}>Delete</Button>
            </>
          ) : null
        }
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        description={`${pendingDelete?.name ?? ""} will be deleted. If it already appears on purchases, sales or stock movements it is archived instead, so history stays readable.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => { if (pendingDelete) { deleteProduct(pendingDelete.id); toast.success("Product removed or archived"); } }}
      />

    </TaxWorkspace>
  );
}

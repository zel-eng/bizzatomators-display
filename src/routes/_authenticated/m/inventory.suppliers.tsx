import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Truck, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInventory, formatMoney, type SupplierRecord } from "@/components/inventory/inventory-provider";
import { RecordDialog, ConfirmDialog, str, type FieldValue } from "@/components/tax/record-dialog";
import { DetailsDrawer, StatusBadge, SummaryStrip, TaxTable, TaxWorkspace, exportCsv } from "@/components/tax/tax-workspace";

export const Route = createFileRoute("/_authenticated/m/inventory/suppliers")({ component: SuppliersPage });

function SuppliersPage() {
  const { suppliers, purchases, purchaseItems, saveSupplier, deleteSupplier } = useInventory();
  const [editing, setEditing] = useState<SupplierRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<SupplierRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SupplierRecord | null>(null);

  // A supplier relates to products through purchase history, not through the product record.
  const purchasesOf = (row: SupplierRecord) => purchases.filter((p) => p.supplierId === row.id);
  const countFor = (row: SupplierRecord) => {
    const ids = new Set(purchasesOf(row).map((p) => p.id));
    return new Set(purchaseItems.filter((item) => ids.has(item.purchaseId)).map((item) => item.productId)).size;
  };
  const spendFor = (row: SupplierRecord) => purchasesOf(row).reduce((sum, p) => sum + p.total, 0);
  const lastPurchase = (row: SupplierRecord) =>
    purchasesOf(row).map((p) => p.purchaseDate).sort().at(-1) ?? "—";


  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (row: SupplierRecord) => { setEditing(row); setFormOpen(true); };

  const submit = (value: Record<string, FieldValue>) => {
    saveSupplier(
      {
        name: str(value.name),
        phone: str(value.phone),
        address: str(value.address),
        notes: str(value.notes),
        status: str(value.status) as SupplierRecord["status"],
      },
      editing?.id,
    );
    toast.success(editing ? "Supplier updated" : "Supplier added");
  };

  return (
    <TaxWorkspace
      title="Suppliers"
      subtitle="Vendors supplying your products"
      icon={Truck}
      backTo="/m/inventory"
      backLabel="Back to Inventory"
      actions={
        <Button size="sm" className="h-9 bg-amber-400 text-black hover:bg-amber-300" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> New supplier
        </Button>
      }
    >
      <SummaryStrip
        items={[
          { label: "Suppliers", value: String(suppliers.length), accent: true },
          { label: "Active", value: String(suppliers.filter((row) => row.status === "Active").length) },
        ]}
      />

      <TaxTable
        rows={suppliers}
        searchKeys={(row) => `${row.name} ${row.phone}`}
        filter={{
          label: "Status",
          options: [
            { value: "Active", label: "Active" },
            { value: "Inactive", label: "Inactive" },
          ],
          match: (row, value) => row.status === value,
        }}
        columns={[
          { key: "name", label: "Supplier", render: (row) => <span className="font-medium text-white">{row.name}</span> },
          { key: "phone", label: "Phone", render: (row) => row.phone || "—" },
          { key: "products", label: "Products supplied", hideOnMobile: true, render: (row) => String(countFor(row)) },
          { key: "purchases", label: "Purchases", render: (row) => String(purchasesOf(row).length) },
        ]}
        onRowClick={setDetail}
        onEdit={openEdit}
        onDelete={setPendingDelete}
        onExport={(rows) => exportCsv("suppliers.csv", ["Supplier", "Phone", "Products supplied", "Purchases", "Total spend", "Last purchase", "Status"], rows.map((row) => [row.name, row.phone, countFor(row), purchasesOf(row).length, spendFor(row), lastPurchase(row), row.status]))}
        addLabel="New supplier"
        onAdd={openCreate}
        empty={{ title: "No suppliers yet", description: "Suppliers are who you buy from. Link them on purchases to build history.", icon: Truck }}
      />

      <RecordDialog
        open={formOpen}
        title={editing ? "Edit supplier" : "New supplier"}
        description="Supplier contact details."
        submitLabel={editing ? "Update" : "Create"}
        initialValue={editing ? { ...editing } : null}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        fields={[
          { name: "name", label: "Supplier name", type: "text", required: true, half: true },
          { name: "phone", label: "Phone", type: "text", half: true },
          
          { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], half: true },
          { name: "address", label: "Address", type: "text" },
          { name: "notes", label: "Notes", type: "text" },
        ]}
      />

      <DetailsDrawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description="Supplier details"
        rows={
          detail
            ? [
                { label: "Phone", value: detail.phone || "—" },
                { label: "Address", value: detail.address || "—" },
                { label: "Products supplied", value: String(countFor(detail)) },
                { label: "Purchases", value: String(purchasesOf(detail).length) },
                { label: "Total spend", value: formatMoney(spendFor(detail)) },
                { label: "Last purchase", value: lastPurchase(detail) },
                { label: "Status", value: <StatusBadge value={detail.status} /> },
                { label: "Notes", value: detail.notes || "—" },
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
        title="Delete supplier"
        description={`${pendingDelete?.name ?? ""} will be removed from your supplier list.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => { if (pendingDelete) { deleteSupplier(pendingDelete.id); toast.success("Supplier deleted"); } }}
      />
    </TaxWorkspace>
  );
}

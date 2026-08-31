import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Plus, CreditCard, PackageCheck, RotateCcw, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useInventory,
  formatMoney,
  type InventoryPurchaseRecord,
} from "@/components/inventory/inventory-provider";
import { PurchaseItemsEditor, buildPurchaseLine, purchaseTotal, type PurchaseLine } from "@/components/inventory/purchase-items-editor";
import { RecordDialog, ConfirmDialog, str, type FieldValue } from "@/components/tax/record-dialog";
import { DetailsDrawer, StatusBadge, SummaryStrip, TaxTable, TaxWorkspace, exportCsv } from "@/components/tax/tax-workspace";
import { SourcePaymentDialog, payStateOf } from "@/components/finance/source-payment";
import { deleteLinkedPayments, fetchLinkedPaymentMap, sumCompleted } from "@/lib/finance-link";

export const Route = createFileRoute("/_authenticated/m/inventory/purchases")({ component: PurchasesPage });

const today = () => new Date().toISOString().slice(0, 10);
const purchaseNo = () => `PUR-${Date.now().toString().slice(-6)}`;

function PurchasesPage() {
  const { purchases, purchaseItems, products, suppliers, savePurchase, deletePurchase, receivePurchase, returnPurchase, movements } =
    useInventory();

  const [editing, setEditing] = useState<InventoryPurchaseRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [detail, setDetail] = useState<InventoryPurchaseRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<InventoryPurchaseRecord | null>(null);
  const [pendingReturn, setPendingReturn] = useState<InventoryPurchaseRecord | null>(null);
  const [payFor, setPayFor] = useState<InventoryPurchaseRecord | null>(null);

  // Purchases can be on credit — payment is tracked separately from the purchase itself.
  const { data: paymentMap = {}, refetch: refetchPayments } = useQuery({
    queryKey: ["linked-payments", "purchase"],
    queryFn: () => fetchLinkedPaymentMap("purchase"),
  });
  const paidOf = (row: InventoryPurchaseRecord) => sumCompleted(paymentMap[row.id] ?? []);
  const outstandingOf = (row: InventoryPurchaseRecord) => Math.max(0, row.total - paidOf(row));
  const payStateFor = (row: InventoryPurchaseRecord) => payStateOf(row.total, paidOf(row));
  const itemsOf = (row: InventoryPurchaseRecord) => purchaseItems.filter((item) => item.purchaseId === row.id);
  const isReturned = (row: InventoryPurchaseRecord) => movements.some((m) => m.reference === `RTN ${row.purchaseNo}`);

  const totalPaid = purchases.reduce((sum, row) => sum + paidOf(row), 0);
  const receivedUnits = purchases
    .filter((row) => row.status === "Received")
    .reduce((sum, row) => sum + itemsOf(row).reduce((qty, item) => qty + item.quantity, 0), 0);

  const openCreate = () => {
    setEditing(null);
    setLines([]);
    setFormOpen(true);
  };

  const openEdit = (row: InventoryPurchaseRecord) => {
    setEditing(row);
    setLines(
      itemsOf(row).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
      })),
    );
    setFormOpen(true);
  };

  const submit = (value: Record<string, FieldValue>) => {
    if (lines.length === 0) { toast.error("Add at least one purchase item"); return; }
    const supplierName = str(value.supplier);
    const supplier = suppliers.find((row) => row.name === supplierName);
    void savePurchase(
      {
        purchaseNo: editing?.purchaseNo || purchaseNo(),
        supplierId: supplier?.id ?? "",
        supplierName,
        warehouseId: editing?.warehouseId ?? "",
        purchaseDate: str(value.purchaseDate) || today(),
        total: purchaseTotal(lines),
        notes: str(value.notes),
        status: (str(value.status) as InventoryPurchaseRecord["status"]) || "Pending",
      },
      lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitCost: line.unitCost,
        lineTotal: line.lineTotal,
      })),
      editing?.id,
    ).then(() => {
      setFormOpen(false);
      toast.success(editing ? "Purchase updated" : "Purchase recorded — mark it Received to add stock");
    });
  };

  const receive = (row: InventoryPurchaseRecord) => {
    void receivePurchase(row.id).then(() => toast.success(`${row.purchaseNo} received — stock updated`));
  };

  return (
    <TaxWorkspace
      title="Purchases"
      subtitle="Goods bought from suppliers — receiving a purchase adds stock"
      icon={ShoppingBag}
      backTo="/m/inventory"
      backLabel="Back to Inventory"
      actions={
        <Button size="sm" className="h-9 bg-amber-400 text-black hover:bg-amber-300" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> New purchase
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-xs text-white/70">
        <Receipt className="h-4 w-4 text-amber-300" />
        <p className="flex-1 min-w-[220px]">
          This page is for <span className="text-white">inventory purchases</span>: supplier → products → quantity → unit cost → stock.
          Electricity, internet, rent, services and other running costs are not stock.
        </p>
        <Link to="/m/finance/expenses" className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-white hover:bg-white/15">
          Record a non-inventory cost
        </Link>
      </div>

      <SummaryStrip
        items={[
          { label: "Purchases", value: formatMoney(purchases.reduce((sum, row) => sum + row.total, 0)), hint: `${purchases.length} records`, accent: true },
          { label: "Units received", value: String(receivedUnits) },
          { label: "Paid", value: formatMoney(totalPaid), tone: "success" },
          { label: "Outstanding", value: formatMoney(purchases.reduce((sum, row) => sum + outstandingOf(row), 0)), tone: "warning" },
        ]}
      />

      <TaxTable
        rows={purchases}
        searchKeys={(row) => `${row.purchaseNo} ${row.supplierName} ${row.purchaseDate} ${row.status}`}
        filter={{
          label: "Stock status",
          options: [
            { value: "Received", label: "Received (in stock)" },
            { value: "Pending", label: "Pending (not in stock)" },
            { value: "Cancelled", label: "Cancelled" },
          ],
          match: (row, value) => row.status === value,
        }}
        columns={[
          { key: "purchaseNo", label: "Purchase", render: (row) => <span className="font-medium text-white">{row.purchaseNo}</span> },
          { key: "supplierName", label: "Supplier", render: (row) => row.supplierName || "—" },
          { key: "purchaseDate", label: "Date", hideOnMobile: true },
          { key: "items", label: "Items", hideOnMobile: true, render: (row) => `${itemsOf(row).length} · ${itemsOf(row).reduce((q, i) => q + i.quantity, 0)} units` },
          { key: "total", label: "Total", render: (row) => formatMoney(row.total) },
          { key: "status", label: "Stock", render: (row) => <StatusBadge value={row.status} /> },
          { key: "pay", label: "Payment", render: (row) => <StatusBadge value={payStateFor(row)} /> },
        ]}
        onRowClick={setDetail}
        rowActions={(row) => [
          { label: "View details", onSelect: () => setDetail(row) },
          ...(row.status !== "Received" ? [{ label: "Receive into stock", onSelect: () => receive(row) }] : []),
          ...(row.status === "Received" && !isReturned(row) ? [{ label: "Return to supplier", onSelect: () => setPendingReturn(row) }] : []),
          ...(outstandingOf(row) > 0 ? [{ label: "Pay supplier", onSelect: () => setPayFor(row) }] : []),
          { label: "Edit", onSelect: () => openEdit(row) },
          { label: "Delete", onSelect: () => setPendingDelete(row), danger: true },
        ]}
        onExport={(rows) =>
          exportCsv(
            "purchases.csv",
            ["Purchase", "Supplier", "Date", "Units", "Total", "Paid", "Outstanding", "Stock", "Payment"],
            rows.map((row) => [
              row.purchaseNo,
              row.supplierName,
              row.purchaseDate,
              itemsOf(row).reduce((q, i) => q + i.quantity, 0),
              row.total,
              paidOf(row),
              outstandingOf(row),
              row.status,
              payStateFor(row),
            ]),
          )
        }
        addLabel="New purchase"
        onAdd={openCreate}
        empty={{ title: "No purchases recorded", description: "Record what you bought, from whom and at what cost — then receive it into stock.", icon: ShoppingBag }}
      />

      <RecordDialog
        open={formOpen}
        title={editing ? `Edit ${editing.purchaseNo}` : "New purchase"}
        description="Header = supplier, date and status. Items = the products actually bought. The total comes from the items."
        submitLabel={editing ? "Update" : "Create"}
        initialValue={
          editing
            ? {
                supplier: editing.supplierName,
                purchaseDate: editing.purchaseDate,
                status: editing.status,
                notes: editing.notes,
              }
            : { purchaseDate: today(), status: "Pending" }
        }
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        fields={[
          { name: "supplier", label: "Supplier", type: "select", options: suppliers.length ? suppliers.map((row) => row.name) : ["—"], half: true },
          { name: "purchaseDate", label: "Purchase date", type: "date", required: true, half: true },
          { name: "status", label: "Status", type: "select", options: ["Pending", "Cancelled"], half: true },
          { name: "notes", label: "Notes / reference", type: "text" },
        ]}
        extra={
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Purchase items</p>
            <PurchaseItemsEditor products={products} items={lines} onChange={setLines} />
            <p className="text-[11px] text-white/45">
              Saving as <span className="text-white/70">Pending</span> records the purchase without touching stock. Use
              “Receive into stock” when the goods physically arrive.
            </p>
          </div>
        }
      />

      <DetailsDrawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.purchaseNo ?? ""}
        description="Purchase details"
        rows={
          detail
            ? [
                { label: "Supplier", value: detail.supplierName || "—" },
                { label: "Date", value: detail.purchaseDate },
                { label: "Stock status", value: <StatusBadge value={detail.status} /> },
                {
                  label: "Items",
                  value: (
                    <div className="space-y-1">
                      {itemsOf(detail).map((item) => (
                        <div key={item.id} className="text-xs text-white/80">
                          {item.productName} — {item.quantity} × {formatMoney(item.unitCost)} = {formatMoney(item.lineTotal)}
                        </div>
                      ))}
                      {itemsOf(detail).length === 0 ? <span className="text-white/50">No items</span> : null}
                    </div>
                  ),
                },
                { label: "Total", value: formatMoney(detail.total) },
                { label: "Paid", value: formatMoney(paidOf(detail)) },
                { label: "Outstanding (payable)", value: formatMoney(outstandingOf(detail)) },
                { label: "Payment", value: <StatusBadge value={payStateFor(detail)} /> },
                { label: "Returned to supplier", value: isReturned(detail) ? "Yes" : "No" },
                { label: "Notes", value: detail.notes || "—" },
              ]
            : []
        }
        footer={
          detail ? (
            <>
              {detail.status !== "Received" ? (
                <Button className="bg-emerald-500 text-black hover:bg-emerald-400" onClick={() => { receive(detail); setDetail(null); }}>
                  <PackageCheck className="mr-1.5 h-4 w-4" /> Receive into stock
                </Button>
              ) : null}
              {detail.status === "Received" && !isReturned(detail) ? (
                <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/15" onClick={() => { setPendingReturn(detail); setDetail(null); }}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Return to supplier
                </Button>
              ) : null}
              {outstandingOf(detail) > 0 ? (
                <Button className="bg-amber-400 text-black hover:bg-amber-300" onClick={() => setPayFor(detail)}>
                  <CreditCard className="mr-1.5 h-4 w-4" /> Pay supplier
                </Button>
              ) : null}
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/15" onClick={() => { openEdit(detail); setDetail(null); }}>Edit</Button>
              <Button className="bg-rose-500 text-white hover:bg-rose-400" onClick={() => { setPendingDelete(detail); setDetail(null); }}>Delete</Button>
            </>
          ) : null
        }
      />

      {payFor ? (
        <SourcePaymentDialog
          open
          onClose={() => setPayFor(null)}
          sourceType="purchase"
          sourceId={payFor.id}
          outstanding={outstandingOf(payFor)}
          direction="out"
          paymentType="Supplier Payment"
          description={`Payment for ${payFor.purchaseNo}`}
          counterparty={{ supplierName: payFor.supplierName }}
          onSaved={async () => { await refetchPayments(); setDetail(null); }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingReturn)}
        title="Return goods to supplier"
        description={`Stock for the items on ${pendingReturn?.purchaseNo ?? ""} will be reduced. The original purchase stays on record.`}
        onClose={() => setPendingReturn(null)}
        onConfirm={() => {
          if (!pendingReturn) return;
          void returnPurchase(pendingReturn.id).then(() => toast.success("Purchase return recorded — stock reduced"));
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete purchase"
        description={`${pendingDelete?.purchaseNo ?? ""} and its items will be removed. Stock already received is not reversed automatically — use “Return to supplier” for that.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const id = pendingDelete.id;
          deletePurchase(id);
          void deleteLinkedPayments("purchase", id).then(() => refetchPayments());
          toast.success("Purchase deleted");
        }}
      />
    </TaxWorkspace>
  );
}

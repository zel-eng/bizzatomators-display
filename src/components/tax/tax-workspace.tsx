import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, ChevronRight, Download, FileSpreadsheet, Filter, Home, Inbox, MoreHorizontal, MoreVertical, Package,
  Pencil, Plus, Scan, Search, ShoppingCart, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";


/* ---------------------------------- shell --------------------------------- */

export function TaxWorkspace({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  backTo = "/m/tax",
  backLabel = "Back to Tax Management",
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl pb-24 lg:pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={backTo}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/15">
            <Icon className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
            <p className="line-clamp-2 text-xs leading-snug text-white/60 sm:truncate sm:text-sm">{subtitle}</p>
          </div>
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>
        ) : null}
      </header>

      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}

/* --------------------------------- summary -------------------------------- */

export type SummaryItem = { label: string; value: string; hint?: string; accent?: boolean; tone?: "default" | "success" | "warning" | "danger" };

/**
 * Unified metrics panel — same design language as the Customer Analytics page:
 * one panel, values separated by thin dividers instead of many cards.
 */
export function SummaryStrip({ items }: { items: SummaryItem[] }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:p-6">
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-8">
        {items.map((item, i) => {
          const valueTone = item.tone === "danger"
            ? "text-rose-300"
            : item.tone === "warning"
              ? "text-amber-300"
              : item.tone === "success"
                ? "text-emerald-300"
                : item.accent
                  ? "text-amber-300"
                  : "text-white";

          return (
            <div
              key={item.label}
              className={`flex min-w-0 items-start gap-2.5 md:px-2 ${i % 4 !== 0 ? "md:border-l md:border-white/8 md:pl-6" : ""}`}
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/80" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-[10px] uppercase leading-tight tracking-wider text-white/50">{item.label}</p>
                <p className={`mt-1 break-words font-display text-base font-bold leading-tight [overflow-wrap:anywhere] sm:text-lg md:text-xl ${valueTone}`}>
                  {item.value}
                </p>
                {item.hint ? <p className="mt-1 break-words text-[11px] leading-snug text-white/40">{item.hint}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------------- status --------------------------------- */

const statusTone: Record<string, string> = {
  verified: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  reviewed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  filed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  paid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  received: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  issued: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  recorded: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  "in stock": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "low stock": "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "out of stock": "border-rose-400/30 bg-rose-400/10 text-rose-200",
  inactive: "border-white/20 bg-white/10 text-white/60",
  cancelled: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  draft: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  review: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  partial: "border-amber-400/30 bg-amber-400/10 text-amber-200",

  medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  unpaid: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  errors: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  disposed: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  high: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

export function StatusBadge({ value }: { value: string }) {
  const tone = statusTone[value.toLowerCase()] ?? "border-white/20 bg-white/10 text-white/70";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>{value}</span>;
}

/* ------------------------------- empty state ------------------------------ */

export function TaxEmptyState({
  title, description, icon: Icon, actionLabel, onAction,
}: { title: string; description: string; icon: LucideIcon; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10">
        <Icon className="h-5 w-5 text-white/70" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-white/55">{description}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-5 bg-amber-400 text-black hover:bg-amber-300">
          <Plus className="mr-1.5 h-4 w-4" /> {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------------------------- table --------------------------------- */

export type TaxColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
};

export type TaxFilter<T> = {
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
};

export type TaxRowAction = { label: string; onSelect: () => void; danger?: boolean };

export function TaxTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  filter,
  onRowClick,
  onEdit,
  onDelete,
  rowActions,
  onExport,
  empty,
  addLabel,
  onAdd,
}: {
  rows: T[];
  columns: TaxColumn<T>[];
  searchKeys: (row: T) => string;
  filter?: TaxFilter<T>;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  rowActions?: (row: T) => TaxRowAction[];
  onExport?: (rows: T[]) => void;
  empty: { title: string; description: string; icon: LucideIcon };
  addLabel?: string;
  onAdd?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filterValue, setFilterValue] = useState("all");

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !term || searchKeys(row).toLowerCase().includes(term);
      const matchesFilter = !filter || filterValue === "all" || filter.match(row, filterValue);
      return matchesQuery && matchesFilter;
    });
  }, [rows, query, filter, filterValue, searchKeys]);

  const hasActions = Boolean(onEdit || onDelete || rowActions);


  return (
    <section className="rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3">
          <Search className="h-4 w-4 shrink-0 text-white/50" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
            className="h-9 border-0 bg-transparent px-0 text-sm text-white placeholder:text-white/40 focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filter ? (
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger className="h-9 w-[9.5rem] border-white/15 bg-black/25 text-sm text-white">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-white/50" />
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{filter.label}: All</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {onExport ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 border-white/15 bg-white/5 text-white hover:bg-white/15">
                  <Download className="mr-1.5 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem onClick={() => onExport(visible)}>
                  <Download className="mr-2 h-4 w-4" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportTableRows(visible, columns, "export", "Report", "excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportTableRows(visible, columns, "export", "Report", "pdf")}>
                  <Download className="mr-2 h-4 w-4" /> PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {onAdd && addLabel ? (
            <Button size="sm" className="h-9 bg-amber-400 text-black hover:bg-amber-300" onClick={onAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> {addLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-2">
          <TaxEmptyState
            icon={rows.length === 0 ? empty.icon : Inbox}
            title={rows.length === 0 ? empty.title : "No matching records"}
            description={rows.length === 0 ? empty.description : "Adjust your search or filter to see more results."}
            actionLabel={rows.length === 0 ? addLabel : undefined}
            onAction={rows.length === 0 ? onAdd : undefined}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                {columns.map((column) => (
                  <th key={column.key} className={`px-4 py-3 font-medium ${column.hideOnMobile ? "hidden md:table-cell" : ""} ${column.className ?? ""}`}>
                    {column.label}
                  </th>
                ))}
                {hasActions ? <th className="px-4 py-3 text-right font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-t border-white/[0.07] text-white/85 transition hover:bg-white/[0.05] ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 ${column.hideOnMobile ? "hidden md:table-cell" : ""} ${column.className ?? ""}`}>
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                    </td>
                  ))}
                  {hasActions ? (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {rowActions ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(event) => event.stopPropagation()}
                                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/15"
                                aria-label="Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[10rem]">
                              {rowActions(row).map((action) => (
                                <DropdownMenuItem
                                  key={action.label}
                                  className={action.danger ? "text-rose-500 focus:text-rose-500" : ""}
                                  onClick={(event) => { event.stopPropagation(); action.onSelect(); }}
                                >
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}

                        {onEdit ? (
                          <button
                            onClick={(event) => { event.stopPropagation(); onEdit(row); }}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/15"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {onDelete ? (
                          <button
                            onClick={(event) => { event.stopPropagation(); onDelete(row); }}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-rose-200 transition hover:bg-rose-400/20"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visible.length > 0 ? (
        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/45">
          Showing {visible.length} of {rows.length} records
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------------- drawer --------------------------------- */

export function DetailsDrawer({
  open, onClose, title, description, rows, footer, icon: Icon = Package,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  rows: { label: string; value: ReactNode }[];
  footer?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        className="flex w-full flex-col gap-0 border-white/10 bg-[#0b0d12] p-0 text-white sm:max-w-md [&>button]:hidden"
      >
        <SheetHeader className="flex-row items-start gap-3 space-y-0 border-b border-white/[0.07] bg-white/[0.02] px-5 py-4 text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/10">
            <Icon className="h-5 w-5 text-amber-300" />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="font-display text-lg font-bold leading-tight text-white">{title}</SheetTitle>
            <SheetDescription className={description ? "mt-0.5 text-sm text-white/55" : "sr-only"}>
              {description ?? title}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/15 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <dl className="space-y-1">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 rounded-xl px-3 py-2.5 odd:bg-white/[0.04]">
                <dt className="text-[11px] uppercase tracking-[0.16em] text-white/45">{row.label}</dt>
                <dd className="min-w-0 break-words text-right text-sm font-medium text-white">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.07] bg-black/40 px-5 py-4">{footer}</div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- side list ------------------------------- */

export function RelatedList({
  title, items,
}: { title: string; items: { label: string; value?: string; to?: string; icon?: LucideIcon; onClick?: () => void }[] }) {
  return (
    <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-xl">
      <h3 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/60">{title}</h3>
      <ul className="mt-3 divide-y divide-white/[0.07]">
        {items.map((item) => {
          const content = (
            <>
              {item.icon ? (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/15">
                  <item.icon className="h-4 w-4 text-amber-400" />
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm text-white/85">{item.label}</span>
              {item.value ? <span className="shrink-0 text-sm font-medium text-white">{item.value}</span> : null}
              {item.to || item.onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-white/40" /> : null}
            </>
          );
          if (item.to) {
            return (
              <li key={item.label}>
                <Link to={item.to} className="flex items-center gap-3 py-3 transition hover:opacity-80">{content}</Link>
              </li>
            );
          }
          if (item.onClick) {
            return (
              <li key={item.label}>
                <button onClick={item.onClick} className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-80">{content}</button>
              </li>
            );
          }
          return <li key={item.label} className="flex items-center gap-3 py-3">{content}</li>;
        })}
      </ul>
    </section>
  );
}

/* ------------------------------- generic export helpers ------------------------------- */

const exportBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
  exportBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const aoa: (string | number)[][] = [headers, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = headers.map(() => ({ wch: 22 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Export");
  const data = XLSX.write(book, { bookType: "xlsx", type: "array" });
  exportBlob(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

export function exportPdf(filename: string, title: string, headers: string[], rows: (string | number)[][]) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const right = pageWidth - margin;
  const accent: [number, number, number] = [190, 140, 40];
  const navy: [number, number, number] = [7, 29, 53];
  const navyDeep: [number, number, number] = [2, 23, 41];
  const neutral: [number, number, number] = [31, 39, 49];
  const muted: [number, number, number] = [104, 117, 134];
  const line: [number, number, number] = [222, 228, 236];

  const setColor = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const fill = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const cleanText = (value: string | number) => String(value ?? "").slice(0, 42);

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 8, "F");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 8, pageWidth, 8, "F");

  doc.setFillColor(navyDeep[0], navyDeep[1], navyDeep[2]);
  doc.rect(0, 16, pageWidth, 92, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("BUSINESS", margin, 38);
  doc.setFontSize(27);
  doc.text(String(title).toUpperCase(), margin + 82, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(216, 181, 106);
  doc.text("AUTOMATE • OPTIMIZE • GROW", margin + 82, 56);

  doc.setFont("helvetica", "normal");
  setColor([210, 220, 230]);
  doc.text("Operational summary • Digital export", margin, 78);
  doc.text(`Generated ${new Date().toLocaleString("en-GB")}`, right, 78, { align: "right" });

  const cardY = 136;
  const cardWidth = pageWidth - margin * 2;
  const leftCardWidth = (cardWidth - 24) / 2;

  doc.setDrawColor(line[0], line[1], line[2]);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, cardY, cardWidth, 118, 12, 12, "FD");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(margin, cardY, 8, 118, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(accent);
  doc.text("DETAILS", margin + 18, cardY + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(neutral);
  doc.text("Prepared for", margin + 18, cardY + 48);
  doc.setFont("helvetica", "bold");
  doc.text(String(title), margin + 18, cardY + 64);
  doc.setFont("helvetica", "normal");
  doc.text("Business data export generated from live records", margin + 18, cardY + 82);
  doc.text(`Rows: ${rows.length}`, margin + 18, cardY + 100);

  doc.setFont("helvetica", "bold");
  setColor(accent);
  doc.text("REPORT", margin + leftCardWidth + 24, cardY + 22);
  doc.setFont("helvetica", "normal");
  setColor(neutral);
  [
    ["Reference", filename],
    ["Created", new Date().toLocaleDateString("en-GB")],
    ["Status", rows.length ? "Available" : "No data"],
  ].forEach(([label, value], index) => {
    const y = cardY + 48 + index * 18;
    doc.setFont("helvetica", "bold");
    doc.text(String(label), margin + leftCardWidth + 24, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + leftCardWidth + 138, y);
  });

  let y = 292;
  const tableWidth = pageWidth - margin * 2;
  const colWidth = tableWidth / Math.max(headers.length, 1);

  const drawTableHeader = () => {
    fill([245, 246, 250]);
    doc.rect(margin, y, tableWidth, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(muted);
    headers.forEach((header, index) => {
      doc.text(String(header).slice(0, 20), margin + 8 + colWidth * index, y + 15);
    });
    y += 24;
  };

  drawTableHeader();

  if (rows.length) {
    rows.forEach((row) => {
      if (y > pageHeight - 145) {
        doc.addPage();
        y = margin + 18;
        drawTableHeader();
      }
      doc.setDrawColor(line[0], line[1], line[2]);
      doc.line(margin, y, right, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      setColor(neutral);
      row.forEach((cell, index) => {
        doc.text(cleanText(cell), margin + 8 + colWidth * index, y + 14);
      });
      y += 20;
    });
    doc.line(margin, y, right, y);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(muted);
    doc.text("No records to display.", margin + 8, y + 18);
  }

  const summaryY = y + 18;
  const summaryX = pageWidth - 200;
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.roundedRect(summaryX, summaryY, 158, 86, 10, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor([255, 255, 255]);
  doc.text("SUMMARY", summaryX + 14, summaryY + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Records", summaryX + 14, summaryY + 42);
  doc.text(String(rows.length), summaryX + 120, summaryY + 42, { align: "right" });
  doc.text("Export", summaryX + 14, summaryY + 60);
  doc.text("PDF", summaryX + 120, summaryY + 60, { align: "right" });
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(summaryX, summaryY + 68, 158, 18, "F");
  setColor([255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.text("READY", summaryX + 14, summaryY + 81);

  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.line(right - 184, pageHeight - 120, right, pageHeight - 120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(muted);
  doc.text("Authorized signature", right - 184, pageHeight - 96);

  doc.setFillColor(navyDeep[0], navyDeep[1], navyDeep[2]);
  doc.rect(0, pageHeight - 42, pageWidth, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BIZZ AUTOMATORS", margin, pageHeight - 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 210, 220);
  doc.text("Professional business operations • Created digitally", margin + 130, pageHeight - 20);
  doc.text("Page 1", right, pageHeight - 20, { align: "right" });

  doc.save(`${filename}.pdf`);
}

export function exportTableRows<T extends { id: string }>(
  rows: T[],
  columns: Array<{ key: string; label: string; render?: (row: T) => React.ReactNode }>,
  filename = "export",
  title = "Report",
  format: "csv" | "excel" | "pdf" = "csv",
) {
  const headers = columns.map((column) => column.label);
  const data = rows.map((row) => columns.map((column) => {
    if (column.render) {
      const value = column.render(row);
      if (typeof value === "string" || typeof value === "number") return value;
      return value ? String(value) : "";
    }
    const raw = (row as Record<string, unknown>)[column.key];
    return raw == null ? "" : String(raw);
  }));

  if (format === "excel") exportExcel(`${filename}.xlsx`, headers, data);
  else if (format === "pdf") exportPdf(`${filename}.pdf`, title, headers, data);
  else exportCsv(`${filename}.csv`, headers, data);
}

export function TaxBottomNav() {
  return null;
}

import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { createChrome, INK, LINE, MARGIN, MUTED, NAVY, PANEL, type DocumentBusiness } from "@/lib/sales-pdf";

export type ReportPayload = {
  filename: string;
  title: string;
  subtitle?: string;
  summary?: [string, string][];
  headers: string[];
  rows: (string | number)[][];
  /** Registered business identity printed on the report. */
  business?: DocumentBusiness;
  /** Section this report belongs to, e.g. Invoices, Quotations, Purchases. */
  section?: string;
};


function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportReportCsv(payload: ReportPayload) {
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines: string[] = [payload.title];
  if (payload.subtitle) lines.push(payload.subtitle);
  if (payload.summary?.length) {
    lines.push("");
    payload.summary.forEach(([label, value]) => lines.push(`${escape(label)},${escape(value)}`));
  }
  lines.push("");
  lines.push(payload.headers.map(escape).join(","));
  payload.rows.forEach((row) => lines.push(row.map(escape).join(",")));
  download(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), `${payload.filename}.csv`);
}

export function exportReportExcel(payload: ReportPayload) {
  const aoa: (string | number)[][] = [[payload.title]];
  if (payload.subtitle) aoa.push([payload.subtitle]);
  if (payload.summary?.length) {
    aoa.push([]);
    payload.summary.forEach(([label, value]) => aoa.push([label, value]));
  }
  aoa.push([]);
  aoa.push(payload.headers);
  payload.rows.forEach((row) => aoa.push(row));
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = payload.headers.map(() => ({ wch: 22 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Report");
  const data = XLSX.write(book, { bookType: "xlsx", type: "array" });
  download(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${payload.filename}.xlsx`);
}

export function exportReportPdf(payload: ReportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const business: DocumentBusiness = payload.business ?? { name: payload.title };
  const generated = new Date().toLocaleString("en-GB");
  const chrome = createChrome(doc, {
    business,
    title: payload.title,
    caption: payload.section ? `${payload.section} REPORT` : "BUSINESS REPORT",
    meta: [
      ["REPORT", payload.section ?? payload.title],
      ["GENERATED", generated],
      ...(payload.subtitle ? ([["PERIOD", payload.subtitle]] as [string, string][]) : []),
    ],
    footerNote: payload.subtitle ?? `Generated ${generated}`,
  });
  const { pageWidth, right, accent } = chrome;
  let y = chrome.header(false);
  const newPage = () => {
    doc.addPage();
    y = chrome.header(true);
  };

  const usable = pageWidth - MARGIN * 2;
  const colWidth = usable / Math.max(payload.headers.length, 1);

  const drawHead = () => {
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(MARGIN, y, usable, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    payload.headers.forEach((header, index) => {
      const x = MARGIN + 10 + colWidth * index;
      const align = index === payload.headers.length - 1 ? "right" : "left";
      doc.text(
        String(header).toUpperCase(),
        align === "right" ? right - 10 : x,
        y + 13,
        align === "right" ? { align: "right" } : undefined,
      );
    });
    y += 20;
  };

  drawHead();

  payload.rows.forEach((row, rowIndex) => {
    if (y + 18 > chrome.bottomLimit) {
      newPage();
      drawHead();
    }
    if (rowIndex % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(MARGIN, y, usable, 18, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    row.forEach((cell, index) => {
      const text = String(cell ?? "");
      const last = index === payload.headers.length - 1;
      const clipped = (doc.splitTextToSize(text, colWidth - 14) as string[])[0] ?? text;
      if (last) doc.text(clipped, right - 10, y + 12, { align: "right" });
      else doc.text(clipped, MARGIN + 10 + colWidth * index, y + 12);
    });
    y += 18;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.line(MARGIN, y, right, y);
  });

  if (!payload.rows.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text("No records for this period.", MARGIN + 10, y + 16);
    y += 26;
  }

  if (payload.summary?.length) {
    const rowsPerCol = Math.ceil(payload.summary.length / 2);
    const boxHeight = 30 + rowsPerCol * 18;
    if (y + boxHeight > chrome.bottomLimit) newPage();
    y = Math.max(y + 18, chrome.bottomLimit - boxHeight);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setFillColor(PANEL[0], PANEL[1], PANEL[2]);
    doc.roundedRect(MARGIN, y, usable, boxHeight, 9, 9, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text("SUMMARY", MARGIN + 14, y + 17);
    const summaryColWidth = usable / 2;
    payload.summary.forEach(([label, value], index) => {
      const col = Math.floor(index / rowsPerCol);
      const rowY = y + 34 + (index % rowsPerCol) * 18;
      const x = MARGIN + 14 + col * summaryColWidth;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text(String(label), x, rowY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(String(value), x + summaryColWidth - 28, rowY, { align: "right" });
    });
  }

  chrome.footer();


  doc.save(`${payload.filename}.pdf`);
}

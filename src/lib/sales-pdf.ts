import jsPDF from "jspdf";

/**
 * One premium document template shared by quotations, draft quotations and
 * invoices. Preview and export both render through this single engine, so what
 * the user sees is exactly what gets exported.
 */

const MARGIN = 42;
const NAVY: RGB = [7, 29, 53];
const NAVY_DEEP: RGB = [2, 23, 41];
const NEUTRAL: RGB = [31, 39, 49];
const MUTED: RGB = [104, 117, 134];
const LINE: RGB = [226, 229, 236];

type RGB = [number, number, number];

export type PdfLine = {
  name: string;
  spec?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
  /** Optional embedded product photo (data URL). */
  imageDataUrl?: string | null;
};

export type PdfDocument = {
  kind: "INVOICE" | "QUOTATION" | "DRAFT QUOTATION";
  number: string;
  date: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  /** e.g. PAID / PARTIALLY PAID / UNPAID / OVERDUE / DRAFT */
  statusLabel?: string;
  business: {
    name: string;
    address?: string;
    phone?: string;
    registration?: string;
    logoDataUrl?: string | null;
    accent?: RGB | null;
  };
  customer: { name: string; phone?: string; address?: string; email?: string };
  lines: PdfLine[];
  subtotal: number;
  taxAmount?: number;
  /** Invoices never present tax; quotations may. */
  showTax?: boolean;
  discountAmount: number;
  otherCharges?: number;
  total: number;
  amountPaid?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  validityNote?: string;
  bankDetails?: string;
  notes?: string;
  terms?: string;
  footer?: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-TZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value || 0));

const imageFormat = (dataUrl: string) => (dataUrl.includes("image/png") ? "PNG" : "JPEG");

/** Builds the document; returns the jsPDF instance so callers can save or preview it. */
export function renderSalesDocument(data: PdfDocument): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const right = pageWidth - MARGIN;
  const accent: RGB = data.business.accent ?? [190, 140, 40];
  const isDraft = data.kind === "DRAFT QUOTATION";

  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);

  /* ---------- reusable chrome ---------- */
  const drawHeader = (compact: boolean) => {
    const top = compact ? 24 : 0;
    const logo = data.business.logoDataUrl;
    let textX = logo ? MARGIN + 50 : MARGIN;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, top, pageWidth, 150, "F");
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, top, pageWidth, 7, "F");
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, top + 7, pageWidth, 7, "F");
    if (logo) {
      try {
        doc.addImage(logo, imageFormat(logo), MARGIN, top + 38, 38, 38, undefined, "FAST");
      } catch {
        /* Logo is optional; the business name remains visible. */
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(compact ? 13 : 18);
    setColor(NAVY);
    if (data.business.name) doc.text(data.business.name, textX, top + 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setColor(accent);
    doc.text("AUTOMATE • OPTIMIZE • GROW", textX, top + 70);
    setColor(MUTED);
    const bizLines = [data.business.address, data.business.phone, data.business.registration].filter(Boolean) as string[];
    bizLines.slice(0, compact ? 1 : 3).forEach((line, index) => doc.text(line, textX, top + 88 + index * 11));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(compact ? 16 : 20);
    setColor(NAVY);
    doc.text(data.kind, right, top + 55, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(accent);
    doc.text("PRODUCTS & SERVICES", right, top + 73, { align: "right" });
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.line(right - 252, top + 86, right, top + 86);
    setColor(MUTED);
    const meta: [string, string][] = [
      [`${data.kind === "INVOICE" ? "INVOICE" : "QUOTATION"} NO.`, data.number],
      ["ISSUE DATE", data.date],
      ...(data.secondaryLabel && data.secondaryValue ? [[data.secondaryLabel.toUpperCase(), data.secondaryValue] as [string, string]] : []),
    ];
    meta.slice(0, compact ? 1 : 3).forEach((line, index) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(line[0], right - 252, top + 105 + index * 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(line[1], right, top + 105 + index * 17, { align: "right" });
    });

    return top + 160;
  };

  const drawFooter = () => {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.line(MARGIN, pageHeight - 46, right, pageHeight - 46);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(MUTED);
      const contact = [data.business.name, data.business.phone, data.business.address].filter(Boolean).join("  ·  ");
      doc.text(contact, MARGIN, pageHeight - 32);
      doc.text(`Page ${page} of ${pages}`, right, pageHeight - 32, { align: "right" });
      const note =
        data.footer ??
        (data.kind === "INVOICE" ? "Thank you for your business." : "This offer is valid until the date shown above.");
      doc.text(note, MARGIN, pageHeight - 21);
    }
  };

  const drawWatermark = () => {
    if (!isDraft) return;
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(78);
      doc.setTextColor(238, 240, 245);
      doc.text("DRAFT", pageWidth / 2, pageHeight / 2, { align: "center", angle: 28 });
    }
  };

  let y = drawHeader(false);

  const newPage = () => {
    doc.addPage();
    y = drawHeader(true);
  };

  const ensure = (needed: number) => {
    if (y + needed > pageHeight - 150) newPage();
  };

  /* ---------- status pill ---------- */
  if (data.statusLabel) {
    const label = data.statusLabel.toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const width = doc.getTextWidth(label) + 20;
    fill(accent);
    doc.roundedRect(right - width, y - 4, width, 18, 9, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, right - width / 2, y + 8, { align: "center" });
    y += 22;
  }

  /* ---------- parties ---------- */
  const colWidth = (pageWidth - MARGIN * 2 - 24) / 2;
  const partyBlock = (x: number, heading: string, lines: string[], cardHeight: number, emptyLabel: string) => {
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y - 18, colWidth, cardHeight, 10, 10, "FD");
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(x, y - 18, 5, cardHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(accent);
    doc.text(heading, x + 16, y);
    doc.setFontSize(11);
    setColor(NEUTRAL);
    doc.text(lines[0] || emptyLabel, x + 16, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setColor(MUTED);
    lines.slice(1).forEach((line, index) => doc.text(doc.splitTextToSize(line, colWidth - 30)[0], x + 16, y + 30 + index * 11));
  };

  const customerLines = [
    data.customer.name || "Walk-in customer",
    ...([data.customer.address, data.customer.phone, data.customer.email].filter(Boolean) as string[]),
  ];
  const fromLines = [
    data.business.name || "",
    ...([data.business.address, data.business.phone, data.business.registration].filter(Boolean) as string[]),
  ];
  const partyHeight = 42 + Math.max(customerLines.length, fromLines.length) * 11;
  partyBlock(MARGIN, data.kind === "INVOICE" ? "BILL TO" : "PREPARED FOR", customerLines, partyHeight, "Walk-in customer");
  partyBlock(MARGIN + colWidth + 24, "FROM", fromLines, partyHeight, "");
  y += partyHeight + 16;

  const termItems = [
    data.paymentTerms ? ["PAYMENT TERMS", data.paymentTerms] : null,
    data.deliveryTerms ? ["DELIVERY", data.deliveryTerms] : null,
    data.validityNote ? ["VALIDITY", data.validityNote] : null,
    ["CURRENCY", "TZS — Tanzanian Shilling"],
  ].filter(Boolean) as [string, string][];
  if (termItems.length) {
    const termWidth = (pageWidth - MARGIN * 2) / termItems.length;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(MARGIN, y, pageWidth - MARGIN * 2, 62, 10, 10, "FD");
    termItems.forEach(([heading, value], index) => {
      const x = MARGIN + index * termWidth;
      if (index > 0) doc.line(x, y + 12, x, y + 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      setColor(NAVY);
      doc.text(heading, x + 14, y + 23);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(MUTED);
      doc.text(doc.splitTextToSize(value, termWidth - 28)[0], x + 14, y + 41);
    });
    y += 78;
  }

  /* ---------- items table ---------- */
  const hasImages = data.lines.some((line) => Boolean(line.imageDataUrl));
  const colTotal = right;
  const colDisc = right - 74;
  const colPrice = right - 134;
  const colQty = right - 194;
  const itemX = MARGIN + 8;
  const imgSize = 26;
  const nameX = hasImages ? itemX + imgSize + 8 : itemX;
  const nameWidth = colQty - nameX - 24;

  const tableHead = () => {
    fill(NAVY);
    doc.rect(MARGIN, y, pageWidth - MARGIN * 2, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("#", MARGIN + 8, y + 14);
    doc.text("PRODUCT / SERVICE", itemX, y + 14);
    if (hasImages) doc.text("DESCRIPTION", nameX + 116, y + 14);
    doc.text("QTY", colQty, y + 14, { align: "right" });
    doc.text("UNIT PRICE", colPrice, y + 14, { align: "right" });
    doc.text("DISC.", colDisc, y + 14, { align: "right" });
    doc.text("TOTAL", colTotal - 8, y + 14, { align: "right" });
    y += 22;
  };

  tableHead();

  data.lines.forEach((line, index) => {
    const descText = [line.description, line.spec].filter(Boolean).join(" · ");
    const descLines = descText ? (doc.splitTextToSize(descText, nameWidth) as string[]).slice(0, 3) : [];
    const rowHeight = Math.max(hasImages ? imgSize + 12 : 24, 22 + descLines.length * 10);
    if (y + rowHeight > pageHeight - 120) {
      newPage();
      tableHead();
    }
    if (hasImages && line.imageDataUrl) {
      try {
        doc.addImage(line.imageDataUrl, imageFormat(line.imageDataUrl), itemX, y + 6, imgSize, imgSize, undefined, "FAST");
      } catch {
        /* unreadable image: fall back to text-only row */
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    setColor(NEUTRAL);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setColor(MUTED);
    doc.text(String(index + 1), MARGIN + 8, y + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    setColor(NEUTRAL);
    doc.text((doc.splitTextToSize(line.name, nameWidth) as string[])[0] ?? line.name, nameX, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(String(line.quantity), colQty, y + 16, { align: "right" });
    doc.text(money(line.unitPrice), colPrice, y + 16, { align: "right" });
    doc.text(line.discount ? money(line.discount) : "—", colDisc, y + 16, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(money(line.lineTotal), colTotal - 8, y + 16, { align: "right" });
    if (descLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(MUTED);
      descLines.forEach((text, index) => doc.text(text, nameX, y + 28 + index * 10));
    }
    y += rowHeight;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.line(MARGIN, y, right, y);
  });

  /* ---------- summary ---------- */
  ensure(120);
  y += 20;
  const rows: [string, string][] = [["Subtotal", money(data.subtotal)]];
  if (data.showTax && data.taxAmount) rows.push(["Tax", money(data.taxAmount)]);
  if (data.discountAmount) rows.push(["Discount", `- ${money(data.discountAmount)}`]);
  if (data.otherCharges) rows.push(["Other charges", money(data.otherCharges)]);
  doc.setFontSize(9.5);
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    setColor(MUTED);
    doc.text(label, colPrice, y, { align: "right" });
    setColor(NEUTRAL);
    doc.text(value, colTotal - 8, y, { align: "right" });
    y += 15;
  });

  fill(NEUTRAL);
  doc.rect(colPrice - 110, y - 2, right - (colPrice - 110), 30, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", colPrice, y + 18, { align: "right" });
  setColor(accent);
  doc.text(`TZS ${money(data.total)}`, colTotal - 8, y + 18, { align: "right" });
  y += 44;

  if (typeof data.amountPaid === "number") {
    ensure(46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setColor(MUTED);
    doc.text(`Amount paid: TZS ${money(data.amountPaid)}`, colTotal - 8, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    setColor(NEUTRAL);
    doc.text(`Balance due: TZS ${money(Math.max(0, data.total - data.amountPaid))}`, colTotal - 8, y + 14, { align: "right" });
    y += 34;
  }

  /* ---------- terms & notes (optional only) ---------- */
  const sections: [string, string][] = [];
  if (data.paymentTerms) sections.push(["PAYMENT TERMS", data.paymentTerms]);
  if (data.deliveryTerms) sections.push(["DELIVERY TERMS", data.deliveryTerms]);
  if (data.validityNote) sections.push(["VALIDITY", data.validityNote]);
  if (data.bankDetails) sections.push(["PAYMENT DETAILS", data.bankDetails]);
  if (data.notes) sections.push(["NOTES", data.notes]);
  if (data.terms) sections.push(["TERMS & CONDITIONS", data.terms]);

  sections.forEach(([heading, body]) => {
    const bodyLines = doc.splitTextToSize(body, pageWidth - MARGIN * 2) as string[];
    ensure(24 + bodyLines.length * 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(MUTED);
    doc.text(heading, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(NEUTRAL);
    bodyLines.forEach((text, index) => doc.text(text, MARGIN, y + 14 + index * 11));
    y += 22 + bodyLines.length * 11;
  });

  /* ---------- signature ---------- */
  ensure(70);
  y += 12;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(right - 190, y + 26, right, y + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(MUTED);
  doc.text("Authorized signature", right - 190, y + 38);
  if (data.business.name) doc.text(data.business.name, right - 190, y + 49);

  drawWatermark();
  drawFooter();
  return doc;
}

/** Object URL for an in-app preview that matches the exported file exactly. */
export function salesDocumentPreviewUrl(data: PdfDocument) {
  return renderSalesDocument(data).output("bloburl") as unknown as string;
}

/** Build and download the document. */
export function buildSalesDocumentPdf(data: PdfDocument, fileName: string) {
  renderSalesDocument(data).save(fileName);
}

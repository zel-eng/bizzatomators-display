import jsPDF from "jspdf";

/**
 * One premium document template, modelled on the approved sample layout.
 * Every generated PDF in the system (invoices, quotations, drafts, purchases,
 * product lists and reports) is drawn with this same chrome so preview and
 * export always match and always carry the registered business identity.
 */

export type RGB = [number, number, number];

export const NAVY: RGB = [7, 29, 53];
export const NAVY_SOFT: RGB = [18, 56, 94];
export const GOLD: RGB = [185, 130, 32];
export const INK: RGB = [31, 39, 49];
export const MUTED: RGB = [104, 117, 134];
export const LINE: RGB = [221, 227, 234];
export const PANEL: RGB = [247, 249, 251];

export const MARGIN = 34;

export type DocumentBusiness = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  registration?: string;
  logoDataUrl?: string | null;
  accent?: RGB | null;
};

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
  /** Document heading, e.g. INVOICE / SALES QUOTATION / PURCHASE ORDER. */
  kind: string;
  /** Small gold caption under the heading. */
  caption?: string;
  number: string;
  date: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  statusLabel?: string;
  business: DocumentBusiness;
  customer: { name: string; phone?: string; address?: string; email?: string };
  /** Heading of the left party card. Defaults by document kind. */
  customerHeading?: string;
  lines: PdfLine[];
  /** Force product thumbnails on/off. Defaults to "show when available". */
  showImages?: boolean;
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
  currency?: string;
};

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    Math.round(Number(value) || 0),
  );

const imageFormat = (dataUrl: string) => (dataUrl.includes("image/png") ? "PNG" : "JPEG");

const clean = (value?: string | null) => (value ? String(value).trim() : "");

/** Shared page chrome: brand bars, business header, document meta, footer. */
export type ChromeOptions = {
  business: DocumentBusiness;
  title: string;
  caption?: string;
  meta?: [string, string][];
  footerNote?: string;
};

export type Chrome = {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  right: number;
  accent: RGB;
  /** Draws header on the current page and returns the first free y. */
  header: (compact: boolean) => number;
  footer: () => void;
  bottomLimit: number;
};

export function createChrome(doc: jsPDF, options: ChromeOptions): Chrome {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const right = pageWidth - MARGIN;
  const accent: RGB = options.business.accent ?? GOLD;
  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  const header = (compact: boolean) => {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 0, pageWidth, 5, "F");
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 5, pageWidth, 5, "F");

    const logo = options.business.logoDataUrl;
    const logoSize = compact ? 22 : 30;
    let textX = MARGIN;
    const top = compact ? 22 : 30;
    if (logo) {
      try {
        doc.addImage(logo, imageFormat(logo), MARGIN, top, logoSize, logoSize, undefined, "FAST");
        textX = MARGIN + logoSize + 10;
      } catch {
        /* logo optional */
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(compact ? 11.5 : 14);
    setColor(NAVY);
    const name = clean(options.business.name) || "Business";
    doc.text(name.toUpperCase(), textX, top + (compact ? 12 : 14));

    if (!compact) {
      const contacts = [
        clean(options.business.address),
        [clean(options.business.phone), clean(options.business.email)].filter(Boolean).join("  •  "),
        clean(options.business.registration),
      ].filter(Boolean);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(MUTED);
      contacts.forEach((text, index) =>
        doc.text((doc.splitTextToSize(text, 250) as string[])[0], textX, top + 28 + index * 10),
      );
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(compact ? 13 : 19);
    setColor(NAVY);
    doc.text(options.title.toUpperCase(), right, top + (compact ? 12 : 16), { align: "right" });

    if (!compact) {
      if (options.caption) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        setColor(accent);
        doc.text(options.caption.toUpperCase(), right, top + 29, { align: "right" });
      }
      const meta = (options.meta ?? []).slice(0, 3);
      const metaLeft = right - 200;
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.line(metaLeft, top + 37, right, top + 37);
      meta.forEach(([label, value], index) => {
        const rowY = top + 51 + index * 14;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        setColor(NAVY);
        doc.text(label.toUpperCase(), metaLeft, rowY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setColor(INK);
        doc.text(value, right, rowY, { align: "right" });
      });
      const metaBottom = top + 51 + Math.max(meta.length, 1) * 14;
      const headerBottom = Math.max(metaBottom, top + 70);
      return headerBottom + 16;
    }
    return top + 34;
  };

  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.rect(0, pageHeight - 34, pageWidth, 34, "F");
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(0, pageHeight - 36, pageWidth, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text((clean(options.business.name) || "Business").toUpperCase(), MARGIN, pageHeight - 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(191, 203, 218);
      const contact = [clean(options.business.address), clean(options.business.phone)].filter(Boolean).join("  •  ");
      if (contact) doc.text(contact, MARGIN, pageHeight - 10);
      if (options.footerNote) {
        doc.setTextColor(214, 224, 235);
        doc.text((doc.splitTextToSize(options.footerNote, 240) as string[])[0], right, pageHeight - 20, {
          align: "right",
        });
      }
      doc.setTextColor(191, 203, 218);
      doc.text(`Page ${page} of ${pages}`, right, pageHeight - 10, { align: "right" });
    }
  };

  return { doc, pageWidth, pageHeight, right, accent, header, footer, bottomLimit: pageHeight - 56 };
}

/** Builds the document; returns the jsPDF instance so callers can save or preview it. */
export function renderSalesDocument(data: PdfDocument): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const currency = data.currency ?? "TZS";
  const isDraft = /draft/i.test(data.kind);
  const isInvoice = /invoice/i.test(data.kind);

  const meta: [string, string][] = [
    [isInvoice ? "INVOICE NO." : "DOCUMENT NO.", data.number],
    ["ISSUE DATE", data.date],
  ];
  if (data.secondaryLabel && data.secondaryValue) meta.push([data.secondaryLabel, data.secondaryValue]);

  const chrome = createChrome(doc, {
    business: data.business,
    title: data.kind,
    caption: data.caption ?? "PRODUCTS & SERVICES",
    meta,
    footerNote:
      data.footer ?? (isInvoice ? "Thank you for your business." : "Valid until the date stated above."),
  });
  const { pageWidth, pageHeight, right, accent } = chrome;
  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);

  let y = chrome.header(false);
  const newPage = () => {
    doc.addPage();
    y = chrome.header(true);
  };
  const ensure = (needed: number) => {
    if (y + needed > chrome.bottomLimit) newPage();
  };

  /* ---------- status pill ---------- */
  if (data.statusLabel) {
    const label = data.statusLabel.toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const width = doc.getTextWidth(label) + 20;
    fill(accent);
    doc.roundedRect(right - width, y - 4, width, 16, 8, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, right - width / 2, y + 7, { align: "center" });
    y += 20;
  }

  /* ---------- parties ---------- */
  const customerLines = [
    clean(data.customer.name) || "Walk-in customer",
    ...([clean(data.customer.address), clean(data.customer.phone), clean(data.customer.email)].filter(
      Boolean,
    ) as string[]),
  ];
  const fromLines = [
    clean(data.business.name),
    ...([clean(data.business.address), clean(data.business.phone), clean(data.business.registration)].filter(
      Boolean,
    ) as string[]),
  ];
  const cardWidth = (pageWidth - MARGIN * 2 - 16) / 2;
  const cardHeight = 34 + Math.max(customerLines.length, fromLines.length) * 11;

  const partyCard = (x: number, heading: string, lines: string[]) => {
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 8, 8, "FD");
    fill(accent);
    doc.rect(x, y + 4, 4, cardHeight - 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(accent);
    doc.text(heading.toUpperCase(), x + 14, y + 16);
    doc.setFontSize(10);
    setColor(NAVY);
    doc.text((doc.splitTextToSize(lines[0] || "—", cardWidth - 26) as string[])[0], x + 14, y + 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(MUTED);
    lines
      .slice(1)
      .forEach((line, index) =>
        doc.text((doc.splitTextToSize(line, cardWidth - 26) as string[])[0], x + 14, y + 43 + index * 11),
      );
  };

  partyCard(MARGIN, data.customerHeading ?? (isInvoice ? "BILL TO" : "PREPARED FOR"), customerLines);
  partyCard(MARGIN + cardWidth + 16, "FROM", fromLines);
  y += cardHeight + 14;

  /* ---------- terms strip ---------- */
  const strip: [string, string][] = [];
  if (data.paymentTerms) strip.push(["PAYMENT TERMS", data.paymentTerms]);
  if (data.deliveryTerms) strip.push(["DELIVERY", data.deliveryTerms]);
  if (data.validityNote) strip.push(["VALIDITY", data.validityNote]);
  strip.push(["CURRENCY", currency]);
  if (strip.length > 1) {
    const stripWidth = (pageWidth - MARGIN * 2) / strip.length;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    fill(PANEL);
    doc.roundedRect(MARGIN, y, pageWidth - MARGIN * 2, 46, 8, 8, "FD");
    strip.forEach(([heading, value], index) => {
      const x = MARGIN + index * stripWidth;
      if (index > 0) doc.line(x, y + 10, x, y + 36);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      setColor(NAVY);
      doc.text(heading, x + 12, y + 19);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(MUTED);
      doc.text((doc.splitTextToSize(value, stripWidth - 24) as string[])[0], x + 12, y + 33);
    });
    y += 60;
  }

  /* ---------- items table ---------- */
  const hasImages =
    data.showImages ?? data.lines.some((line) => Boolean(line.imageDataUrl));
  const colTotal = right - 8;
  const colPrice = right - 96;
  const colQty = right - 166;
  const itemX = MARGIN + 26;
  const imgSize = 26;
  const nameX = hasImages ? itemX + imgSize + 8 : itemX;
  const nameWidth = colQty - nameX - 44;

  const tableHead = () => {
    fill(NAVY);
    doc.rect(MARGIN, y, pageWidth - MARGIN * 2, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("#", MARGIN + 10, y + 13);
    doc.text("PRODUCT / SERVICE", itemX, y + 13);
    doc.text("QTY", colQty, y + 13, { align: "right" });
    doc.text("UNIT PRICE", colPrice, y + 13, { align: "right" });
    doc.text("AMOUNT", colTotal, y + 13, { align: "right" });
    y += 20;
  };

  tableHead();

  data.lines.forEach((line, index) => {
    const descText = [clean(line.description), clean(line.spec)].filter(Boolean).join(" · ");
    const descLines = descText ? (doc.splitTextToSize(descText, nameWidth) as string[]).slice(0, 2) : [];
    const rowHeight = Math.max(hasImages ? imgSize + 12 : 22, 20 + descLines.length * 9);
    if (y + rowHeight > chrome.bottomLimit) {
      newPage();
      tableHead();
    }
    if (index % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(MARGIN, y, pageWidth - MARGIN * 2, rowHeight, "F");
    }
    if (hasImages) {
      doc.setFillColor(241, 244, 247);
      doc.roundedRect(itemX, y + 5, imgSize, imgSize, 4, 4, "F");
      if (line.imageDataUrl) {
        try {
          doc.addImage(line.imageDataUrl, imageFormat(line.imageDataUrl), itemX, y + 5, imgSize, imgSize, undefined, "FAST");
        } catch {
          /* unreadable image: keep the placeholder tile */
        }
      }
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(MUTED);
    doc.text(String(index + 1), MARGIN + 10, y + 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(NAVY);
    doc.text((doc.splitTextToSize(line.name || "—", nameWidth) as string[])[0], nameX, y + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(INK);
    doc.text(String(line.quantity), colQty, y + 15, { align: "right" });
    doc.text(money(line.unitPrice), colPrice, y + 15, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(money(line.lineTotal), colTotal, y + 15, { align: "right" });
    if (descLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setColor(MUTED);
      descLines.forEach((text, i) => doc.text(text, nameX, y + 26 + i * 9));
    }
    y += rowHeight;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.line(MARGIN, y, right, y);
  });

  /* ---------- notes card + summary card ---------- */
  const noteBlocks: [string, string][] = [];
  if (data.notes) noteBlocks.push(["NOTES", data.notes]);
  if (data.terms) noteBlocks.push(["TERMS & CONDITIONS", data.terms]);
  if (data.bankDetails) noteBlocks.push(["PAYMENT DETAILS", data.bankDetails]);

  const summaryRows: [string, string][] = [["SUBTOTAL", money(data.subtotal)]];
  if (data.showTax && data.taxAmount) summaryRows.push(["TAX", money(data.taxAmount)]);
  if (data.discountAmount) summaryRows.push(["DISCOUNT", `- ${money(data.discountAmount)}`]);
  if (data.otherCharges) summaryRows.push(["OTHER CHARGES", money(data.otherCharges)]);
  if (typeof data.amountPaid === "number") {
    summaryRows.push(["AMOUNT PAID", money(data.amountPaid)]);
    summaryRows.push(["BALANCE DUE", money(Math.max(0, data.total - data.amountPaid))]);
  }

  const summaryWidth = 216;
  const notesWidth = pageWidth - MARGIN * 2 - summaryWidth - 16;
  const summaryHeight = 26 + summaryRows.length * 17 + 34;

  let notesHeight = 0;
  const notesRendered = noteBlocks.map(([heading, body]) => {
    const lines = (doc.splitTextToSize(body, notesWidth - 28) as string[]).slice(0, 6);
    notesHeight += 22 + lines.length * 10;
    return [heading, lines] as [string, string[]];
  });
  if (notesRendered.length) notesHeight += 12;

  const blockHeight = Math.max(summaryHeight, notesHeight);
  ensure(blockHeight + 60);
  y += 18;
  const blockTop = y;

  if (notesRendered.length) {
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    fill(PANEL);
    doc.roundedRect(MARGIN, blockTop, notesWidth, notesHeight, 9, 9, "FD");
    let ny = blockTop + 18;
    notesRendered.forEach(([heading, lines]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setColor(accent);
      doc.text(heading, MARGIN + 14, ny);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(INK);
      lines.forEach((text, index) => doc.text(text, MARGIN + 14, ny + 12 + index * 10));
      ny += 22 + lines.length * 10;
    });
  }

  const summaryX = pageWidth - MARGIN - summaryWidth;
  fill(NAVY);
  doc.roundedRect(summaryX, blockTop, summaryWidth, summaryHeight, 9, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("SUMMARY", summaryX + 16, blockTop + 18);
  summaryRows.forEach(([label, value], index) => {
    const rowY = blockTop + 36 + index * 17;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(216, 224, 233);
    doc.text(label, summaryX + 16, rowY);
    doc.setTextColor(255, 255, 255);
    doc.text(value, summaryX + summaryWidth - 16, rowY, { align: "right" });
    doc.setDrawColor(54, 80, 107);
    doc.line(summaryX + 16, rowY + 5, summaryX + summaryWidth - 16, rowY + 5);
  });
  fill(accent);
  doc.roundedRect(summaryX, blockTop + summaryHeight - 32, summaryWidth, 32, 9, 9, "F");
  doc.rect(summaryX, blockTop + summaryHeight - 32, summaryWidth, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL (${currency})`, summaryX + 16, blockTop + summaryHeight - 12);
  doc.setFontSize(12);
  doc.text(money(data.total), summaryX + summaryWidth - 16, blockTop + summaryHeight - 12, { align: "right" });

  y = blockTop + blockHeight + 24;

  /* ---------- signature ---------- */
  ensure(48);
  doc.setDrawColor(36, 58, 82);
  doc.line(right - 170, y + 18, right, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColor(NAVY);
  doc.text("AUTHORIZED SIGNATURE", right - 85, y + 30, { align: "center" });
  setColor(MUTED);
  if (data.business.name) doc.text(data.business.name, right - 85, y + 40, { align: "center" });

  /* ---------- draft watermark ---------- */
  if (isDraft) {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(78);
      doc.setTextColor(238, 240, 245);
      doc.text("DRAFT", pageWidth / 2, pageHeight / 2, { align: "center", angle: 28 });
    }
  }

  chrome.footer();
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

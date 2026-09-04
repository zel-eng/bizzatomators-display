import { useEffect, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModernDialog } from "@/components/ui/modern-dialog";
import { buildSalesDocumentPdf, salesDocumentPreviewUrl, type PdfDocument } from "@/lib/sales-pdf";

/**
 * Preview + export in one place. The preview renders the very same PDF that is
 * exported, so the user always sees exactly what they will get.
 */
export function DocumentPreviewDialog({
  open,
  document,
  fileName,
  onClose,
}: {
  open: boolean;
  document: PdfDocument | null;
  fileName: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !document) { setUrl(null); return; }
    try {
      setUrl(salesDocumentPreviewUrl(document));
    } catch {
      setUrl(null);
    }
  }, [open, document]);

  return (
    <ModernDialog
      open={open}
      onClose={onClose}
      title={document ? `${document.kind} ${document.number}` : "Document"}
      description="Preview matches the exported PDF exactly."
      icon={FileText}
      size="2xl"
      footer={
        <>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-white/10 bg-white/[0.06] text-white hover:bg-white/15"
            onClick={onClose}
          >
            Close <X className="ml-1.5 h-4 w-4" />
          </Button>
          <Button
            className="h-11 rounded-xl bg-amber-400 font-semibold text-black hover:bg-amber-300"
            onClick={() => { if (document) buildSalesDocumentPdf(document, fileName); }}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export PDF
          </Button>
        </>
      }
    >
      <div className="h-[65vh] overflow-hidden rounded-xl border border-white/10 bg-white">
        {url ? (
          <iframe title="Document preview" src={url} className="h-full w-full" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-neutral-500">Preparing preview…</div>
        )}
      </div>
    </ModernDialog>
  );
}

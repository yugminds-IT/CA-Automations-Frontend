"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ImportLeadsResult, importLeads } from "@/lib/api/leads";
import { csvRecords } from "@/lib/csv";

/** The server accepts up to this many rows per import. */
export const MAX_IMPORT_ROWS = 500;

type ImportRow = Record<"name" | "email" | "phone" | "company" | "source" | "value", string>;

/** Header names people actually use in spreadsheets, in order of preference. */
const ALIASES: Record<keyof ImportRow, string[]> = {
  name: ["name", "full name", "lead name"],
  email: ["email", "e-mail", "email address"],
  phone: ["phone", "mobile", "phone number"],
  company: ["company", "organisation", "organization", "company name"],
  source: ["source", "lead source"],
  value: ["value", "amount", "deal value"],
};

function pick(record: Record<string, string>, names: string[]): string {
  for (const n of names) if (record[n]) return record[n];
  return "";
}

/** Maps one spreadsheet row onto the lead fields. Exported for tests. */
export function toImportRow(record: Record<string, string>): ImportRow {
  return {
    name: pick(record, ALIASES.name),
    email: pick(record, ALIASES.email),
    phone: pick(record, ALIASES.phone),
    company: pick(record, ALIASES.company),
    source: pick(record, ALIASES.source),
    value: pick(record, ALIASES.value),
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUnitId: number | null;
  businessUnitName: string;
  onImported: () => void;
}

export function ImportLeadsDialog({ open, onOpenChange, businessUnitId, businessUnitName, onImported }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportLeadsResult | null>(null);

  const reset = () => {
    setRows([]);
    setFileName("");
    setResult(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    setResult(null);
    if (!file) return;
    const text = await file.text();
    const parsed = csvRecords(text).map(toImportRow);
    setFileName(file.name);
    setRows(parsed);
  };

  const handleImport = async () => {
    if (businessUnitId == null || rows.length === 0) return;
    setBusy(true);
    try {
      const res = await importLeads(businessUnitId, rows);
      setResult(res);
      if (res.created > 0) onImported();
      toast({ title: `Imported ${res.created} lead${res.created === 1 ? "" : "s"}` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const tooMany = rows.length > MAX_IMPORT_ROWS;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import leads into {businessUnitName || "this unit"}</DialogTitle>
          <DialogDescription>
            Upload a CSV with a header row. Use name, and an email or phone. Optional: company, source, value.
            Duplicates of existing leads are skipped and listed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {rows.length > 0 && !result && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{fileName}</span>: {rows.length} row{rows.length === 1 ? "" : "s"} found.
              </p>
              {tooMany ? (
                <p className="text-destructive">
                  Import up to {MAX_IMPORT_ROWS} rows at a time. Split the file and import each part.
                </p>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
                  {rows.slice(0, 5).map((r, i) => (
                    <li key={i}>
                      {r.name || <span className="text-muted-foreground">(no name)</span>} · {r.email || r.phone || "no contact"}
                    </li>
                  ))}
                  {rows.length > 5 && <li className="text-muted-foreground">…and {rows.length - 5} more</li>}
                </ul>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-3 text-sm">
              <p>
                Created <span className="font-medium">{result.created}</span>
                {" · "}Duplicates skipped <span className="font-medium">{result.duplicates.length}</span>
                {" · "}Refused <span className="font-medium">{result.failed.length}</span>
              </p>
              {(result.duplicates.length > 0 || result.failed.length > 0) && (
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
                  {[...result.duplicates, ...result.failed]
                    .sort((a, b) => a.line - b.line)
                    .map((issue) => (
                      <li key={issue.line}>
                        Line {issue.line}: {issue.reason}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={busy || rows.length === 0 || tooMany || businessUnitId == null}>
              {busy ? "Importing…" : `Import ${rows.length || ""}`.trim()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit } from "@/lib/api/business-units";
import type { OrgUnit } from "@/lib/api/units";
import { UnitBrandPicker } from "@/components/staff/unit-brand-picker";
import { BulkInviteResult, PermissionProfile, Team, bulkInviteStaff } from "@/lib/api/access";
import { defaultProfileId } from "@/lib/access";

const EXAMPLE = "name,email,role,profile\nAsha Rao,asha@example.com,staff,Sales Executive\nBen Cole,ben@example.com,accountant,Read-only";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

/** Paste or upload a CSV of people to invite. Nobody is invited unless every row is valid. */
export function BulkInviteDialog({
  open,
  onOpenChange,
  profiles,
  units,
  orgUnits,
  teams,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profiles: PermissionProfile[];
  units: BusinessUnit[];
  orgUnits: OrgUnit[];
  teams: Team[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [csv, setCsv] = useState("");
  const [profileId, setProfileId] = useState<number | undefined>(undefined);
  const [unitIds, setUnitIds] = useState<number[]>([]);
  const [orgUnitIds, setOrgUnitIds] = useState<number[]>([]);
  const [teamId, setTeamId] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<"email" | "temporary_password">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkInviteResult | null>(null);

  const reset = () => {
    setCsv("");
    setUnitIds([]);
    setOrgUnitIds([]);
    setTeamId(undefined);
    setMode("email");
    setError(null);
    setResult(null);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setCsv(await file.text());
  };

  const submit = async () => {
    if (!csv.trim()) {
      setError("Paste the list, or upload a CSV file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await bulkInviteStaff({
        csv,
        defaultProfileId: profileId ?? defaultProfileId(profiles),
        businessUnitIds: unitIds,
        orgUnitIds,
        teamId,
        mode,
      });
      setResult(res);
      if (res.invited > 0) onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const copyResults = () => {
    if (!result) return;
    const lines = result.results
      .filter((r) => r.ok)
      .map((r) => {
        const extra = r.temporaryPassword
          ? `password: ${r.temporaryPassword}`
          : r.inviteLink
            ? `link: ${r.inviteLink}`
            : "email sent";
        return `${r.email}  ${extra}`;
      });
    navigator.clipboard.writeText(lines.join("\n")).then(() => toast({ title: "Copied" }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite many people</DialogTitle>
          <DialogDescription>
            One person per line. Columns: name and email (required), role (staff, accountant or admin) and profile (a profile name).
            Up to 100 people at a time. If any row is wrong, nobody is invited.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">List</Label>
                <label className="cursor-pointer text-xs text-primary underline">
                  Upload a CSV file
                  <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
                </label>
              </div>
              <textarea
                className="mt-1 min-h-[160px] w-full rounded-md border bg-background p-3 font-mono text-xs"
                value={csv}
                placeholder={EXAMPLE}
                onChange={(e) => setCsv(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-semibold">Default profile</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={profileId ?? defaultProfileId(profiles) ?? ""}
                  onChange={(e) => setProfileId(Number(e.target.value))}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">Used for rows with no profile.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Team</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={teamId ?? ""}
                  onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">No team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">How they get in</Label>
                <div className="mt-1 space-y-1 text-xs">
                  <label className="flex items-center gap-2"><input type="radio" checked={mode === "email"} onChange={() => setMode("email")} /> Email each a link</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={mode === "temporary_password"} onChange={() => setMode("temporary_password")} /> Show temporary passwords</label>
                </div>
              </div>
            </div>
            {units.length > 0 && (
            <div>
              <Label className="text-xs font-semibold">{orgUnits.length > 1 ? "Units and brands for everyone" : "Brands for everyone"}</Label>
              <UnitBrandPicker
                orgUnits={orgUnits}
                brands={units}
                brandIds={unitIds}
                orgUnitIds={orgUnitIds}
                onChange={(next) => {
                  setUnitIds(next.brandIds);
                  setOrgUnitIds(next.orgUnitIds);
                }}
              />
            </div>
            )}
            {error && (
              <p role="alert" className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-semibold">{result.invited}</span> invited
              {result.failed > 0 && <>, <span className="font-semibold text-red-600">{result.failed}</span> not invited</>}.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Line</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.results.map((r) => (
                  <TableRow key={`${r.line}-${r.email}`}>
                    <TableCell className="text-xs">{r.line}</TableCell>
                    <TableCell className="text-xs">{r.email}</TableCell>
                    <TableCell className="text-xs">
                      {!r.ok ? (
                        <span className="text-red-600">{r.error}</span>
                      ) : r.temporaryPassword ? (
                        <span className="font-mono">Temporary password: {r.temporaryPassword}</span>
                      ) : r.sent === false && r.inviteLink ? (
                        <span className="font-mono break-all">Email failed. Link: {r.inviteLink}</span>
                      ) : (
                        <span>Invitation emailed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[11px] text-muted-foreground">Passwords and links are shown once. Copy them before you close this.</p>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={busy}>
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Invite everyone
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={copyResults} disabled={!result.results.some((r) => r.ok)}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy results
              </Button>
              <Button size="sm" onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

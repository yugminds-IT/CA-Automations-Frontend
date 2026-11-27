"use client";

import { useEffect, useState } from "react";
import { Mail, Pencil, Plus, ShieldCheck, ShieldAlert, RefreshCw, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import {
  CreateMailAccountInput,
  MailAccount,
  createMailAccount,
  deactivateMailAccount,
  listMailAccounts,
  updateMailAccount,
  verifyMailAccount,
} from "@/lib/api/mail-accounts";
import { pickerLabel, activeBrands } from "@/lib/unit-structure";
import { DomainCheckResult, verifyDomainRecords } from "@/lib/api/developer";

const ORG_WIDE = "org";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = {
  id: number | null;
  scope: string; // unit id as string, or ORG_WIDE
  label: string;
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  whiteLabel: boolean;
};

const emptyForm: FormState = {
  id: null,
  scope: ORG_WIDE,
  label: "",
  host: "",
  port: "587",
  secure: false,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
  whiteLabel: false,
};

export default function MailAccountsPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dns, setDns] = useState<Record<number, DomainCheckResult>>({});

  const unitName = (businessUnitId: number | null) =>
    businessUnitId == null ? "Organization-wide" : (() => { const u = units.find((x) => x.id === businessUnitId); return u ? pickerLabel(u, units) : "Unknown brand"; })();

  const load = async () => {
    setLoading(true);
    try {
      const [acc, unitList] = await Promise.all([listMailAccounts(), listBusinessUnits()]);
      setAccounts(acc);
      setUnits(unitList);
    } catch (err: any) {
      toast({ title: "Could not load mail accounts", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      const brandParam = new URLSearchParams(window.location.search).get("brand");
      if (brandParam && /^\d+$/.test(brandParam)) {
        setForm((prev) => ({ ...prev, scope: brandParam }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.label.trim()) next.label = "Give the account a name";
    if (!form.host.trim()) next.host = "SMTP host is required";
    const port = Number(form.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) next.port = "Port must be 1 to 65535";
    if (!form.username.trim()) next.username = "Username is required";
    if (form.id == null && !form.password) next.password = "Password is required";
    if (!EMAIL_RE.test(form.fromEmail.trim())) next.fromEmail = "Enter a valid From address";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const startEdit = (a: MailAccount) => {
    setErrors({});
    setForm({
      id: a.id,
      scope: a.businessUnitId == null ? ORG_WIDE : String(a.businessUnitId),
      label: a.label,
      host: a.host,
      port: String(a.port),
      secure: a.secure,
      username: a.username,
      password: "", // write-only: leave blank to keep the stored password
      fromEmail: a.fromEmail,
      fromName: a.fromName ?? "",
      whiteLabel: a.whiteLabel,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (form.id == null) {
        const payload: CreateMailAccountInput = {
          businessUnitId: form.scope === ORG_WIDE ? null : Number(form.scope),
          label: form.label.trim(),
          host: form.host.trim(),
          port: Number(form.port),
          secure: form.secure,
          username: form.username.trim(),
          password: form.password,
          fromEmail: form.fromEmail.trim(),
          fromName: form.fromName.trim() || null,
          whiteLabel: form.whiteLabel,
        };
        await createMailAccount(payload);
        toast({ title: "Mail account added. Run Verify SMTP to confirm the login." });
      } else {
        // Scope can't change after creation. Deactivate and create a new account instead.
        await updateMailAccount(form.id, {
          label: form.label.trim(),
          host: form.host.trim(),
          port: Number(form.port),
          secure: form.secure,
          username: form.username.trim(),
          ...(form.password ? { password: form.password } : {}),
          fromEmail: form.fromEmail.trim(),
          fromName: form.fromName.trim() || null,
          whiteLabel: form.whiteLabel,
        });
        toast({ title: "Mail account updated" });
      }
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (a: MailAccount) => {
    setBusyId(a.id);
    try {
      await verifyMailAccount(a.id);
      toast({ title: `${a.label}: SMTP login works` });
      await load();
    } catch (err: any) {
      toast({ title: `${a.label}: SMTP login failed`, description: err?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDns = async (a: MailAccount) => {
    const domain = a.fromEmail.split("@")[1];
    if (!domain) return;
    setBusyId(a.id);
    try {
      const result = await verifyDomainRecords(domain);
      setDns((prev) => ({ ...prev, [a.id]: result }));
    } catch (err: any) {
      toast({ title: "DNS check failed", description: err?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeactivate = async (a: MailAccount) => {
    setBusyId(a.id);
    try {
      await deactivateMailAccount(a.id);
      toast({ title: `${a.label} deactivated. Mail falls back to the next account.` });
      await load();
    } catch (err: any) {
      toast({ title: "Could not deactivate", description: err?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleReactivate = async (a: MailAccount) => {
    setBusyId(a.id);
    try {
      await updateMailAccount(a.id, { isActive: true });
      toast({ title: `${a.label} is active again` });
      await load();
    } catch (err: any) {
      toast({
        title: "Could not reactivate",
        description: err?.message ?? "This unit may already have an active account.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const editing = form.id != null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Sending accounts</h1>
        <p className="text-sm text-muted-foreground">
          The SMTP account each business unit sends mail from. A unit without its own account uses the
          organization-wide account. Enable white-label to send without the Lekvya footer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Accounts
          </CardTitle>
          <CardDescription>Verify the login after adding or changing an account.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sending accounts yet. Mail uses the legacy settings.</p>
          ) : (
            <ul className="divide-y">
              {accounts.map((a) => {
                const check = dns[a.id];
                return (
                  <li key={a.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{a.label}</span>
                          <Badge variant="outline">{unitName(a.businessUnitId)}</Badge>
                          {!a.isActive && <Badge variant="secondary">Inactive</Badge>}
                          {a.whiteLabel && <Badge variant="outline">White-label</Badge>}
                          {a.lastVerifiedAt ? (
                            <Badge>
                              <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <ShieldAlert className="mr-1 h-3 w-3" /> Not verified
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.fromName ? `${a.fromName} <${a.fromEmail}>` : a.fromEmail} · {a.host}:{a.port}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => handleVerify(a)}>
                          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Verify SMTP
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => handleDns(a)}>
                          Check DNS
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(a)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        {a.isActive ? (
                          <Button size="sm" variant="ghost" disabled={busyId === a.id} onClick={() => handleDeactivate(a)}>
                            Deactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled={busyId === a.id} onClick={() => handleReactivate(a)}>
                            <Power className="mr-1 h-3.5 w-3.5" /> Activate
                          </Button>
                        )}
                      </div>
                    </div>
                    {check && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant={check.spf.valid ? "default" : "destructive"}>
                          SPF {check.spf.valid ? "OK" : "missing"}
                        </Badge>
                        <Badge variant={check.dmarc.valid ? "default" : "destructive"}>
                          DMARC {check.dmarc.valid ? "OK" : "missing"}
                        </Badge>
                        {!check.spf.valid && (
                          <span className="text-muted-foreground">Add SPF: {check.recommendedRecords.spf}</span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> {editing ? "Edit account" : "Add an account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Sends for</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => set("scope", v)}
                disabled={editing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ORG_WIDE}>Organization-wide</SelectItem>
                  {units.filter((u) => u.isActive || String(u.id) === form.scope).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {pickerLabel(u, units)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editing && <p className="text-xs text-muted-foreground">To change scope, deactivate and add a new account.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ma-label">Account name</Label>
              <Input id="ma-label" value={form.label} onChange={(e) => set("label", e.target.value)} />
              {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ma-host">SMTP host</Label>
              <Input id="ma-host" value={form.host} onChange={(e) => set("host", e.target.value)} />
              {errors.host && <p className="text-xs text-destructive">{errors.host}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ma-port">Port</Label>
                <Input
                  id="ma-port"
                  value={form.port}
                  onChange={(e) => {
                    const port = e.target.value;
                    set("port", port);
                    // 465 is implicit TLS; 587 and 25 start plain and upgrade. A mismatch fails with "wrong version number".
                    if (port.trim() === "465") set("secure", true);
                    else if (port.trim() === "587" || port.trim() === "25") set("secure", false);
                  }}
                />
                {errors.port && <p className="text-xs text-destructive">{errors.port}</p>}
              </div>
              <div className="flex items-end gap-2 pb-2">
                <input
                  id="ma-secure"
                  type="checkbox"
                  checked={form.secure}
                  onChange={(e) => set("secure", e.target.checked)}
                />
                <Label htmlFor="ma-secure">Implicit TLS (465 on, 587 off)</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ma-user">SMTP username</Label>
              <Input id="ma-user" value={form.username} onChange={(e) => set("username", e.target.value)} />
              {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ma-pass">SMTP password</Label>
              <Input
                id="ma-pass"
                type="password"
                autoComplete="new-password"
                placeholder={editing ? "Leave blank to keep the saved password" : ""}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ma-from">From address</Label>
              <Input id="ma-from" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} />
              {errors.fromEmail && <p className="text-xs text-destructive">{errors.fromEmail}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ma-fromname">From name</Label>
              <Input id="ma-fromname" value={form.fromName} onChange={(e) => set("fromName", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="ma-white"
                type="checkbox"
                checked={form.whiteLabel}
                onChange={(e) => set("whiteLabel", e.target.checked)}
              />
              <Label htmlFor="ma-white">White-label: do not add the &ldquo;Email sent via Lekvya&rdquo; footer</Label>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={saving}>
                {editing ? "Save changes" : "Add account"}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

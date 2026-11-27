"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  Globe,
  Loader2,
  Code2,
  Inbox,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import { getApiKeys, createApiKey, revokeApiKey, updateApiKey, ApiKeyItem } from "@/lib/api/developer";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import { MailAccount, listMailAccounts } from "@/lib/api/mail-accounts";
import { pickerLabel } from "@/lib/unit-structure";

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([]);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // New Key Form
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<"public" | "secret">("public");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [domains, setDomains] = useState("");
  const [autoLeads, setAutoLeads] = useState(false);

  // Newly Created Key Reveal Modal
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const [data, unitList, mailList] = await Promise.all([
        getApiKeys(),
        listBusinessUnits().catch(() => [] as BusinessUnit[]),
        listMailAccounts().catch(() => [] as MailAccount[]),
      ]);
      setKeys(data);
      setUnits(unitList);
      setMailAccounts(mailList);
      const defaultBrand = unitList.find((u) => u.isDefault) ?? unitList[0];
      setSelectedBrandId((prev) => prev || (defaultBrand ? String(defaultBrand.id) : ""));
    } catch (err: any) {
      toast({
        title: "Failed to load API keys",
        description: err?.message || "Could not fetch keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const brandParam = new URLSearchParams(window.location.search).get("brand");
      if (brandParam && /^\d+$/.test(brandParam)) {
        setBrandFilter(brandParam);
        setSelectedBrandId(brandParam);
      }
    }
    fetchKeys();
  }, []);

  const activeUnits = useMemo(() => units.filter((u) => u.isActive), [units]);
  const brandLabelFor = (businessUnitId?: number | null) => {
    if (businessUnitId == null) return "Default brand";
    const u = units.find((x) => x.id === businessUnitId);
    return u ? pickerLabel(u, units) : `Brand #${businessUnitId}`;
  };
  const smtpFor = (businessUnitId?: number | null) =>
    mailAccounts.find((m) => m.isActive && m.businessUnitId === (businessUnitId ?? null)) ??
    mailAccounts.find((m) => m.isActive && m.businessUnitId === null) ??
    null;

  const visibleKeys = useMemo(() => {
    if (brandFilter === "all") return keys;
    const id = Number(brandFilter);
    return keys.filter((k) => k.businessUnitId === id);
  }, [keys, brandFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setCreating(true);
    try {
      const allowedDomains = domains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const created = await createApiKey({
        name: keyName.trim(),
        keyType,
        ...(selectedBrandId ? { businessUnitId: Number(selectedBrandId) } : {}),
        allowedDomains,
        autoCreateLead: autoLeads,
      });

      setDialogOpen(false);
      setKeyName("");
      setDomains("");
      setAutoLeads(false);

      if (created.key) {
        setRevealKey(created.key);
      }

      toast({
        title: "API Key Created",
        description: `Successfully created ${keyType} key.`,
        variant: "success",
      });

      fetchKeys();
    } catch (err: any) {
      toast({
        title: "Creation Failed",
        description: err?.message || "Could not create API key",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleLeads = async (k: ApiKeyItem, next: boolean) => {
    setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, autoCreateLead: next } : x)));
    try {
      await updateApiKey(k.id, { autoCreateLead: next });
    } catch (err: any) {
      setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, autoCreateLead: !next } : x)));
      toast({
        title: "Could not update key",
        description: err?.message || "Try again",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      return;
    }
    try {
      await revokeApiKey(id);
      toast({ title: "Key Revoked", description: "API key has been revoked." });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err: any) {
      toast({
        title: "Revoke Failed",
        description: err?.message || "Could not revoke key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Key copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <PageHeader
        title="API keys"
        description="Each key belongs to a brand. Use a public key in website forms and a secret key on your server."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/developer/quickstart">
                <Code2 className="mr-1 h-4 w-4" /> Form &amp; API code
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/developer/inbox">
                <Inbox className="mr-1 h-4 w-4" /> Form inquiries
              </Link>
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create API key
            </Button>
          </>
        }
      />

      {/* Guide Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Globe className="w-4 h-4" /> Public Keys (<code className="text-xs font-mono">pk_live_...</code>)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Safe to expose in browser HTML or frontend JavaScript. Submissions are strictly verified against your <strong>Allowed Domains</strong> whitelist and protected by anti-spam honeypots.
          </CardContent>
        </Card>

        <Card className="border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" /> Secret Keys (<code className="text-xs font-mono">sk_live_...</code>)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Used on your server backend (Node.js, Python, PHP, Next.js API) to send transactional emails via <code className="text-xs font-mono">POST /api/v1/emails</code>. Never expose in frontend code.
          </CardContent>
        </Card>
      </div>

      {/* Keys Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Active API Keys</CardTitle>
            <CardDescription className="text-xs">
              Each key belongs to a brand and sends form replies and notifications through that brand&apos;s SMTP.
            </CardDescription>
          </div>
          {units.length > 1 && (
            <select
              aria-label="Filter by brand"
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="all">All brands</option>
              {units.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {pickerLabel(u, units)}
                </option>
              ))}
            </select>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading keys…
            </div>
          ) : visibleKeys.length === 0 ? (
            <div className="text-center p-12 text-sm text-muted-foreground">
              No API keys found{brandFilter !== "all" ? " for this brand" : ""}. Click &quot;Create New Key&quot; above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  {units.length > 1 && <TableHead>Brand</TableHead>}
                  <TableHead>SMTP</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Key / Token</TableHead>
                  <TableHead>Allowed Domains</TableHead>
                  <TableHead>Auto-lead</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleKeys.map((k) => {
                  const smtp = smtpFor(k.businessUnitId);
                  return (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium text-sm">{k.name}</TableCell>
                    {units.length > 1 && (
                      <TableCell className="text-xs font-medium">{brandLabelFor(k.businessUnitId)}</TableCell>
                    )}
                    <TableCell className="text-xs">
                      {smtp ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {smtp.fromEmail}
                          {smtp.businessUnitId == null && k.businessUnitId != null ? " (org)" : ""}
                        </span>
                      ) : (
                        <Link
                          href={k.businessUnitId ? `/settings/mail-accounts?brand=${k.businessUnitId}` : "/settings/mail-accounts"}
                          className="inline-flex items-center gap-1 text-amber-700 underline dark:text-amber-400"
                        >
                          <Mail className="w-3 h-3" /> Set up SMTP
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      {k.keyType === "public" ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                          Public (Browser)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300">
                          Secret (Server)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {k.publicKey ? (
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[160px]">{k.publicKey}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(k.publicKey!)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{k.keyPrefix}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.allowedDomains && k.allowedDomains.length > 0 ? (
                        <span className="truncate max-w-[160px] inline-block">{k.allowedDomains.join(", ")}</span>
                      ) : (
                        <span className="italic opacity-60">Any domain</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(k.autoCreateLead)}
                        onCheckedChange={(v) => handleToggleLeads(k, v)}
                        aria-label="Create leads from submissions"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(k.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription className="text-xs">
              Choose the key type based on whether you are using client-side forms or backend servers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            {activeUnits.length > 1 && (
              <div>
                <Label className="text-xs font-semibold">Brand *</Label>
                <select
                  aria-label="Brand"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {activeUnits.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {pickerLabel(u, units)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Form submissions on this key land under this brand and send emails via this brand&apos;s SMTP.
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Key Name *</Label>
              <Input
                required
                placeholder="e.g. Production Contact Form or Backend Order Service"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Key Type *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setKeyType("public")}
                  className={`p-3 rounded-lg border text-left transition-all ${keyType === "public"
                    ? "border-emerald-500 bg-emerald-50/40 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-border hover:bg-muted/40"
                    }`}
                >
                  <p className="text-xs font-bold">Public Key (pk_...)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">For website HTML & React contact forms.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setKeyType("secret")}
                  className={`p-3 rounded-lg border text-left transition-all ${keyType === "secret"
                    ? "border-indigo-500 bg-indigo-50/40 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200"
                    : "border-border hover:bg-muted/40"
                    }`}
                >
                  <p className="text-xs font-bold">Secret Key (sk_...)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">For backend server transactional email API.</p>
                </button>
              </div>
            </div>

            {keyType === "public" && (
              <div>
                <Label className="text-xs font-semibold">Allowed Domains </Label>
                <Input
                  placeholder="e.g. mysite.com"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  className="mt-1 text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated list. Only requests originating from these domains will be accepted.
                </p>
              </div>
            )}

            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div>
                <Label className="text-xs font-semibold">Create leads from submissions</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Each accepted form response on this key also becomes a lead in its business unit. A response with the same email or phone as an existing lead is added to that lead.
                </p>
              </div>
              <Switch checked={autoLeads} onCheckedChange={setAutoLeads} aria-label="Create leads automatically" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null} Generate Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Secret Key Reveal Dialog */}
      <Dialog open={!!revealKey} onOpenChange={() => setRevealKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Check className="w-5 h-5 text-emerald-500" /> Save Your API Key
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please copy your API key now. For your security, secret keys cannot be displayed again.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted rounded-lg border flex items-center justify-between font-mono text-xs break-all">
            <span>{revealKey}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => revealKey && copyToClipboard(revealKey)}
              className="ml-3 shrink-0 text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setRevealKey(null)} className="w-full">
              I have saved my key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

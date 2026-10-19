"use client";

import { useState, useEffect } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  Globe,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getApiKeys, createApiKey, revokeApiKey, ApiKeyItem } from "@/lib/api/developer";

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // New Key Form
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<"public" | "secret">("public");
  const [domains, setDomains] = useState("");

  // Newly Created Key Reveal Modal
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const data = await getApiKeys();
      setKeys(data);
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
    fetchKeys();
  }, []);

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
        allowedDomains,
      });

      setDialogOpen(false);
      setKeyName("");
      setDomains("");

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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-indigo-500" /> API Keys & Developer Access
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Public keys (for website contact forms like EmailJS) and Secret keys (for transactional APIs like Resend).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
          <Plus className="w-4 h-4 mr-1.5" /> Create New Key
        </Button>
      </div>

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
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active API Keys</CardTitle>
          <CardDescription className="text-xs">
            Keys authorized to interact with your organization's email pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading keys…
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center p-12 text-sm text-muted-foreground">
              No API keys created yet. Click "Create New Key" above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Key / Token</TableHead>
                  <TableHead>Allowed Domains</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium text-sm">{k.name}</TableCell>
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
                        <span className="truncate max-w-[180px] inline-block">{k.allowedDomains.join(", ")}</span>
                      ) : (
                        <span className="italic opacity-60">Any domain</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{k.rateLimitPerMinute} req/min</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString()}
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
                ))}
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">For website HTML & React contact forms.</p>
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">For backend server transactional email API.</p>
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
                <p className="text-[11px] text-muted-foreground mt-1">
                  Comma-separated list. Only requests originating from these domains will be accepted.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating} className="bg-indigo-600 hover:bg-indigo-500 text-white">
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
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
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

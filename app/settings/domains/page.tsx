"use client";

import { useState } from "react";
import {
  Globe,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Info,
  Server,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { DashboardShell } from "@/components/dashboard-shell";
import { verifyDomainRecords, DomainCheckResult } from "@/lib/api/developer";

export default function DomainsVerificationPage() {
  const { toast } = useToast();
  const [domainInput, setDomainInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DomainCheckResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDomain = domainInput.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!cleanDomain) {
      toast({ title: "Please enter a valid domain", variant: "destructive" });
      return;
    }

    setChecking(true);
    try {
      const data = await verifyDomainRecords(cleanDomain);
      setResult(data);
      if (data.spf.valid && data.dmarc.valid) {
        toast({
          title: "Domain Verified!",
          description: "Both SPF and DMARC records are configured properly.",
        });
      } else {
        toast({
          title: "DNS Records Incomplete",
          description: "Please configure the missing DNS records shown below.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "DNS Query Failed",
        description: err?.message || "Could not query DNS servers.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isFullCompliance = result && result.spf.valid && result.dmarc.valid;

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sending Domains & Deliverability</h1>
              <p className="text-sm text-muted-foreground">
                Verify SPF, DKIM, and DMARC records to ensure 99%+ deliverability and comply with Google & Yahoo inbox rules.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Lookup Form */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Check Your Domain Deliverability</CardTitle>
          <CardDescription>
            Enter your sending domain (e.g., <code className="text-xs font-mono">mail.acme-corp.com</code> or <code className="text-xs font-mono">stanford-academy.edu</code>) to test live DNS status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="example.com or mail.school.edu"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={checking} className="gap-2">
              {checking ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Resolving DNS...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Verify DNS Records
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Compliance Status Overview */}
      {result && (
        <div
          className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isFullCompliance
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
              : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
          }`}
        >
          <div className="flex items-center gap-3">
            {isFullCompliance ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />
            )}
            <div>
              <h3 className="font-semibold text-base">
                {isFullCompliance
                  ? `Domain ${result.domain} is Fully Verified!`
                  : `Domain ${result.domain} Requires DNS Updates`}
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                {isFullCompliance
                  ? "All required authentication mechanisms are active. Emails sent from this domain will land directly in inboxes."
                  : "Some authentication records are missing or unverified. Add the DNS records below to avoid spam filters."}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`font-semibold text-xs px-3 py-1 ${
              isFullCompliance
                ? "bg-emerald-500 text-white border-transparent"
                : "bg-amber-500 text-white border-transparent"
            }`}
          >
            {isFullCompliance ? "99.9% Deliverability Score" : "Deliverability At Risk"}
          </Badge>
        </div>
      )}

      {/* DNS Records Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Required DNS Authentication Records
          </CardTitle>
          <CardDescription>
            Copy and paste these records into your DNS provider (Cloudflare, GoDaddy, AWS Route 53, Namecheap, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-48">Host / Name</TableHead>
                  <TableHead>Target Value</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-20 text-right">Copy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* SPF Record */}
                <TableRow>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs font-bold">TXT</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    @ or {result?.domain || "yourdomain.com"}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <code className="text-xs font-mono block bg-muted/60 p-2 rounded border border-border/40 overflow-x-auto">
                        {result?.recommendedRecords.spf || "v=spf1 include:_spf.google.com ~all"}
                      </code>
                      {result?.spf.record && (
                        <p className="text-[11px] text-muted-foreground">
                          Detected live: <code className="font-mono">{result.spf.record}</code>
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {result ? (
                      result.spf.valid ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <XCircle className="h-3 w-3" /> Missing
                        </Badge>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">Pending test</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        copyToClipboard(
                          result?.recommendedRecords.spf || "v=spf1 include:_spf.google.com ~all",
                          "spf",
                        )
                      }
                    >
                      {copiedKey === "spf" ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>

                {/* DMARC Record */}
                <TableRow>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs font-bold">TXT</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    _dmarc.{result?.domain || "yourdomain.com"}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <code className="text-xs font-mono block bg-muted/60 p-2 rounded border border-border/40 overflow-x-auto">
                        {result?.recommendedRecords.dmarc ||
                          `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${result?.domain || "yourdomain.com"}`}
                      </code>
                      {result?.dmarc.record && (
                        <p className="text-[11px] text-muted-foreground">
                          Detected live: <code className="font-mono">{result.dmarc.record}</code>
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {result ? (
                      result.dmarc.valid ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <XCircle className="h-3 w-3" /> Missing
                        </Badge>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">Pending test</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        copyToClipboard(
                          result?.recommendedRecords.dmarc ||
                            `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${result?.domain || "yourdomain.com"}`,
                          "dmarc",
                        )
                      }
                    >
                      {copiedKey === "dmarc" ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>

                {/* RFC 8058 One-Click Header */}
                <TableRow>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs font-bold">HTTP</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    RFC 8058 Unsubscribe
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      Automatically managed by CAA engine. Headers <code className="font-mono">List-Unsubscribe-Post</code> and <code className="font-mono">List-Unsubscribe</code> are injected into all outgoing emails.
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Auto-Enabled
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Deliverability Standards Card */}
      <Card className="border border-border/60 bg-muted/10 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">2024 Google & Yahoo Deliverability Mandates</CardTitle>
          </div>
          <CardDescription>
            Why domain authentication is required for sending emails at production scale.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="p-3 border border-border/60 rounded-xl bg-card space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              1. SPF & DMARC Mandate
            </span>
            <p>
              Mailbox providers reject bulk emails sent from unauthenticated domains to stop phishing and spoofing.
            </p>
          </div>
          <div className="p-3 border border-border/60 rounded-xl bg-card space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              2. One-Click Unsubscribe
            </span>
            <p>
              Marketing and transactional messages must provide an RFC 8058 one-click unsubscribe header.
            </p>
          </div>
          <div className="p-3 border border-border/60 rounded-xl bg-card space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-primary" />
              3. Keep Spam Under 0.3%
            </span>
            <p>
              Our automated suppression lists immediately block unengaged or unsubscribed addresses to protect your domain reputation.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardShell>
  );
}

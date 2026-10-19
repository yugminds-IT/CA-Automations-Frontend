"use client";

import { useState, useEffect } from "react";
import {
  Webhook,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  Radio,
  Send,
  AlertCircle,
  Code2,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  getWebhooks,
  createWebhook,
  deleteWebhook,
  WebhookItem,
} from "@/lib/api/developer";

const AVAILABLE_EVENTS = [
  { key: "*", label: "All Events (*)", desc: "Subscribe to all events across forms and email" },
  { key: "form.submitted", label: "form.submitted", desc: "Triggered whenever a website visitor submits a contact inquiry" },
  { key: "email.sent", label: "email.sent", desc: "Triggered when an email is enqueued for delivery" },
  { key: "email.delivered", label: "email.delivered", desc: "Triggered when SMTP handoff confirms successful transmission" },
  { key: "email.bounced", label: "email.bounced", desc: "Triggered if email bounces or fails delivery" },
  { key: "email.opened", label: "email.opened", desc: "Triggered when recipient loads the tracking pixel" },
  { key: "email.clicked", label: "email.clicked", desc: "Triggered when recipient clicks a link in the email" },
];

export default function WebhooksPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Form State
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const data = await getWebhooks();
      setWebhooks(data);
    } catch (err: any) {
      toast({
        title: "Failed to load webhooks",
        description: err?.message || "Could not fetch webhooks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleCreate = async () => {
    if (!url.trim()) {
      toast({ title: "URL is required", variant: "destructive" });
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast({ title: "URL must start with https:// or http://", variant: "destructive" });
      return;
    }
    if (selectedEvents.length === 0) {
      toast({ title: "Select at least one event", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      await createWebhook({ url: url.trim(), events: selectedEvents });
      toast({
        title: "Webhook registered",
        description: "Your endpoint has been subscribed to live event streams.",
      });
      setUrl("");
      setSelectedEvents(["*"]);
      setDialogOpen(false);
      fetchWebhooks();
    } catch (err: any) {
      toast({
        title: "Creation failed",
        description: err?.message || "Could not create webhook",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this webhook subscription?")) return;
    try {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast({ title: "Webhook removed" });
    } catch (err: any) {
      toast({
        title: "Failed to remove webhook",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const handleCopySecret = (secret: string, id: number) => {
    navigator.clipboard.writeText(secret);
    setCopiedId(id);
    toast({ title: "Secret copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEvent = (key: string) => {
    if (key === "*") {
      setSelectedEvents(["*"]);
      return;
    }
    const filtered = selectedEvents.filter((e) => e !== "*");
    if (filtered.includes(key)) {
      const next = filtered.filter((e) => e !== key);
      setSelectedEvents(next.length === 0 ? ["*"] : next);
    } else {
      setSelectedEvents([...filtered, key]);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Webhooks & Event Streams</h1>
              <p className="text-sm text-muted-foreground">
                Receive instant HTTP POST callbacks with HMAC-SHA256 signatures for contact forms, telemetry, and email delivery.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Endpoint
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border/60 bg-gradient-to-br from-card to-card/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Active Subscriptions</CardDescription>
            <CardTitle className="text-3xl font-extrabold flex items-center gap-2">
              <Radio className="h-6 w-6 text-emerald-500 animate-pulse" />
              {webhooks.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Registered webhook destinations receiving live payloads
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-gradient-to-br from-card to-card/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Security Signature</CardDescription>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-indigo-500">
              <ShieldCheck className="h-6 w-6" />
              HMAC-SHA256
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sent via header <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">X-CAA-Signature</code>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-gradient-to-br from-card to-card/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Supported Events</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-blue-500">
              7 Events
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Forms, deliverability, opens, clicks, and bounces
          </CardContent>
        </Card>
      </div>

      {/* Endpoints Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Registered Endpoints</CardTitle>
          <CardDescription>
            Manage the webhook endpoints receiving events from your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm">Loading webhook endpoints...</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-xl border-border/60 bg-muted/20">
              <Webhook className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
              <h3 className="text-base font-semibold">No webhooks configured</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Add an endpoint to start receiving real-time events for contact submissions and email statuses.
              </p>
              <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Endpoint
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint URL</TableHead>
                    <TableHead>Subscribed Events</TableHead>
                    <TableHead>Signing Secret</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((wh) => (
                    <TableRow key={wh.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        {wh.url}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {wh.events.map((evt) => (
                            <Badge
                              key={evt}
                              variant={evt === "*" ? "default" : "secondary"}
                              className="text-[10px] py-0"
                            >
                              {evt}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <span>{wh.secret.slice(0, 10)}••••••••</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopySecret(wh.secret, wh.id)}
                            title="Copy secret"
                          >
                            {copiedId === wh.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            wh.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs"
                              : "bg-muted text-muted-foreground text-xs"
                          }
                        >
                          {wh.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(wh.id)}
                          title="Delete endpoint"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Snippet: Signature Verification */}
      <Card className="border border-border/60 shadow-sm bg-muted/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Verifying Webhook Signatures</CardTitle>
          </div>
          <CardDescription>
            All webhook requests include an <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">X-CAA-Signature</code> header.
            Verify it to confirm requests originate from CAA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
{`import crypto from 'crypto';

// Next.js App Router / Node.js Express Handler
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-caa-signature'); // e.g. "t=1738310000,v1=a1b2c3..."
  
  const webhookSecret = process.env.CAA_WEBHOOK_SECRET; // "whsec_..."
  
  // Extract v1 signature
  const signature = signatureHeader?.split(',').find(s => s.startsWith('v1='))?.slice(3);
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 401 });
  }

  const { event, data } = JSON.parse(rawBody);
  console.log('Received valid event:', event, data);
  
  return new Response('OK', { status: 200 });
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Add Webhook Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              Add Webhook Endpoint
            </DialogTitle>
            <DialogDescription>
              We will send a POST request with HMAC-SHA256 headers for selected events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://api.yourdomain.com/webhooks"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Must be an publicly reachable HTTPS URL that returns HTTP 200 within 5 seconds.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Events to send</Label>
              <div className="grid grid-cols-1 gap-2 border border-border/60 rounded-xl p-3 bg-muted/20 max-h-60 overflow-y-auto">
                {AVAILABLE_EVENTS.map((evt) => {
                  const isChecked = selectedEvents.includes(evt.key);
                  return (
                    <label
                      key={evt.key}
                      onClick={() => toggleEvent(evt.key)}
                      className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-muted-foreground/40 text-primary focus:ring-primary"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-foreground font-mono">{evt.label}</span>
                        <p className="text-muted-foreground mt-0.5 text-[11px]">{evt.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating} size="sm" className="gap-2">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Save Endpoint"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

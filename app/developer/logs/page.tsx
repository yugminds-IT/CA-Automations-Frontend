"use client";

import { useState, useEffect } from "react";
import {
  ListOrdered,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Clock,
  Send,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getDeliveryLogs, EmailLogItem } from "@/lib/api/developer";

export default function DeliveryLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getDeliveryLogs(statusFilter === "all" ? undefined : statusFilter);
      setLogs(data);
    } catch (err: any) {
      toast({
        title: "Failed to load logs",
        description: err?.message || "Could not fetch delivery logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.to.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q) ||
      l.messageId.toLowerCase().includes(q) ||
      l.from.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "opened":
        return (
          <Badge className="bg-emerald-500 text-white text-[10px] flex items-center gap-1">
            <Eye className="w-3 h-3" /> OPENED
          </Badge>
        );
      case "clicked":
        return (
          <Badge className="bg-blue-600 text-white text-[10px] flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" /> CLICKED
          </Badge>
        );
      case "delivered":
      case "sent":
        return (
          <Badge variant="outline" className="border-orange-400 text-orange-700 dark:text-orange-300 text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-orange-500" /> DELIVERED
          </Badge>
        );
      case "failed":
      case "bounced":
        return (
          <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> FAILED
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-[10px]">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-orange-500" /> Delivery Logs &amp; Telemetry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resend-style real-time delivery stream: inspect opens, link clicks, SMTP headers, and message delivery timeline.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "sent", "opened", "clicked", "failed"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="text-xs capitalize h-8"
            >
              {st}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by recipient, subject, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading delivery logs…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-sm text-muted-foreground">
              No delivery logs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Dispatched At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="font-semibold text-xs font-mono text-indigo-700 dark:text-indigo-400">
                      {log.to}
                    </TableCell>
                    <TableCell className="text-xs max-w-[240px] truncate">{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {log.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.openCount > 0 ? (
                        <span className="font-bold text-emerald-600">{log.openCount}</span>
                      ) : (
                        <span className="text-muted-foreground/60">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.clickCount > 0 ? (
                        <span className="font-bold text-blue-600">{log.clickCount}</span>
                      ) : (
                        <span className="text-muted-foreground/60">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        {selectedLog && (
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-500" /> Message Telemetry
                </DialogTitle>
                {getStatusBadge(selectedLog.status)}
              </div>
              <DialogDescription className="text-xs font-mono">
                {selectedLog.messageId}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground font-medium">To:</span>{" "}
                  <span className="font-mono">{selectedLog.to}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">From:</span>{" "}
                  <span className="font-mono">{selectedLog.from}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Source:</span>{" "}
                  <span className="uppercase">{selectedLog.source}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Dispatched:</span>{" "}
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </div>
              </div>

              <div>
                <p className="font-semibold text-muted-foreground mb-1">Subject:</p>
                <div className="p-2.5 bg-muted/50 rounded-lg font-medium text-sm border">
                  {selectedLog.subject}
                </div>
              </div>

              {/* Telemetry stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" /> Total Opens
                  </p>
                  <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{selectedLog.openCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedLog.openedAt ? `Last at ${new Date(selectedLog.openedAt).toLocaleTimeString()}` : "Not opened yet"}
                  </p>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-blue-600" /> Total Clicks
                  </p>
                  <p className="text-xl font-extrabold text-blue-600 mt-0.5">{selectedLog.clickCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedLog.clickedAt ? `Last at ${new Date(selectedLog.clickedAt).toLocaleTimeString()}` : "No link clicks"}
                  </p>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600">
                  <p className="font-semibold text-[11px]">Error Delivery Response:</p>
                  <p className="mt-0.5">{selectedLog.errorMessage}</p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

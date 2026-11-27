"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Mail,
  Phone,
  Globe,
  Trash2,
  CheckCircle,
  MessageSquare,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  UserPlus,
  UserCheck,
  ExternalLink,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import {
  getFormSubmissions,
  updateSubmissionStatus,
  convertSubmissionToClient,
  convertSubmissionToLead,
  deleteFormSubmission,
  FormSubmissionItem,
} from "@/lib/api/developer";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import { pickerLabel, activeBrands } from "@/lib/unit-structure";
import { useRealtimeEvent } from "@/lib/realtime";

export default function FormInboxPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<FormSubmissionItem[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<FormSubmissionItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [payloadView, setPayloadView] = useState<"table" | "json">("table");

  useEffect(() => {
    setPayloadView("table");
  }, [selectedItem?.id]);

  useEffect(() => {
    listBusinessUnits()
      .then(setUnits)
      .catch(() => setUnits([]));
  }, []);

  const brandLabelFor = (businessUnitId?: number | null) => {
    if (businessUnitId == null) return "—";
    const u = units.find((x) => x.id === businessUnitId);
    return u ? pickerLabel(u, units) : `Brand #${businessUnitId}`;
  };

  const fetchSubmissions = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getFormSubmissions(
        statusFilter === "all" ? undefined : statusFilter,
        brandFilter === "all" ? undefined : Number(brandFilter),
      );
      setSubmissions(data);
    } catch (err: any) {
      if (silent) return;
      toast({
        title: "Failed to load submissions",
        description: err?.message || "Could not fetch form inquiries",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, brandFilter]);

  // Live refresh as soon as a new form submission arrives
  useRealtimeEvent('developer.submission.created', () => {
    fetchSubmissions(true);
  });

  const handleUpdateStatus = async (id: number, status: "new" | "read" | "replied" | "converted" | "spam") => {
    try {
      await updateSubmissionStatus(id, status);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, status } : null));
      }
      toast({ title: "Status Updated", description: `Marked as ${status}.` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleConvertToLead = async (item: FormSubmissionItem) => {
    setConvertingId(item.id);
    try {
      const res = await convertSubmissionToLead(item.id);
      const patch = { status: "converted" as const, convertedLeadId: res.leadId };
      setSubmissions((prev) => prev.map((s) => (s.id === item.id ? { ...s, ...patch } : s)));
      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) => (prev ? { ...prev, ...patch } : null));
      }
      toast({
        title: res.duplicate ? "Added to Existing Lead" : "Lead Created",
        description: res.duplicate
          ? "A lead with the same email or phone already exists in this unit, so this response was added to it."
          : "This response is now a lead in its business unit.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Could not create lead",
        description: err?.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setConvertingId(null);
    }
  };

  const handleConvertToClient = async (item: FormSubmissionItem) => {
    setConvertingId(item.id);
    try {
      const res = await convertSubmissionToClient(item.id);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === item.id
            ? {
                ...s,
                status: "converted",
                isExistingClient: true,
                convertedClientId: res.client?.id,
                matchedClientName: res.client?.name,
              }
            : s,
        ),
      );
      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) =>
          prev
            ? {
                ...prev,
                status: "converted",
                isExistingClient: true,
                convertedClientId: res.client?.id,
                matchedClientName: res.client?.name,
              }
            : null,
        );
      }

      if (res.alreadyExists) {
        toast({
          title: "Existing Client Matched (Duplicate Prevented)",
          description: res.message,
        });
      } else {
        toast({
          title: "Converted to Client",
          description: res.message,
        });
      }
    } catch (err: any) {
      toast({
        title: "Conversion Failed",
        description: err?.message || "Could not convert submission to client.",
        variant: "destructive",
      });
    } finally {
      setConvertingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    try {
      await deleteFormSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      toast({ title: "Deleted", description: "Submission removed from inbox." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const filtered = submissions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.senderName && s.senderName.toLowerCase().includes(q)) ||
      (s.senderEmail && s.senderEmail.toLowerCase().includes(q)) ||
      (s.message && s.message.toLowerCase().includes(q)) ||
      (s.formName && s.formName.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, brandFilter, search]);

  const totalItems = filtered.length;
  const startIndex = (currentPage - 1) * pageSize;
  const displayedSubmissions = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <PageHeader
        title="Form inquiries"
        description="Messages people send through the contact forms on your website. New ones appear here automatically."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => router.push("/client-management")}>
              <UserCheck className="mr-1 h-4 w-4" /> Clients &amp; Contacts
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchSubmissions()}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
          </>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {["all", "new", "read", "replied", "converted", "spam"].map((st) => (
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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {activeBrands(units).length > 1 && (
            <select
              aria-label="Filter by brand"
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="all">All brands</option>
              {activeBrands(units).map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {pickerLabel(u, units)}
                </option>
              ))}
            </select>
          )}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by name, email, message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <Table>
              <TableSkeleton rows={6} columns={7} />
            </Table>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No submissions found"
              description="No submissions match the current filter"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  {units.length > 1 && <TableHead>Brand</TableHead>}
                  <TableHead>Sender Name</TableHead>
                  <TableHead>Email / Contact</TableHead>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Message Preview</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSubmissions.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      if (item.status === "new") {
                        handleUpdateStatus(item.id, "read");
                      }
                    }}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      {item.status === "new" ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
                          NEW
                        </Badge>
                      ) : item.status === "converted" ? (
                        <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                          CONVERTED
                        </Badge>
                      ) : item.status === "replied" ? (
                        <Badge variant="outline" className="text-indigo-600 border-indigo-400 text-xs">
                          REPLIED
                        </Badge>
                      ) : item.status === "spam" ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                          SPAM
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          READ
                        </Badge>
                      )}
                    </TableCell>
                    {units.length > 1 && (
                      <TableCell className="text-xs font-medium whitespace-nowrap">
                        {brandLabelFor(item.businessUnitId)}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm">
                          {item.senderName || "Website Visitor"}
                        </span>
                        {item.isExistingClient && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium"
                          >
                            Client
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{item.senderEmail || "—"}</div>
                      {item.senderPhone && <div className="text-xs opacity-75">{item.senderPhone}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{item.formName || "Contact Form"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {item.message || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {item.convertedLeadId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100"
                            onClick={() => router.push(`/leads/${item.convertedLeadId}`)}
                            title="Open this lead"
                          >
                            <Target className="w-3.5 h-3.5 mr-1 text-sky-600" />
                            Lead
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-black text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                            disabled={convertingId === item.id}
                            onClick={() => handleConvertToLead(item)}
                            title="Create a lead from this response in its brand (existing lead with the same email or phone is reused)"
                          >
                            {convertingId === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Target className="w-3.5 h-3.5 mr-1" />
                            )}
                            To lead
                          </Button>
                        )}
                        {item.convertedClientId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100"
                            onClick={() => router.push("/client-management")}
                            title="View in Clients & Contacts Management"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Client
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={convertingId === item.id}
                            onClick={() => handleConvertToClient(item)}
                            title="Convert submission to Client (Duplicate checked automatically)"
                          >
                            {convertingId === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5 mr-1" />
                            )}
                            To client
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalItems > 0 && (
            <TablePagination
              totalItems={totalItems}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {/* Inquiry Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="sm:max-w-xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col gap-0 p-0">
            <DialogHeader className="shrink-0 px-6 pt-6 pb-3 border-b space-y-2">
              <div className="flex items-start justify-between gap-3 pr-8">
                <DialogTitle className="text-lg font-bold min-w-0 truncate">
                  {selectedItem.senderName || "Website Visitor"}
                </DialogTitle>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {selectedItem.convertedLeadId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => router.push(`/leads/${selectedItem.convertedLeadId}`)}
                    >
                      <Target className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                      Open Lead
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={convertingId === selectedItem.id}
                      onClick={() => handleConvertToLead(selectedItem)}
                    >
                      {convertingId === selectedItem.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Target className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Convert to Lead
                    </Button>
                  )}
                  {selectedItem.convertedClientId ? (
                    <Button
                      size="sm"
                      className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-7 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                      onClick={() => router.push("/client-management")}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400 dark:text-emerald-600" />
                      View in Clients
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-7 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                      disabled={convertingId === selectedItem.id}
                      onClick={() => handleConvertToClient(selectedItem)}
                    >
                      {convertingId === selectedItem.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Convert to Client
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={selectedItem.status === "replied" ? "default" : "outline"}
                    className="text-xs h-7 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    onClick={() => handleUpdateStatus(selectedItem.id, "replied")}
                  >
                    Mark Replied
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/20"
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <DialogDescription className="text-xs">
                Submitted on {new Date(selectedItem.createdAt).toLocaleString()} via{" "}
                {selectedItem.origin || "Direct"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              {/* Lead / Client conversion banner */}
              {(selectedItem.convertedLeadId || selectedItem.convertedClientId || selectedItem.isExistingClient) && (
                <div className="p-3 rounded-lg border bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      {selectedItem.convertedLeadId && !selectedItem.convertedClientId
                        ? "Converted to a Lead in its brand."
                        : selectedItem.convertedClientId
                        ? "Successfully linked to Clients & Contacts Management."
                        : "Sender recognized as an existing client."}{" "}
                      Duplicate records are prevented.
                    </span>
                  </div>
                  {selectedItem.convertedLeadId && !selectedItem.convertedClientId ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-emerald-700 dark:text-emerald-300 underline font-semibold flex-shrink-0"
                      onClick={() => router.push(`/leads/${selectedItem.convertedLeadId}`)}
                    >
                      Open Lead →
                    </Button>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-emerald-700 dark:text-emerald-300 underline font-semibold flex-shrink-0"
                      onClick={() => router.push("/client-management")}
                    >
                      Open Client →
                    </Button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border">
                {units.length > 1 && (
                  <div className="min-w-0 break-words sm:col-span-2">
                    <span className="text-muted-foreground font-medium">Brand:</span>{" "}
                    <span className="font-semibold">{brandLabelFor(selectedItem.businessUnitId)}</span>
                  </div>
                )}
                <div className="min-w-0 break-words">
                  <span className="text-muted-foreground font-medium">Email:</span>{" "}
                  {selectedItem.senderEmail ? (
                    <a
                      href={`mailto:${selectedItem.senderEmail}`}
                      className="text-indigo-600 hover:underline font-mono"
                    >
                      {selectedItem.senderEmail}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="min-w-0 break-words">
                  <span className="text-muted-foreground font-medium">Phone:</span>{" "}
                  {selectedItem.senderPhone || "—"}
                </div>
                <div className="min-w-0 break-words">
                  <span className="text-muted-foreground font-medium">Form:</span>{" "}
                  {selectedItem.formName || "Contact"}
                </div>
                <div className="min-w-0 break-words">
                  <span className="text-muted-foreground font-medium">Source IP:</span>{" "}
                  <code className="text-xs font-mono">{selectedItem.ipAddress || "—"}</code>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Message Content:</p>
                <div className="p-3 bg-muted/60 rounded-lg text-sm whitespace-pre-wrap leading-relaxed border max-h-48 overflow-y-auto">
                  {selectedItem.message || <span className="text-muted-foreground italic">No message text</span>}
                </div>
              </div>

              {/* Custom Form Fields if present */}
              {(() => {
                const standardKeys = new Set([
                  'publicKey',
                  'apiKey',
                  'secretKey',
                  'turnstileToken',
                  'recaptchaToken',
                  '_honey',
                  '_gotcha',
                  '_notify',
                  'notificationEmail',
                  'notifyEmail',
                  'name',
                  'senderName',
                  'fullName',
                  'email',
                  'senderEmail',
                  'phone',
                  'senderPhone',
                  'message',
                  'comments',
                  'query',
                  'formName',
                  'convertedClientId',
                  'convertedLeadId',
                  'duplicateDetected',
                  'convertedAt',
                  'customFields',
                ]);
                const customEntries: { key: string; label: string; value: any }[] = [];
                if (selectedItem.data) {
                  const src = selectedItem.data.customFields || selectedItem.data;
                  for (const [k, v] of Object.entries(src)) {
                    if (!standardKeys.has(k) && v !== undefined && v !== null && v !== '') {
                      const label = k
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/[_-]/g, ' ')
                        .replace(/^\w/, (c) => c.toUpperCase())
                        .trim();
                      customEntries.push({ key: k, label, value: v });
                    }
                  }
                }

                if (customEntries.length === 0) return null;

                return (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                      <span>Custom Form Fields:</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {customEntries.length} field{customEntries.length > 1 ? 's' : ''}
                      </span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customEntries.map((item) => (
                        <div
                          key={item.key}
                          className="p-2.5 rounded-lg border bg-muted/30 text-xs flex flex-col justify-between"
                        >
                          <span className="text-xs font-medium text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 break-words">
                            {typeof item.value === 'object'
                              ? JSON.stringify(item.value)
                              : String(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const hiddenPayloadKeys = new Set([
                  "publicKey",
                  "apiKey",
                  "secretKey",
                  "turnstileToken",
                  "recaptchaToken",
                  "_honey",
                  "_gotcha",
                  "_notify",
                  "notificationEmail",
                  "notifyEmail",
                  "convertedClientId",
                  "convertedLeadId",
                  "duplicateDetected",
                  "convertedAt",
                  "customFields",
                ]);
                const visibleData = selectedItem.data
                  ? Object.fromEntries(
                      Object.entries(selectedItem.data).filter(([key]) => !hiddenPayloadKeys.has(key))
                    )
                  : {};
                const visibleEntries = Object.entries(visibleData);
                if (visibleEntries.length === 0) return null;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Form Data:</p>
                      <div className="flex items-center gap-0.5 rounded-md border p-0.5">
                        <button
                          type="button"
                          onClick={() => setPayloadView("table")}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            payloadView === "table"
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Table
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayloadView("json")}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            payloadView === "json"
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          JSON
                        </button>
                      </div>
                    </div>
                    {payloadView === "table" ? (
                      <div className="rounded-lg border overflow-auto max-h-48">
                        <table className="w-full text-xs">
                          <tbody>
                            {visibleEntries.map(([key, value], idx) => (
                              <tr key={key} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                                <td className="px-2.5 py-1.5 font-medium text-muted-foreground align-top whitespace-nowrap w-1/3">
                                  {key}
                                </td>
                                <td className="px-2.5 py-1.5 break-words">
                                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <pre className="p-2.5 bg-slate-950 text-slate-200 rounded-lg text-xs font-mono overflow-auto max-h-48">
                        {JSON.stringify(visibleData, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

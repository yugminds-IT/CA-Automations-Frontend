"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { AuditEvent, SignInEvent, listAuditEvents, listSignIns } from "@/lib/api/access";
import { deviceLabel, signInOutcome } from "@/lib/access";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

const CHANGE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Everything" },
  { value: "staff.", label: "People" },
  { value: "team.", label: "Teams" },
  { value: "profile.", label: "Profiles" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Who changed what, and who signed in. Admin only. Backend: access/audit and access/sign-ins. */
export function ActivityCard() {
  const { toast } = useToast();
  const [tab, setTab] = useState("changes");
  const [prefix, setPrefix] = useState("");
  const [changes, setChanges] = useState<AuditEvent[] | null>(null);
  const [signIns, setSignIns] = useState<SignInEvent[] | null>(null);

  const loadChanges = useCallback(async () => {
    setChanges(null);
    try {
      setChanges(await listAuditEvents(prefix || undefined));
    } catch (err) {
      setChanges([]);
      toast({ title: "Could not load changes", description: errorText(err), variant: "destructive" });
    }
  }, [prefix, toast]);

  const loadSignIns = useCallback(async () => {
    setSignIns(null);
    try {
      setSignIns(await listSignIns());
    } catch (err) {
      setSignIns([]);
      toast({ title: "Could not load sign-ins", description: errorText(err), variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (tab === "changes") loadChanges();
    else loadSignIns();
  }, [tab, loadChanges, loadSignIns]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
        <CardDescription>Changes to staff, teams and profiles are kept. Sign-ins are kept for 90 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="signins">Sign-ins</TabsTrigger>
          </TabsList>

          <TabsContent value="changes" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {CHANGE_FILTERS.map((f) => (
                <button
                  key={f.value || "all"}
                  type="button"
                  onClick={() => setPrefix(f.value)}
                  className={`rounded-md border px-2 py-1 text-xs ${prefix === f.value ? "bg-muted font-semibold" : "text-muted-foreground"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {changes === null ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : changes.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nothing changed yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>What</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs">{when(e.createdAt)}</TableCell>
                      <TableCell className="text-xs">{e.actorName ?? "System"}</TableCell>
                      <TableCell className="text-xs">{e.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="signins">
            {signIns === null ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : signIns.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No sign-ins yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signIns.map((e) => {
                    const outcome = signInOutcome(e);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-xs">{when(e.createdAt)}</TableCell>
                        <TableCell className="text-xs">{e.userEmail ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={outcome.tone === "ok" ? "default" : "secondary"}>{outcome.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{deviceLabel(e.userAgent)}</TableCell>
                        <TableCell className="font-mono text-xs">{e.ipAddress ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

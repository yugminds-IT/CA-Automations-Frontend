"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import { LeadTask, listOpenTasks, setTaskDone } from "@/lib/api/leads";
import { loadSnapshot, saveSnapshot } from "@/lib/offline-snapshot";
import { groupTasksByDay, type TaskGroup } from "@/lib/task-groups";

const SNAPSHOT_KEY = "open-tasks";

/**
 * Open tasks grouped as overdue, today, tomorrow, later and no date.
 * The last synced list is kept on the device, so the page still shows it with no signal.
 */
export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<LeadTask[] | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listOpenTasks();
      setTasks(res);
      setSavedAt(Date.now());
      setOffline(false);
      saveSnapshot(SNAPSHOT_KEY, res);
    } catch {
      const cached = loadSnapshot<LeadTask[]>(SNAPSHOT_KEY);
      if (cached) {
        setTasks(cached.data);
        setSavedAt(cached.savedAt);
      } else {
        setTasks([]);
      }
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    load();
    const onOnline = () => load();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

  const groups = useMemo<TaskGroup[]>(() => groupTasksByDay(tasks ?? [], new Date()), [tasks]);

  const complete = async (task: LeadTask) => {
    setBusyId(task.id);
    try {
      await setTaskDone(task.id, true);
      setTasks((prev) => (prev ?? []).filter((t) => t.id !== task.id));
    } catch (e) {
      toast({
        title: "Could not update the task",
        description: offline ? "You are offline. Changes need a connection." : (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <PageHeader
        title="Tasks"
        description="Follow-ups you set on leads, grouped by when they are due. Add one from a lead's page."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      {offline && (
        <div role="status" className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <WifiOff className="size-4" />
          You are offline. Showing the list saved {savedAt ? new Date(savedAt).toLocaleString() : "earlier"}. Changes need a connection.
        </div>
      )}

      {tasks === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open tasks. Nice work.</p>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              {g.label}
              <Badge variant={g.key === "overdue" ? "destructive" : "secondary"}>{g.tasks.length}</Badge>
            </h2>
            <Card>
              <CardContent className="divide-y p-0">
                {g.tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3">
                    <Checkbox
                      checked={false}
                      disabled={busyId === t.id || offline}
                      onCheckedChange={(v) => v && complete(t)}
                      aria-label={`Mark ${t.title} done`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.dueAt ? new Date(t.dueAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No due date"}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/leads/${t.leadId}`}>Open lead</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}

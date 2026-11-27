"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { StaffMember, Team, TeamInput, createTeam, deleteTeam, updateTeam } from "@/lib/api/access";
import { parentTeamChoices } from "@/lib/access";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

interface TeamDraft {
  id?: number;
  name: string;
  parentTeamId: number | null;
  managerUserId: number | null;
}

export function TeamsCard({
  teams,
  staff,
  loading,
  onChanged,
}: {
  teams: Team[];
  staff: StaffMember[];
  loading: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<TeamDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const teamName = (id: number | null) => teams.find((t) => t.id === id)?.name ?? "Top level";
  const managers = staff.filter((s) => s.isActive);

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast({ title: "Give the team a name", variant: "destructive" });
      return;
    }
    const body: TeamInput = { name, parentTeamId: draft.parentTeamId, managerUserId: draft.managerUserId };
    setBusy(true);
    try {
      if (draft.id) await updateTeam(draft.id, body);
      else await createTeam(body);
      setDraft(null);
      toast({ title: "Team saved", variant: "success" });
      onChanged();
    } catch (err) {
      toast({ title: "Could not save team", description: errorText(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (team: Team) => {
    if (!confirm(`Delete the team "${team.name}"? Its members stay in the organization but leave the team.`)) return;
    try {
      await deleteTeam(team.id);
      toast({ title: "Team deleted" });
      onChanged();
    } catch (err) {
      toast({ title: "Could not delete team", description: errorText(err), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Teams</CardTitle>
          <CardDescription>
            A manager sees the records owned by their team and every sub-team below it, when their profile uses the team scope.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setDraft({ name: "", parentTeamId: null, managerUserId: null })}>
          <Plus className="mr-1 h-4 w-4" /> New team
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : teams.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No teams yet. Staff can work without one.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Reports to</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-xs">{teamName(t.parentTeamId)}</TableCell>
                  <TableCell className="text-xs">{t.managerName ?? "No manager"}</TableCell>
                  <TableCell className="text-xs">{t.memberCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDraft({ id: t.id, name: t.name, parentTeamId: t.parentTeamId, managerUserId: t.managerUserId })}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => remove(t)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit team" : "New team"}</DialogTitle>
            <DialogDescription>Put a team under another team to make a hierarchy. Managers see everything below them.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Name</Label>
                <Input className="mt-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Reports to</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.parentTeamId ?? ""}
                  onChange={(e) => setDraft({ ...draft, parentTeamId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Top level</option>
                  {parentTeamChoices(teams, draft.id ?? null).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Manager</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.managerUserId ?? ""}
                  onChange={(e) => setDraft({ ...draft, managerUserId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">No manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name || m.email}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

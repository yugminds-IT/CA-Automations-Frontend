"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { TeamsCard } from "@/components/staff/teams-card";
import { BulkInviteDialog } from "@/components/staff/bulk-invite-dialog";
import { ActivityCard } from "@/components/staff/activity-card";
import { BusinessUnit, listBusinessUnits } from "@/lib/api/business-units";
import { OrgUnit, listOrgUnits } from "@/lib/api/units";
import { UnitBrandPicker } from "@/components/staff/unit-brand-picker";
import { assignmentSummary } from "@/lib/unit-structure";
import {
  DataScope,
  InviteResult,
  PermissionCatalog,
  PermissionProfile,
  StaffMember,
  Team,
  createProfile,
  deleteProfile,
  getPermissionCatalog,
  inviteStaff,
  getMyAccess,
  listProfiles,
  listStaff,
  listTeams,
  updateProfile,
  updateStaff,
} from "@/lib/api/access";
import { defaultProfileId, permissionSummary, profileProblems, staffStatus, togglePermission } from "@/lib/access";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

interface ProfileDraft {
  id?: number;
  name: string;
  description: string;
  dataScope: DataScope;
  permissions: string[];
  isPreset: boolean;
}

export default function StaffAccessPage() {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]); // brands
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  // False for a single-branch workspace: no brand pickers, and everyone sees its data directly.
  const [adminPanel, setAdminPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [revealed, setRevealed] = useState<{ title: string; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, prof, people, unitList, teamList, access, orgUnitList] = await Promise.all([
        getPermissionCatalog(),
        listProfiles(),
        listStaff(),
        listBusinessUnits(),
        listTeams(),
        getMyAccess(),
        listOrgUnits(),
      ]);
      setOrgUnits(orgUnitList);
      setAdminPanel(access.adminPanel !== false);
      setCatalog(cat);
      setProfiles(prof);
      setStaff(people);
      setUnits(unitList);
      setTeams(teamList);
    } catch (err) {
      toast({ title: "Could not load staff", description: errorText(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPermissions = catalog?.groups.reduce((n, g) => n + g.permissions.length, 0) ?? 0;
  const profileName = (id: number | null) => profiles.find((p) => p.id === id)?.name ?? "Legacy access";
  // With no admin panel there is one branch, so "their business units" means the whole workspace.
  const effectiveScope = (k: DataScope): DataScope => (!adminPanel && k === "units" ? "org" : k);
  const scopeLabel = (k: DataScope) => catalog?.dataScopes[effectiveScope(k)] ?? k;
  // Dialogs get no brands to pick from in a single-branch workspace, which hides their pickers.
  const pickableUnits = adminPanel ? units : [];
  const pickableOrgUnits = adminPanel ? orgUnits : [];

  const saveProfile = async () => {
    if (!profileDraft) return;
    const problems = profileProblems(profileDraft);
    if (problems.length) {
      toast({ title: problems[0], variant: "destructive" });
      return;
    }
    const body = {
      name: profileDraft.name.trim(),
      description: profileDraft.description.trim() || null,
      permissions: profileDraft.permissions,
      dataScope: profileDraft.dataScope,
    };
    try {
      if (profileDraft.id) await updateProfile(profileDraft.id, body);
      else await createProfile(body);
      setProfileDraft(null);
      toast({ title: "Profile saved", variant: "success" });
      await load();
    } catch (err) {
      toast({ title: "Could not save profile", description: errorText(err), variant: "destructive" });
    }
  };

  const removeProfile = async (p: PermissionProfile) => {
    if (!confirm(`Delete the profile "${p.name}"?`)) return;
    try {
      await deleteProfile(p.id);
      toast({ title: "Profile deleted" });
      await load();
    } catch (err) {
      toast({ title: "Could not delete profile", description: errorText(err), variant: "destructive" });
    }
  };

  const onInvited = (res: InviteResult, name: string) => {
    setInviteOpen(false);
    if (res.temporaryPassword) {
      setRevealed({
        title: `Temporary password for ${name}`,
        text: `Email: ${res.email}\nPassword: ${res.temporaryPassword}\n\nShare it securely. It is shown only once.`,
      });
    } else if (res.sent === false && res.inviteLink) {
      setRevealed({
        title: `Invite link for ${name}`,
        text: `The invitation email could not be sent. Share this link (valid 7 days):\n${res.inviteLink}`,
      });
    } else {
      toast({ title: "Invitation sent", description: res.email, variant: "success" });
    }
    load();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff & access</h1>
        <p className="text-sm text-muted-foreground">
          Profiles say what a person can do and which records they see. Staff without a profile keep their current access.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Permission profiles</CardTitle>
            <CardDescription>Presets are a starting point. Edit them or make your own.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setProfileDraft({ name: "", description: "", dataScope: "own", permissions: [], isPreset: false })}>
            <Plus className="mr-1 h-4 w-4" /> New profile
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Sees</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{permissionSummary(p.permissions, totalPermissions)}</TableCell>
                    <TableCell className="text-xs">{scopeLabel(p.dataScope)}</TableCell>
                    <TableCell className="text-xs">{p.staffCount}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setProfileDraft({ id: p.id, name: p.name, description: p.description ?? "", dataScope: p.dataScope, permissions: p.permissions, isPreset: p.isPreset })}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => removeProfile(p)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TeamsCard teams={teams} staff={staff} loading={loading} onChanged={load} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Staff</CardTitle>
            <CardDescription>Invite people by email, or set a temporary password.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} disabled={profiles.length === 0}>
              <Users className="mr-1 h-4 w-4" /> Invite many
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)} disabled={profiles.length === 0}>
              <UserPlus className="mr-1 h-4 w-4" /> Invite staff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? null : staff.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No staff yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Team</TableHead>
                  {adminPanel && <TableHead>Assigned to</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => {
                  const status = staffStatus(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name || s.email}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </TableCell>
                      <TableCell className="text-xs">{profileName(s.profileId)}</TableCell>
                      <TableCell className="text-xs">{s.teamName ?? "None"}</TableCell>
                      {adminPanel && (
                        <TableCell className="text-xs">
                          {assignmentSummary(s.orgUnitIds ?? [], s.businessUnitIds, orgUnits, units)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={status.tone === "ok" ? "default" : "secondary"}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(s)}>
                          <KeyRound className="mr-1 h-3.5 w-3.5" /> Manage
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

      <ActivityCard />

      {/* Profile editor */}
      <Dialog open={profileDraft !== null} onOpenChange={(o) => !o && setProfileDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{profileDraft?.id ? "Edit profile" : "New profile"}</DialogTitle>
            <DialogDescription>Tick what this profile can do. Then choose which records it sees.</DialogDescription>
          </DialogHeader>
          {profileDraft && catalog && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">Name</Label>
                  <Input className="mt-1" value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Records they see</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={effectiveScope(profileDraft.dataScope)}
                    onChange={(e) => setProfileDraft({ ...profileDraft, dataScope: e.target.value as DataScope })}
                  >
                    {(Object.keys(catalog.dataScopes) as DataScope[])
                      .filter((k) => adminPanel || k !== "units")
                      .map((k) => (
                        <option key={k} value={k}>{catalog.dataScopes[k]}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Description</Label>
                <Input className="mt-1" value={profileDraft.description} onChange={(e) => setProfileDraft({ ...profileDraft, description: e.target.value })} />
              </div>
              {catalog.groups.map((g) => (
                <div key={g.title}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.permissions.map((p) => (
                      <label key={p.key} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4"
                          checked={profileDraft.permissions.includes(p.key)}
                          onChange={() => setProfileDraft({ ...profileDraft, permissions: togglePermission(profileDraft.permissions, p.key) })}
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setProfileDraft(null)}>Cancel</Button>
            <Button size="sm" onClick={saveProfile}>Save profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        profiles={profiles}
        units={pickableUnits}
        orgUnits={pickableOrgUnits}
        teams={teams}
        onInvited={onInvited}
      />

      <BulkInviteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        profiles={profiles}
        units={pickableUnits}
        orgUnits={pickableOrgUnits}
        teams={teams}
        onDone={load}
      />

      {/* Manage one person */}
      <ManageDialog
        member={editing}
        onClose={() => setEditing(null)}
        profiles={profiles}
        units={pickableUnits}
        orgUnits={pickableOrgUnits}
        teams={teams}
        staff={staff}
        onSaved={() => {
          setEditing(null);
          toast({ title: "Saved", variant: "success" });
          load();
        }}
        onError={(err) => toast({ title: "Could not save", description: errorText(err), variant: "destructive" })}
      />

      {/* One-time reveal of a password or link */}
      <Dialog open={revealed !== null} onOpenChange={(o) => !o && setRevealed(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{revealed?.title}</DialogTitle>
          </DialogHeader>
          <textarea readOnly className="min-h-[120px] w-full rounded-md border bg-muted/40 p-3 font-mono text-xs" value={revealed?.text ?? ""} />
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(revealed?.text ?? "").then(() => toast({ title: "Copied" }))}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
            <Button size="sm" onClick={() => setRevealed(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  profiles,
  units,
  orgUnits,
  teams,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profiles: PermissionProfile[];
  units: BusinessUnit[];
  orgUnits: OrgUnit[];
  teams: Team[];
  onInvited: (res: InviteResult, name: string) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileId, setProfileId] = useState<number | undefined>(undefined);
  const [unitIds, setUnitIds] = useState<number[]>([]);
  const [orgUnitIds, setOrgUnitIds] = useState<number[]>([]);
  const [teamId, setTeamId] = useState<number | undefined>(undefined);
  const [roleName, setRoleName] = useState<"CAA" | "ORG_EMPLOYEE">("ORG_EMPLOYEE");
  const [mode, setMode] = useState<"email" | "temporary_password">("email");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setProfileId(undefined);
    setUnitIds([]);
    setOrgUnitIds([]);
    setTeamId(undefined);
    setRoleName("ORG_EMPLOYEE");
    setMode("email");
  };

  const submit = async () => {
    const chosen = profileId ?? defaultProfileId(profiles);
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email are needed", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await inviteStaff({
        name: name.trim(),
        email: email.trim(),
        roleName,
        profileId: chosen,
        businessUnitIds: unitIds,
        orgUnitIds,
        teamId,
        mode,
      });
      const invitedName = name.trim();
      reset();
      onInvited(res, invitedName);
    } catch (err) {
      toast({ title: "Could not invite", description: errorText(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite staff</DialogTitle>
          <DialogDescription>They get an email with a link to set their password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold">Name</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Email</Label>
              <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold">Profile</Label>
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={profileId ?? defaultProfileId(profiles) ?? ""} onChange={(e) => setProfileId(Number(e.target.value))}>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Role</Label>
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={roleName} onChange={(e) => setRoleName(e.target.value as "CAA" | "ORG_EMPLOYEE")}>
                <option value="ORG_EMPLOYEE">Staff</option>
                <option value="CAA">Accountant</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Team</Label>
            <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={teamId ?? ""} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {units.length > 0 && (
          <div>
            <Label className="text-xs font-semibold">{orgUnits.length > 1 ? "Units and brands" : "Brands"}</Label>
            <UnitBrandPicker
              orgUnits={orgUnits}
              brands={units.filter((u) => u.isActive || unitIds.includes(u.id))}
              brandIds={unitIds}
              orgUnitIds={orgUnitIds}
              onChange={(next) => {
                setUnitIds(next.brandIds);
                setOrgUnitIds(next.orgUnitIds);
              }}
            />
          </div>
          )}
          <div>
            <Label className="text-xs font-semibold">How they get in</Label>
            <div className="mt-1 space-y-1 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={mode === "email"} onChange={() => setMode("email")} /> Email them a link to set a password</label>
              <label className="flex items-center gap-2"><input type="radio" checked={mode === "temporary_password"} onChange={() => setMode("temporary_password")} /> Show me a temporary password to share</label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageDialog({
  member,
  onClose,
  profiles,
  units,
  orgUnits,
  teams,
  staff,
  onSaved,
  onError,
}: {
  member: StaffMember | null;
  onClose: () => void;
  profiles: PermissionProfile[];
  units: BusinessUnit[];
  orgUnits: OrgUnit[];
  teams: Team[];
  staff: StaffMember[];
  onSaved: () => void;
  onError: (err: unknown) => void;
}) {
  const [profileId, setProfileId] = useState<number | null>(null);
  const [unitIds, setUnitIds] = useState<number[]>([]);
  const [orgUnitIds, setOrgUnitIds] = useState<number[]>([]);
  const [active, setActive] = useState(true);
  const [reassignTo, setReassignTo] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [key, setKey] = useState<number | null>(null);

  // Reset the form whenever a different person is opened.
  if (member && key !== member.id) {
    setKey(member.id);
    setProfileId(member.profileId);
    setTeamId(member.teamId);
    setUnitIds(member.businessUnitIds);
    setOrgUnitIds(member.orgUnitIds ?? []);
    setActive(member.isActive);
    setReassignTo(null);
  }

  const save = async () => {
    if (!member) return;
    const patch: Parameters<typeof updateStaff>[1] = {};
    if (profileId !== member.profileId) patch.profileId = profileId;
    if (teamId !== member.teamId) patch.teamId = teamId;
    if (unitIds.join(",") !== member.businessUnitIds.join(",")) patch.businessUnitIds = unitIds;
    if (orgUnitIds.join(",") !== (member.orgUnitIds ?? []).join(",")) patch.orgUnitIds = orgUnitIds;
    if (active !== member.isActive) {
      patch.isActive = active;
      if (!active && reassignTo) patch.reassignTo = reassignTo;
    }
    try {
      if (Object.keys(patch).length) await updateStaff(member.id, patch);
      onSaved();
    } catch (err) {
      onError(err);
    }
  };

  const others = staff.filter((s) => s.id !== member?.id && s.isActive);

  return (
    <Dialog open={member !== null} onOpenChange={(o) => { if (!o) { setKey(null); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member?.name || member?.email}</DialogTitle>
          <DialogDescription>{member?.email}</DialogDescription>
        </DialogHeader>
        {member && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Profile</Label>
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={profileId ?? ""} onChange={(e) => setProfileId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Legacy access (no profile)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Team</Label>
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={teamId ?? ""} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {units.length > 0 && (
            <div>
              <Label className="text-xs font-semibold">{orgUnits.length > 1 ? "Units and brands" : "Brands"}</Label>
              <UnitBrandPicker
                orgUnits={orgUnits}
                brands={units.filter((u) => u.isActive || unitIds.includes(u.id))}
                brandIds={unitIds}
                orgUnitIds={orgUnitIds}
                onChange={(next) => {
                  setUnitIds(next.brandIds);
                  setOrgUnitIds(next.orgUnitIds);
                }}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Used when a profile lets someone see records in their units.</p>
            </div>
            )}
            <div className="rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Account is active
              </label>
              {!active && (
                <div className="mt-2">
                  <Label className="text-xs font-semibold">Give their leads to</Label>
                  <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={reassignTo ?? ""} onChange={(e) => setReassignTo(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Leave unowned</option>
                    {others.map((o) => (
                      <option key={o.id} value={o.id}>{o.name || o.email}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">Their records are kept. They can no longer sign in.</p>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setKey(null); onClose(); }}>Cancel</Button>
          <Button size="sm" onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

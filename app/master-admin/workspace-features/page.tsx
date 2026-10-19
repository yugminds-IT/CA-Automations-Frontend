"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MasterAdminSidebar,
} from "@/components/master-admin-sidebar";
import { MasterAdminHeader } from "@/components/master-admin-header";
import { LekvyaLoader } from "@/components/ui/lekvya-loader";
import {
  isAuthenticated,
  isMasterAdminUser,
} from "@/lib/api/index";
import {
  getMasterAdminWorkspaceFeatures,
  updateWorkspaceFeature,
  reorderWorkspaceFeatures,
  resetWorkspaceFeatures,
  WorkspaceFeatureItem,
} from "@/lib/api/workspace-features";
import {
  Layers,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Eye,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Globe,
  GraduationCap,
  ShoppingCart,
  HeartPulse,
  Rocket,
  Calculator,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const ICON_MAP: Record<string, React.ElementType> = {
  Globe,
  GraduationCap,
  ShoppingCart,
  HeartPulse,
  Rocket,
  Calculator,
  Mail,
  Sparkles,
};

export default function WorkspaceFeaturesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [features, setFeatures] = useState<WorkspaceFeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Edit Dialog State
  const [editingItem, setEditingItem] = useState<WorkspaceFeatureItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    badge: "",
    description: "",
    priority: 1,
    isLocked: false,
    lockReason: "",
    isActive: true,
  });

  // Lock Confirmation Dialog
  const [lockDialogItem, setLockDialogItem] = useState<WorkspaceFeatureItem | null>(null);
  const [lockReasonInput, setLockReasonInput] = useState("");

  // Preview Dialog
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    if (!isMasterAdminUser()) {
      toast({
        title: "Access Denied",
        description: "You must be a master admin to access this page.",
        variant: "destructive",
      });
      router.replace("/dashboard");
      return;
    }
    setIsCheckingAuth(false);
    loadFeatures();
  }, [router, toast]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    setSidebarCollapsed(saved !== null ? saved === "true" : true);
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const data = await getMasterAdminWorkspaceFeatures();
      setFeatures(data.sort((a, b) => a.priority - b.priority));
    } catch (err: any) {
      toast({
        title: "Failed to load features",
        description: err.message || "Could not retrieve workspace cards.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle Lock/Unlock
  const handleToggleLock = async (item: WorkspaceFeatureItem) => {
    if (!item.isLocked) {
      // Opening lock dialog to specify reason if desired
      setLockDialogItem(item);
      setLockReasonInput(item.lockReason || "Currently locked by platform administration.");
    } else {
      // Direct unlock
      setSavingKey(item.key);
      try {
        const updated = await updateWorkspaceFeature(item.key, {
          isLocked: false,
          lockReason: null,
        });
        setFeatures((prev) =>
          prev.map((f) => (f.key === item.key ? { ...f, ...updated } : f))
        );
        toast({
          title: "Feature Unlocked",
          description: `"${item.name}" is now unlocked for all workspace signups.`,
        });
      } catch (err: any) {
        toast({
          title: "Failed to unlock feature",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setSavingKey(null);
      }
    }
  };

  const handleConfirmLock = async () => {
    if (!lockDialogItem) return;
    setSavingKey(lockDialogItem.key);
    try {
      const updated = await updateWorkspaceFeature(lockDialogItem.key, {
        isLocked: true,
        lockReason: lockReasonInput.trim() || "Currently locked by platform administration.",
      });
      setFeatures((prev) =>
        prev.map((f) => (f.key === lockDialogItem.key ? { ...f, ...updated } : f))
      );
      toast({
        title: "Feature Locked",
        description: `"${lockDialogItem.name}" has been locked on the signup page.`,
      });
      setLockDialogItem(null);
    } catch (err: any) {
      toast({
        title: "Failed to lock feature",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  // Move Priority Up/Down
  const handleMovePriority = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= features.length) return;

    const newFeatures = [...features];
    const currentItem = newFeatures[index];
    const targetItem = newFeatures[targetIndex];

    // Swap priorities
    const tempPriority = currentItem.priority;
    currentItem.priority = targetItem.priority === tempPriority ? tempPriority + (direction === "up" ? -1 : 1) : targetItem.priority;
    targetItem.priority = tempPriority;

    newFeatures.sort((a, b) => a.priority - b.priority);
    // Normalize 1..N priorities
    newFeatures.forEach((item, idx) => {
      item.priority = idx + 1;
    });

    setFeatures(newFeatures);

    try {
      await reorderWorkspaceFeatures(
        newFeatures.map((f) => ({ key: f.key, priority: f.priority }))
      );
      toast({
        title: "Priority Updated",
        description: `Moved "${currentItem.name}" ${direction === "up" ? "higher" : "lower"} in display order.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to reorder",
        description: err.message,
        variant: "destructive",
      });
      loadFeatures();
    }
  };

  // Save Edit Dialog
  const handleOpenEdit = (item: WorkspaceFeatureItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      badge: item.badge,
      description: item.description,
      priority: item.priority,
      isLocked: item.isLocked,
      lockReason: item.lockReason || "",
      isActive: item.isActive,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingKey(editingItem.key);
    try {
      const updated = await updateWorkspaceFeature(editingItem.key, {
        name: editForm.name,
        badge: editForm.badge,
        description: editForm.description,
        priority: Number(editForm.priority),
        isLocked: editForm.isLocked,
        lockReason: editForm.isLocked ? editForm.lockReason : null,
        isActive: editForm.isActive,
      });

      setFeatures((prev) =>
        prev
          .map((f) => (f.key === editingItem.key ? { ...f, ...updated } : f))
          .sort((a, b) => a.priority - b.priority)
      );

      toast({
        title: "Feature Card Saved",
        description: `Updated configuration for "${editForm.name}".`,
      });
      setEditingItem(null);
    } catch (err: any) {
      toast({
        title: "Failed to update",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Are you sure you want to reset all workspace feature cards to default settings, priorities, and unlock all cards?"
      )
    )
      return;

    setLoading(true);
    try {
      const data = await resetWorkspaceFeatures();
      setFeatures(data.sort((a, b) => a.priority - b.priority));
      toast({
        title: "Reset to Defaults",
        description: "All workspace cards and display priorities have been reset.",
      });
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAuth) {
    return <LekvyaLoader className="min-h-screen" />;
  }

  const totalCards = features.length;
  const lockedCount = features.filter((f) => f.isLocked).length;
  const unlockedCount = totalCards - lockedCount;
  const topPriorityFeature = features[0]?.name || "—";

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <MasterAdminSidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />

      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{ marginLeft: isDesktop ? (sidebarCollapsed ? "60px" : "240px") : "0" }}
      >
        <MasterAdminHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <div className="overflow-auto flex-1" style={{ marginTop: "56px" }}>
          <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Layers className="w-6 h-6 text-orange-500" /> Workspace Feature Cards &amp; Display Priority
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Control which industry workflows are available or locked on the public &ldquo;Create your Lekvya Workspace&rdquo; registration page, and customize their display ranking.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                  className="text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                  Live Signup Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/signup", "_blank")}
                  className="text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open /signup
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reset Defaults
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="p-4 bg-card border shadow-xs">
                <span className="text-xs text-muted-foreground font-medium">Total Feature Cards</span>
                <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{totalCards}</p>
              </Card>

              <Card className="p-4 bg-card border shadow-xs">
                <span className="text-xs text-muted-foreground font-medium">Unlocked (Active for Signup)</span>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {unlockedCount}
                </p>
              </Card>

              <Card className="p-4 bg-card border shadow-xs">
                <span className="text-xs text-muted-foreground font-medium">Locked (Blocked)</span>
                <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                  {lockedCount}
                </p>
              </Card>

              <Card className="p-4 bg-card border shadow-xs">
                <span className="text-xs text-muted-foreground font-medium">#1 Priority Feature</span>
                <p className="text-sm font-semibold mt-1 truncate text-orange-600 dark:text-orange-400">
                  {topPriorityFeature}
                </p>
              </Card>
            </div>

            {/* Feature Cards Management List */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Cards Order &amp; Locking Status
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cards at the top (Priority #1) appear first on the signup page. Use the Up/Down buttons or edit priority directly.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadFeatures} className="text-xs h-7">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reload
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 divide-y">
                {loading ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    Loading workspace feature cards…
                  </div>
                ) : features.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    No cards found. Click &quot;Reset Defaults&quot; to seed original cards.
                  </div>
                ) : (
                  features.map((item, index) => {
                    const Icon = ICON_MAP[item.icon] || Sparkles;
                    const isFirst = index === 0;
                    const isLast = index === features.length - 1;

                    return (
                      <div
                        key={item.key}
                        className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-muted/40 ${
                          item.isLocked ? "bg-rose-50/25 dark:bg-rose-950/10" : ""
                        }`}
                      >
                        {/* Left: Priority Rank & Info */}
                        <div className="flex items-start sm:items-center gap-3.5">
                          {/* Priority Rank Pill */}
                          <div className="flex flex-col items-center justify-center shrink-0 w-12">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              Rank
                            </span>
                            <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">
                              #{item.priority}
                            </span>
                          </div>

                          {/* Up / Down Controls */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              disabled={isFirst}
                              onClick={() => handleMovePriority(index, "up")}
                              title="Move higher in priority"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              disabled={isLast}
                              onClick={() => handleMovePriority(index, "down")}
                              title="Move lower in priority"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Icon Preview */}
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shrink-0 shadow-xs`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Card Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm text-foreground">
                                {item.name}
                              </h3>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0 border-slate-300 font-medium"
                              >
                                {item.badge}
                              </Badge>

                              {item.isLocked ? (
                                <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] gap-1 px-2 py-0">
                                  <Lock className="w-3 h-3" /> LOCKED
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 px-2 py-0">
                                  <Unlock className="w-3 h-3" /> UNLOCKED
                                </Badge>
                              )}

                              {!item.isActive && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                                  HIDDEN
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl line-clamp-1">
                              {item.description}
                            </p>

                            {item.isLocked && item.lockReason && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                Lock Note: {item.lockReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions (Lock/Unlock & Edit) */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          {/* One-Click Lock/Unlock Toggle Button */}
                          <Button
                            variant={item.isLocked ? "default" : "outline"}
                            size="sm"
                            className={`h-8 text-xs font-semibold ${
                              item.isLocked
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "text-rose-600 hover:text-rose-700 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            }`}
                            disabled={savingKey === item.key}
                            onClick={() => handleToggleLock(item)}
                          >
                            {item.isLocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5 mr-1.5" />
                                Unlock Feature
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 mr-1.5" />
                                Lock Feature
                              </>
                            )}
                          </Button>

                          {/* Edit Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Lock Dialog (Prompt reason) */}
      <Dialog open={!!lockDialogItem} onOpenChange={() => setLockDialogItem(null)}>
        {lockDialogItem && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <Lock className="w-5 h-5" /> Lock &ldquo;{lockDialogItem.name}&rdquo;?
              </DialogTitle>
              <DialogDescription className="text-xs">
                When locked, visitors to &ldquo;Create your Lekvya Workspace&rdquo; will see a locked badge on this card and cannot select it to create an account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="lock-reason" className="text-xs font-semibold">
                  Notice to display when visitor clicks this card:
                </Label>
                <Textarea
                  id="lock-reason"
                  rows={3}
                  value={lockReasonInput}
                  onChange={(e) => setLockReasonInput(e.target.value)}
                  placeholder="e.g. This workspace workflow is currently locked by the master administrator."
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLockDialogItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                onClick={handleConfirmLock}
              >
                Confirm Lock
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        {editingItem && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Configure Card: {editingItem.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Adjust display priority rank, badge text, lock status, and card details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Card Title</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Badge Label</Label>
                  <Input
                    value={editForm.badge}
                    onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                    placeholder="e.g. Popular, API &amp; Webhooks"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Display Priority Rank (1 = Top)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({ ...editForm, priority: parseInt(e.target.value, 10) || 1 })
                    }
                    className="text-xs h-8 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Lock Status</Label>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={editForm.isLocked ? "destructive" : "outline"}
                      className="text-xs h-8 flex-1"
                      onClick={() => setEditForm({ ...editForm, isLocked: !editForm.isLocked })}
                    >
                      {editForm.isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5 mr-1" /> Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Unlocked
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {editForm.isLocked && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Lock Reason Note</Label>
                  <Input
                    value={editForm.lockReason}
                    onChange={(e) => setEditForm({ ...editForm, lockReason: e.target.value })}
                    placeholder="e.g. Enterprise only or Contact support"
                    className="text-xs h-8"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-black text-white hover:bg-zinc-800 text-xs"
                onClick={handleSaveEdit}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Live Preview Modal (Simulating /signup) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" /> Live Preview: &ldquo;Create your Lekvya Workspace&rdquo;
            </DialogTitle>
            <DialogDescription className="text-xs">
              This is how visitors will see the cards in real-time, arranged by your priority ranking with lock status enforced.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 p-6 rounded-2xl border my-2">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Create your{" "}
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  Lekvya Workspace
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select an industry to preconfigure automated workflows, email templates &amp; API defaults.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map((ind) => {
                const Icon = ICON_MAP[ind.icon] || Sparkles;
                return (
                  <div
                    key={ind.key}
                    className={`relative border rounded-xl p-4 flex flex-col justify-between bg-white min-h-[160px] transition-all shadow-xs ${
                      ind.isLocked
                        ? "border-slate-300 opacity-75 bg-slate-50/70"
                        : "border-slate-200 hover:border-orange-400"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${ind.gradient} flex items-center justify-center text-white shrink-0 shadow-xs`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {ind.isLocked ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {ind.badge}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            #{ind.priority}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-semibold text-slate-900 text-sm mb-1">
                        {ind.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {ind.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
                      {ind.isLocked ? (
                        <span className="text-rose-500 font-medium">Feature Locked</span>
                      ) : (
                        <span className="text-orange-600">Choose this workflow →</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setPreviewOpen(false)} className="text-xs">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

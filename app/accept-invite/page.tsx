"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptStaffInvite } from "@/lib/api/access";

function AcceptInviteForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      await acceptStaffInvite(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set the password.");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <p className="text-sm text-zinc-600">This link is incomplete. Open the link from your invitation email.</p>;
  }
  if (done) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-zinc-800">Your password is set. You can sign in now.</p>
        <Link href="/login" className="text-sm font-medium underline">Go to sign in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="pw" className="text-xs font-semibold">New password</Label>
        <Input id="pw" type="password" autoComplete="new-password" className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="pw2" className="text-xs font-semibold">Confirm password</Label>
        <Input id="pw2" type="password" autoComplete="new-password" className="mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Set password"}</Button>
    </form>
  );
}

/** Public page: a staff member opens the link from their invitation email and sets a password. */
export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">Set your password</h1>
        <p className="mb-5 text-xs text-zinc-500">You were invited to join the team.</p>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </main>
  );
}

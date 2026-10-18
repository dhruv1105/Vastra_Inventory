"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, MoreVertical, Power, RotateCw, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Field from "@/components/ui/Field";
import Menu, { MenuItem } from "@/components/ui/Menu";
import { ChipGroup } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/Input";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { StaffMember } from "@/lib/staff";

type Pending = { kind: "disable" | "enable" | "owner" | "seller" | "reset"; member: StaffMember } | null;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.assign("/login?next=/staff");
  if (!res.ok) throw new Error(body.error || "Something went wrong. Try again.");
  return body.data as T;
}

const ROLE_OPTIONS = [
  { value: "seller", label: "Seller" },
  { value: "owner", label: "Owner" },
];

/** Shows a temporary password once, with a copy button and what to tell the person. */
function TemporaryPassword({ name, password }: { name: string; password: string }) {
  const { showToast } = useToast();
  return (
    <div className="grid gap-3">
      <p>
        Give this password to <span className="font-semibold text-fg">{name}</span>. They sign in with their phone number and choose their own password
        straight away. It is shown only now.
      </p>
      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-primary-soft bg-tint px-4 py-3">
        <span className="select-all font-mono text-xl tracking-wider text-fg">{password}</span>
        <Button
          size="sm"
          variant="secondary"
          icon={<Copy />}
          onClick={() =>
            navigator.clipboard
              .writeText(password)
              .then(() => showToast("Copied", "success"))
              .catch(() => showToast("Couldn't copy — select the password and copy it by hand.", "error"))
          }
        >
          Copy
        </Button>
      </div>
    </div>
  );
}

function AddPersonDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (m: StaffMember) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("seller");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ member: StaffMember; temporaryPassword: string } | null>(null);

  const close = () => {
    setName("");
    setPhone("");
    setEmail("");
    setRole("seller");
    setError(null);
    setResult(null);
    onClose();
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ member: StaffMember; temporaryPassword: string }>("/api/staff", {
        method: "POST",
        body: JSON.stringify({ name, phone, email: email || undefined, role }),
      });
      setResult(data);
      onAdded(data.member);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The person was not added.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={result ? `${result.member.name} can sign in now` : "Add a person"}
      onClose={close}
      busy={busy}
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="add-person-form" icon={<UserPlus />} loading={busy}>
              Add person
            </Button>
          </>
        )
      }
    >
      {result ? (
        <TemporaryPassword name={result.member.name} password={result.temporaryPassword} />
      ) : (
        <form
          id="add-person-form"
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <TextField id="staff-name" label="Name" required autoComplete="off" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <TextField id="staff-phone" label="Mobile number" required inputMode="tel" placeholder="98765 43210" help="They sign in with this number." value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField id="staff-email" label="Email" type="email" placeholder="Optional" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field id="staff-role" label="Role" group help={role === "owner" ? "Owners can change lists, see cost prices and manage staff." : "Sellers add items and see stock; they can't see cost prices."}>
            <ChipGroup labelledBy="staff-role-label" options={ROLE_OPTIONS} value={role} onChange={setRole} />
          </Field>
          {error && (
            <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </Dialog>
  );
}

const CONFIRM: Record<NonNullable<Pending>["kind"], (n: string) => { title: string; body: string; label: string; tone: "danger" | "primary" }> = {
  disable: (n) => ({ title: `Turn off ${n}'s account?`, body: `${n} is signed out everywhere and can't sign in until you turn the account back on. Their history stays.`, label: "Turn off", tone: "danger" }),
  enable: (n) => ({ title: `Turn ${n}'s account back on?`, body: `${n} can sign in again with their password.`, label: "Turn on", tone: "primary" }),
  owner: (n) => ({ title: `Make ${n} an owner?`, body: "Owners can change lists, see cost prices and manage staff.", label: "Make owner", tone: "primary" }),
  seller: (n) => ({ title: `Make ${n} a seller?`, body: "Sellers can't see cost prices, change lists or manage staff.", label: "Make seller", tone: "primary" }),
  reset: (n) => ({ title: `Reset ${n}'s password?`, body: `${n} is signed out everywhere and gets a new temporary password from you.`, label: "Reset password", tone: "primary" }),
};

export default function StaffPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [newPassword, setNewPassword] = useState<{ name: string; password: string } | null>(null);
  const isOwner = user?.role === "owner";

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setStaff(await api<StaffMember[]>("/api/staff"));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (isOwner) void load();
  }, [isOwner, load]);

  const replace = (m: StaffMember) => setStaff((list) => list.map((x) => (x.id === m.id ? m : x)));

  const act = async () => {
    if (!pending) return;
    const { kind, member } = pending;
    const body =
      kind === "reset" ? { action: "reset-password" } : kind === "disable" || kind === "enable" ? { action: kind } : { action: "set-role", role: kind };
    try {
      const data = await api<{ member: StaffMember; temporaryPassword?: string }>(`/api/staff/${member.id}`, { method: "PATCH", body: JSON.stringify(body) });
      replace(data.member);
      setPending(null);
      if (data.temporaryPassword) setNewPassword({ name: member.name, password: data.temporaryPassword });
      else showToast(kind === "disable" ? `${member.name}'s account is off` : kind === "enable" ? `${member.name} can sign in again` : `${member.name} is now ${kind === "owner" ? "an owner" : "a seller"}`, "success");
    } catch (e) {
      setPending(null);
      showToast(e instanceof Error ? e.message : "That didn't work. Try again.", "error");
    }
  };

  if (!isOwner) {
    return (
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7">
        <PageHeader eyebrow="Shop settings" title="Staff" />
        <EmptyState title="Only the owner manages staff">Ask the owner if someone needs to be added or their password reset.</EmptyState>
      </div>
    );
  }

  const confirm = pending ? CONFIRM[pending.kind](pending.member.name) : null;

  return (
    <div className="mv-stagger mx-auto grid max-w-4xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7">
      <PageHeader
        eyebrow="Shop settings"
        title="Staff"
        subtitle="People who can sign in. Only owners see this page."
        action={
          <Button icon={<UserPlus />} onClick={() => setAdding(true)}>
            Add person
          </Button>
        }
      />

      {status === "loading" && <SkeletonRows rows={3} label="Loading staff" />}
      {status === "error" && (
        <EmptyState compact title="Staff didn’t load" action={<Button variant="secondary" icon={<RotateCw />} onClick={load}>Try again</Button>}>
          The server could not be reached. Check that the app is running, then try again.
        </EmptyState>
      )}
      {status === "ready" && (
        <ul className="grid overflow-hidden rounded-lg border border-line bg-surface">
          {staff.map((m) => {
            const self = m.id === user?.id;
            return (
              <li key={m.id} className={cn("flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0", m.disabled && "bg-canvas")}>
                <span aria-hidden="true" className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-lg", m.disabled ? "bg-line text-muted" : "bg-tint text-primary")}>
                  {m.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("truncate font-semibold", m.disabled ? "text-muted" : "text-fg")}>{m.name}</span>
                    {self && <span className="text-sm text-muted">(you)</span>}
                    <span className={cn("rounded-full px-2 text-xs font-semibold", m.role === "owner" ? "bg-zari-tint text-zari" : "bg-tint text-primary")}>
                      {m.role === "owner" ? "Owner" : "Seller"}
                    </span>
                    {m.disabled && <span className="rounded-full bg-danger-tint px-2 text-xs font-semibold text-danger">Turned off</span>}
                    {!m.disabled && m.mustChangePassword && <span className="rounded-full bg-zari-tint px-2 text-xs font-semibold text-zari">New password pending</span>}
                  </span>
                  <span className="truncate text-sm tabular-nums text-muted">
                    {[formatPhone(m.phone), m.email].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {!self && (
                  <Menu
                    label={`Actions for ${m.name}`}
                    trigger={<MoreVertical aria-hidden="true" className="h-5 w-5" />}
                    triggerClassName="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted hover:bg-tint hover:text-primary"
                  >
                    {!m.disabled && (
                      <MenuItem icon={<KeyRound />} onSelect={() => setPending({ kind: "reset", member: m })}>
                        Reset password
                      </MenuItem>
                    )}
                    {!m.disabled &&
                      (m.role === "seller" ? (
                        <MenuItem icon={<ShieldCheck />} onSelect={() => setPending({ kind: "owner", member: m })}>
                          Make owner
                        </MenuItem>
                      ) : (
                        <MenuItem icon={<ShieldOff />} onSelect={() => setPending({ kind: "seller", member: m })}>
                          Make seller
                        </MenuItem>
                      ))}
                    {m.disabled ? (
                      <MenuItem icon={<Power />} onSelect={() => setPending({ kind: "enable", member: m })}>
                        Turn account on
                      </MenuItem>
                    ) : (
                      <MenuItem tone="danger" icon={<Power />} onSelect={() => setPending({ kind: "disable", member: m })}>
                        Turn account off
                      </MenuItem>
                    )}
                  </Menu>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddPersonDialog open={adding} onClose={() => setAdding(false)} onAdded={(m) => setStaff((list) => [...list, m])} />

      <ConfirmDialog
        open={!!pending}
        title={confirm?.title ?? ""}
        tone={confirm?.tone ?? "primary"}
        confirmLabel={confirm?.label ?? ""}
        onCancel={() => setPending(null)}
        onConfirm={act}
      >
        {confirm?.body}
      </ConfirmDialog>

      <Dialog open={!!newPassword} title="New temporary password" onClose={() => setNewPassword(null)} footer={<Button onClick={() => setNewPassword(null)}>Done</Button>}>
        {newPassword && <TemporaryPassword name={newPassword.name} password={newPassword.password} />}
      </Dialog>
    </div>
  );
}

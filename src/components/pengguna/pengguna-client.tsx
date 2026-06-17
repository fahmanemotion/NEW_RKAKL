"use client";
import * as React from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  Search,
  Loader2,
  ShieldCheck,
  Users,
  Inbox,
} from "lucide-react";
import { Card, Button, Input, Select, Badge } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase";
import {
  filterUsers,
  ALL_ROLES,
  canManageTarget,
  type UserRow,
} from "@/lib/pengguna-utils";
import {
  listUsersAction,
  createUserAction,
  updateUserAction,
  resetPasswordAction,
  deleteUserAction,
} from "@/app/(dashboard)/pengguna/actions";

interface Role {
  id: string;
  nama: string;
  deskripsi: string | null;
}
interface Satker {
  id: string;
  nama_satker: string;
  kode_satker: string;
}
interface CurrentUser {
  id: string;
  nama: string;
  email: string;
  role: string;
}

const ROLE_COLOR: Record<string, string> = {
  Administrator: "bg-blue-100 text-blue-800",
  Operator: "bg-emerald-100 text-emerald-800",
  Reviewer: "bg-amber-100 text-amber-800",
  Pimpinan: "bg-violet-100 text-violet-800",
};

export function PenggunaClient({
  isAdmin,
  currentUser,
  roles,
  satkers,
}: {
  isAdmin: boolean;
  currentUser: CurrentUser;
  roles: Role[];
  satkers: Satker[];
}) {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [q, setQ] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState(ALL_ROLES);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const filtered = React.useMemo(
    () => filterUsers(users, q, roleFilter),
    [users, q, roleFilter],
  );

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const res = await listUsersAction();
      if (res.ok) setUsers(res.users);
      else setLoadError(res.error);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Muat daftar pengguna di sisi klien (butuh service-role) — bila gagal,
  // tampilkan pesan, bukan merusak seluruh halaman.
  React.useEffect(() => {
    if (isAdmin) void refresh();
  }, [isAdmin, refresh]);

  // Dialog state
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [resetting, setResetting] = React.useState<UserRow | null>(null);
  const [myPwOpen, setMyPwOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Manajemen Pengguna</h1>
        <p className="text-sm text-muted-foreground">
          Kelola akun yang dapat mengakses aplikasi beserta peran (otoritas)
          masing-masing.
        </p>
      </div>

      {/* Akun Saya */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                {currentUser.nama || currentUser.email}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentUser.email}
                {currentUser.role && (
                  <Badge
                    className={`ml-2 ${ROLE_COLOR[currentUser.role] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {currentUser.role}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setMyPwOpen(true)}>
            <KeyRound className="size-4" /> Ubah Password Saya
          </Button>
        </div>
      </Card>

      {!isAdmin ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Hanya Administrator yang dapat mengelola daftar pengguna.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Daftar Pengguna</h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {filtered.length} akun
              </span>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" /> Tambah Pengguna
            </Button>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap items-end gap-2 border-b border-border bg-muted/40 p-3">
            <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-input bg-card px-2.5">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama, email, NIP, jabatan, satker…"
                className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 min-w-[150px] text-sm"
              >
                <option value={ALL_ROLES}>Semua Peran</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={refresh}
              disabled={refreshing}
              title="Muat ulang"
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Muat ulang"
              )}
            </Button>
          </div>

          {/* Tabel */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">Nama / Email</th>
                  <th className="px-3 py-2.5 font-semibold">NIP / Jabatan</th>
                  <th className="px-3 py-2.5 font-semibold">Peran</th>
                  <th className="px-3 py-2.5 font-semibold">Satker</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadError ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center">
                      <p className="mx-auto max-w-md rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        Gagal memuat daftar pengguna: {loadError}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-3"
                        onClick={refresh}
                      >
                        Coba lagi
                      </Button>
                    </td>
                  </tr>
                ) : refreshing && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center">
                      <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-12 text-center text-muted-foreground"
                    >
                      <Inbox className="mx-auto mb-2 size-6" />
                      Tidak ada pengguna ditemukan
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-border hover:bg-accent/40"
                      >
                        <td className="px-3 py-2.5 align-top">
                          <div className="font-medium">
                            {u.nama}
                            {isSelf && (
                              <span className="ml-1 text-[11px] text-muted-foreground">
                                (Anda)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.email}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div>{u.nip || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.jabatan || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <Badge
                            className={
                              ROLE_COLOR[u.roleName] ??
                              "bg-slate-100 text-slate-700"
                            }
                          >
                            {u.roleName}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 align-top text-xs">
                          {u.satkerNama}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setEditing(u)}
                              title="Ubah"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              onClick={() => setResetting(u)}
                              title="Setel ulang password"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-100 hover:text-amber-700"
                            >
                              <KeyRound className="size-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!canManageTarget(u.id, currentUser.id)) {
                                  alert(
                                    "Anda tidak dapat menghapus akun Anda sendiri.",
                                  );
                                  return;
                                }
                                if (
                                  !confirm(
                                    `Hapus akun "${u.nama}" (${u.email})? Tindakan ini permanen.`,
                                  )
                                )
                                  return;
                                try {
                                  const res = await deleteUserAction(u.id);
                                  if (!res.ok) {
                                    alert(res.error);
                                    return;
                                  }
                                  await refresh();
                                } catch (e) {
                                  alert((e as Error).message);
                                }
                              }}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "Tidak dapat menghapus akun sendiri"
                                  : "Hapus"
                              }
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border p-3 text-xs text-muted-foreground">
            Demi keamanan, akun yang sedang login tidak dapat menghapus atau
            mengubah perannya sendiri.
          </div>
        </Card>
      )}

      {/* Dialog: Akun Saya — ubah password */}
      <MyPasswordDialog open={myPwOpen} onClose={() => setMyPwOpen(false)} />

      {/* Dialog: Tambah */}
      <UserFormDialog
        open={addOpen}
        mode="add"
        roles={roles}
        satkers={satkers}
        onClose={() => setAddOpen(false)}
        onDone={async () => {
          setAddOpen(false);
          await refresh();
        }}
      />

      {/* Dialog: Edit */}
      <UserFormDialog
        open={!!editing}
        mode="edit"
        roles={roles}
        satkers={satkers}
        initial={editing ?? undefined}
        lockRole={editing?.id === currentUser.id}
        onClose={() => setEditing(null)}
        onDone={async () => {
          setEditing(null);
          await refresh();
        }}
      />

      {/* Dialog: Reset password */}
      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
        onDone={() => setResetting(null)}
      />
    </div>
  );
}

/* ── Dialog ubah password sendiri ─────────────────────────────────────────── */
function MyPasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setPw("");
      setPw2("");
      setErr(null);
      setDone(false);
    }
  }, [open]);

  async function submit() {
    if (pw.length < 6) return setErr("Password minimal 6 karakter.");
    if (pw !== pw2) return setErr("Konfirmasi password tidak sama.");
    setBusy(true);
    setErr(null);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ubah Password Saya"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {!done && (
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Simpan
            </Button>
          )}
        </>
      }
    >
      {done ? (
        <p className="text-sm text-emerald-600">Password berhasil diperbarui.</p>
      ) : (
        <div className="space-y-3">
          <Field label="Password Baru">
            <Input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="min. 6 karakter"
            />
          </Field>
          <Field label="Konfirmasi Password">
            <Input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}
    </Modal>
  );
}

/* ── Dialog tambah / ubah pengguna ─────────────────────────────────────────── */
function UserFormDialog({
  open,
  mode,
  roles,
  satkers,
  initial,
  lockRole,
  onClose,
  onDone,
}: {
  open: boolean;
  mode: "add" | "edit";
  roles: Role[];
  satkers: Satker[];
  initial?: UserRow;
  lockRole?: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [nama, setNama] = React.useState("");
  const [nip, setNip] = React.useState("");
  const [jabatan, setJabatan] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [satkerId, setSatkerId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setEmail("");
    setPassword("");
    setNama(initial?.nama && initial.nama !== initial.email ? initial.nama : "");
    setNip(initial?.nip ?? "");
    setJabatan(initial?.jabatan ?? "");
    setRoleId(initial?.roleId ?? "");
    setSatkerId(initial?.satkerId ?? "");
  }, [open, initial]);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      let res;
      if (mode === "add") {
        res = await createUserAction({
          email,
          password,
          nama,
          nip,
          jabatan,
          roleId,
          satkerId: satkerId || undefined,
        });
      } else if (initial) {
        res = await updateUserAction({
          id: initial.id,
          nama,
          nip,
          jabatan,
          roleId,
          satkerId: satkerId || undefined,
        });
      }
      if (res && !res.ok) {
        setErr(res.error);
        return;
      }
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Tambah Pengguna" : "Ubah Pengguna"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}{" "}
            {mode === "add" ? "Buat Akun" : "Simpan"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {mode === "add" && (
          <>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@instansi.go.id"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 6 karakter"
              />
            </Field>
          </>
        )}
        {mode === "edit" && (
          <p className="text-xs text-muted-foreground">{initial?.email}</p>
        )}
        <Field label="Nama Lengkap">
          <Input value={nama} onChange={(e) => setNama(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="NIP">
            <Input value={nip} onChange={(e) => setNip(e.target.value)} />
          </Field>
          <Field label="Jabatan">
            <Input
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peran (Otoritas)">
            <Select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={lockRole}
            >
              <option value="">— pilih —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama}
                </option>
              ))}
            </Select>
            {lockRole && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Peran akun sendiri tidak dapat diubah.
              </p>
            )}
          </Field>
          <Field label="Satker">
            <Select
              value={satkerId}
              onChange={(e) => setSatkerId(e.target.value)}
            >
              <option value="">— tanpa satker —</option>
              {satkers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.kode_satker} — {s.nama_satker}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {err && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ── Dialog setel ulang password pengguna lain ─────────────────────────────── */
function ResetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: UserRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pw, setPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    setPw("");
    setErr(null);
    setDone(false);
  }, [user]);

  async function submit() {
    if (!user) return;
    if (pw.length < 6) return setErr("Password minimal 6 karakter.");
    setBusy(true);
    setErr(null);
    try {
      const res = await resetPasswordAction(user.id, pw);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setDone(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Setel Ulang Password"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {!done && (
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Simpan
            </Button>
          )}
        </>
      }
    >
      {done ? (
        <p className="text-sm text-emerald-600">
          Password untuk {user?.email} berhasil disetel ulang.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            Setel password baru untuk <strong>{user?.nama}</strong> ({user?.email}
            ).
          </p>
          <Field label="Password Baru">
            <Input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="min. 6 karakter"
            />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

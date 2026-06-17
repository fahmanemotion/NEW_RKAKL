// SIPPT — util murni untuk Modul Pengguna (bebas framework & DB agar mudah diuji).
// Berisi: penggabungan data auth+profil, pencarian/filter, dan validasi form.

export interface AuthUserLite {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
}
export interface ProfileLite {
  id: string;
  nama: string | null;
  nip: string | null;
  jabatan: string | null;
  satker_id: string | null;
  role_id: string | null;
}
export interface RoleLite {
  id: string;
  nama: string;
}
export interface SatkerLite {
  id: string;
  nama_satker: string;
  kode_satker: string;
}

export interface UserRow {
  id: string;
  email: string;
  nama: string;
  nip: string;
  jabatan: string;
  roleId: string | null;
  roleName: string;
  satkerId: string | null;
  satkerNama: string;
  createdAt: string;
  lastSignInAt: string | null;
}

/**
 * Gabungkan daftar auth user + profil + peran + satker menjadi baris tampilan.
 * Sumber kebenaran daftar akun adalah auth user (kolom email ada di sana).
 */
export function mergeUsers(
  authUsers: AuthUserLite[],
  profiles: ProfileLite[],
  roles: RoleLite[],
  satkers: SatkerLite[],
): UserRow[] {
  const pById = new Map(profiles.map((p) => [p.id, p]));
  const rById = new Map(roles.map((r) => [r.id, r]));
  const sById = new Map(satkers.map((s) => [s.id, s]));

  return authUsers
    .map((u) => {
      const p = pById.get(u.id);
      const role = p?.role_id ? rById.get(p.role_id) : undefined;
      const satker = p?.satker_id ? sById.get(p.satker_id) : undefined;
      const email = u.email ?? "";
      return {
        id: u.id,
        email,
        nama: (p?.nama ?? "").trim() || email || "(tanpa nama)",
        nip: p?.nip ?? "",
        jabatan: p?.jabatan ?? "",
        roleId: p?.role_id ?? null,
        roleName: role?.nama ?? "—",
        satkerId: p?.satker_id ?? null,
        satkerNama: satker?.nama_satker ?? "—",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

export const ALL_ROLES = "__all__";

/** Filter berdasarkan kata kunci (email/nama/nip/jabatan/satker) & peran. */
export function filterUsers(
  rows: UserRow[],
  q: string,
  roleId: string,
): UserRow[] {
  const needle = (q || "").trim().toLowerCase();
  return rows.filter((r) => {
    if (roleId && roleId !== ALL_ROLES && r.roleId !== roleId) return false;
    if (!needle) return true;
    const hay =
      `${r.email} ${r.nama} ${r.nip} ${r.jabatan} ${r.satkerNama} ${r.roleName}`.toLowerCase();
    return hay.includes(needle);
  });
}

/** Validasi format email sederhana namun memadai. */
export function isValidEmail(e: string): boolean {
  const v = (e || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Validasi password; mengembalikan pesan error atau null bila valid. */
export function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 6) return "Password minimal 6 karakter.";
  return null;
}

export interface NewUserInput {
  email: string;
  password: string;
  nama: string;
  roleId: string;
  satkerId?: string;
}

/** Validasi form tambah pengguna. Mengembalikan pesan error atau null. */
export function validateNewUser(v: NewUserInput): string | null {
  if (!v.email?.trim()) return "Email wajib diisi.";
  if (!isValidEmail(v.email)) return "Format email tidak valid.";
  const pw = validatePassword(v.password);
  if (pw) return pw;
  if (!v.nama?.trim()) return "Nama wajib diisi.";
  if (!v.roleId?.trim()) return "Peran (role) wajib dipilih.";
  return null;
}

export interface EditUserInput {
  nama: string;
  roleId: string;
}

/** Validasi form ubah pengguna. */
export function validateEditUser(v: EditUserInput): string | null {
  if (!v.nama?.trim()) return "Nama wajib diisi.";
  if (!v.roleId?.trim()) return "Peran (role) wajib dipilih.";
  return null;
}

/**
 * Pengaman: akun yang sedang login tidak boleh menghapus / menurunkan
 * perannya sendiri (mencegah admin mengunci dirinya keluar).
 */
export function canManageTarget(
  targetId: string,
  currentUserId: string,
): boolean {
  return targetId !== currentUserId;
}

/** Apakah perubahan peran ini akan mengubah peran diri sendiri? */
export function isSelfRoleChange(
  targetId: string,
  currentUserId: string,
  currentRoleId: string | null,
  nextRoleId: string,
): boolean {
  return targetId === currentUserId && (currentRoleId ?? "") !== nextRoleId;
}

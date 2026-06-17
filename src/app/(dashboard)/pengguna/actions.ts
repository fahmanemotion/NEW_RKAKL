"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  mergeUsers,
  validateNewUser,
  validateEditUser,
  validatePassword,
  type UserRow,
} from "@/lib/pengguna-utils";

/** Pastikan pemanggil adalah Administrator. Mengembalikan user saat ini. */
async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "Administrator") {
    throw new Error("Hanya Administrator yang boleh mengelola pengguna.");
  }
  return user;
}

/** Daftar semua pengguna (gabungan auth + profil + peran + satker). */
export async function listUsersAction(): Promise<UserRow[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: list, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);

  const [{ data: profiles }, { data: roles }, { data: satkers }] =
    await Promise.all([
      admin
        .from("user_profiles")
        .select("id, nama, nip, jabatan, satker_id, role_id"),
      admin.from("roles").select("id, nama"),
      admin.from("master_satker").select("id, nama_satker, kode_satker"),
    ]);

  return mergeUsers(
    (list?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at ?? "",
      last_sign_in_at: u.last_sign_in_at ?? null,
    })),
    (profiles ?? []) as never[],
    (roles ?? []) as never[],
    (satkers ?? []) as never[],
  );
}

export interface CreateUserInput {
  email: string;
  password: string;
  nama: string;
  nip?: string;
  jabatan?: string;
  roleId: string;
  satkerId?: string;
}

/** Buat akun baru + lengkapi profil (peran & satker). */
export async function createUserAction(input: CreateUserInput): Promise<void> {
  await requireAdmin();
  const err = validateNewUser({
    email: input.email,
    password: input.password,
    nama: input.nama,
    roleId: input.roleId,
    satkerId: input.satkerId,
  });
  if (err) throw new Error(err);

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: { nama: input.nama.trim() },
  });
  if (error) throw new Error(error.message);
  const id = created.user?.id;
  if (!id) throw new Error("Gagal membuat akun.");

  // Trigger DB membuat baris profil; pakai upsert agar peran/satker pasti
  // tersimpan walau ada selisih waktu dengan trigger.
  const { error: upErr } = await admin.from("user_profiles").upsert(
    {
      id,
      nama: input.nama.trim(),
      nip: input.nip?.trim() || null,
      jabatan: input.jabatan?.trim() || null,
      role_id: input.roleId,
      satker_id: input.satkerId || null,
    },
    { onConflict: "id" },
  );
  if (upErr) {
    // Rollback akun bila pelengkapan profil gagal, agar tak ada akun setengah jadi.
    await admin.auth.admin.deleteUser(id);
    throw new Error("Gagal menyimpan profil: " + upErr.message);
  }

  revalidatePath("/pengguna");
}

export interface UpdateUserInput {
  id: string;
  nama: string;
  nip?: string;
  jabatan?: string;
  roleId: string;
  satkerId?: string;
}

/** Ubah profil & peran pengguna. */
export async function updateUserAction(input: UpdateUserInput): Promise<void> {
  const me = await requireAdmin();
  const err = validateEditUser({ nama: input.nama, roleId: input.roleId });
  if (err) throw new Error(err);

  const admin = createAdminClient();

  // Pengaman: admin tidak boleh menurunkan/mengubah perannya sendiri.
  if (input.id === me.id) {
    const { data: cur } = await admin
      .from("user_profiles")
      .select("role_id")
      .eq("id", me.id)
      .single();
    if (cur && (cur as { role_id: string | null }).role_id !== input.roleId) {
      throw new Error(
        "Anda tidak dapat mengubah peran akun Anda sendiri (mencegah kehilangan akses).",
      );
    }
  }

  const { error } = await admin
    .from("user_profiles")
    .update({
      nama: input.nama.trim(),
      nip: input.nip?.trim() || null,
      jabatan: input.jabatan?.trim() || null,
      role_id: input.roleId,
      satker_id: input.satkerId || null,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  revalidatePath("/pengguna");
}

/** Setel ulang password seorang pengguna. */
export async function resetPasswordAction(
  id: string,
  password: string,
): Promise<void> {
  await requireAdmin();
  const err = validatePassword(password);
  if (err) throw new Error(err);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
}

/** Hapus akun pengguna (profil ikut terhapus via cascade). */
export async function deleteUserAction(id: string): Promise<void> {
  const me = await requireAdmin();
  if (id === me.id) {
    throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath("/pengguna");
}

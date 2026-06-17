import {
  mergeUsers,
  filterUsers,
  isValidEmail,
  validatePassword,
  validateNewUser,
  validateEditUser,
  canManageTarget,
  isSelfRoleChange,
  ALL_ROLES,
} from "./src/lib/pengguna-utils.ts";

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m));
};

// ── Data contoh ─────────────────────────────────────────────────────────────
const roles = [
  { id: "r1", nama: "Administrator" },
  { id: "r2", nama: "Operator" },
];
const satkers = [
  { id: "s1", nama_satker: "PIP Makassar", kode_satker: "411234" },
];
const authUsers = [
  { id: "u1", email: "admin@pip.ac.id", created_at: "2025-01-01", last_sign_in_at: "2026-06-01" },
  { id: "u2", email: "operator@pip.ac.id", created_at: "2025-02-01", last_sign_in_at: null },
  { id: "u3", email: "kosong@pip.ac.id", created_at: "2025-03-01" }, // tanpa profil
];
const profiles = [
  { id: "u1", nama: "Andi Admin", nip: "1990", jabatan: "Kabag", satker_id: "s1", role_id: "r1" },
  { id: "u2", nama: "", nip: null, jabatan: null, satker_id: "s1", role_id: "r2" },
];

// ── mergeUsers ──────────────────────────────────────────────────────────────
console.log("mergeUsers:");
const rows = mergeUsers(authUsers, profiles, roles, satkers);
ok(rows.length === 3, "menggabungkan semua auth user (termasuk tanpa profil): " + rows.length);
const u1 = rows.find((r) => r.id === "u1");
ok(u1.nama === "Andi Admin" && u1.roleName === "Administrator" && u1.satkerNama === "PIP Makassar", "u1 nama/role/satker benar");
const u2 = rows.find((r) => r.id === "u2");
ok(u2.nama === "operator@pip.ac.id", "nama kosong → fallback ke email");
ok(u2.roleName === "Operator", "u2 role Operator");
const u3 = rows.find((r) => r.id === "u3");
ok(u3.roleName === "—" && u3.satkerNama === "—", "user tanpa profil → role/satker '—'");
ok(rows[0].nama.localeCompare(rows[1].nama) <= 0, "terurut menurut nama");

// ── filterUsers ─────────────────────────────────────────────────────────────
console.log("filterUsers:");
ok(filterUsers(rows, "andi", ALL_ROLES).length === 1, "cari 'andi' → 1");
ok(filterUsers(rows, "makassar", ALL_ROLES).length === 2, "cari 'makassar' (satker) → 2");
ok(filterUsers(rows, "", "r2").length === 1, "filter role Operator → 1");
ok(filterUsers(rows, "", ALL_ROLES).length === 3, "tanpa filter → semua");
ok(filterUsers(rows, "tidakada", ALL_ROLES).length === 0, "kata kunci tak cocok → 0");

// ── isValidEmail ────────────────────────────────────────────────────────────
console.log("isValidEmail:");
ok(isValidEmail("a@b.co"), "email valid");
ok(!isValidEmail("a@b"), "tanpa domain TLD → invalid");
ok(!isValidEmail("a b@c.com"), "ada spasi → invalid");
ok(!isValidEmail(""), "kosong → invalid");

// ── validatePassword ────────────────────────────────────────────────────────
console.log("validatePassword:");
ok(validatePassword("12345") !== null, "kurang dari 6 → error");
ok(validatePassword("123456") === null, "tepat 6 → valid");

// ── validateNewUser ─────────────────────────────────────────────────────────
console.log("validateNewUser:");
const base = { email: "x@y.com", password: "secret1", nama: "Budi", roleId: "r2" };
ok(validateNewUser(base) === null, "input lengkap → valid");
ok(/email/i.test(validateNewUser({ ...base, email: "" })), "email kosong → error");
ok(/valid/i.test(validateNewUser({ ...base, email: "bukan-email" })), "email salah → error");
ok(/password/i.test(validateNewUser({ ...base, password: "123" })), "password pendek → error");
ok(/nama/i.test(validateNewUser({ ...base, nama: "  " })), "nama kosong → error");
ok(/role|peran/i.test(validateNewUser({ ...base, roleId: "" })), "role kosong → error");

// ── validateEditUser ────────────────────────────────────────────────────────
console.log("validateEditUser:");
ok(validateEditUser({ nama: "Budi", roleId: "r2" }) === null, "edit valid");
ok(validateEditUser({ nama: "", roleId: "r2" }) !== null, "edit nama kosong → error");
ok(validateEditUser({ nama: "Budi", roleId: "" }) !== null, "edit role kosong → error");

// ── Pengaman diri sendiri ───────────────────────────────────────────────────
console.log("self-protection:");
ok(canManageTarget("u2", "u1") === true, "boleh kelola akun lain");
ok(canManageTarget("u1", "u1") === false, "tidak boleh kelola akun sendiri");
ok(isSelfRoleChange("u1", "u1", "r1", "r2") === true, "ubah role diri sendiri → terdeteksi");
ok(isSelfRoleChange("u1", "u1", "r1", "r1") === false, "role sama → bukan perubahan");
ok(isSelfRoleChange("u2", "u1", "r2", "r1") === false, "target bukan diri → bukan self-change");

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);

// Penggabungan presence: logika murni (tanpa React) agar dapat diuji/disimulasi.
// Dipakai oleh panel "Sedang mengakses" pada penganggaran.

export interface PresenceKro {
  id: string;
  kode: string;
  uraian: string;
}

export interface PresenceUser {
  userId: string;
  name: string;
  kros: PresenceKro[];
  self: boolean;
}

/** Meta yang disiarkan tiap koneksi presence (satu per tab/socket). */
export interface PresenceMeta {
  /** Id pengguna yang STABIL (kunci pengelompokan). */
  userId?: string;
  name?: string;
  kros?: PresenceKro[];
}

/**
 * Ubah hasil `channel.presenceState()` menjadi daftar pengguna untuk panel.
 *
 * PENTING soal KUNCI PRESENCE. Presence di-kunci UNIK per koneksi (bukan per
 * pengguna), agar reload/keluar-masuk tak menimbulkan tabrakan kunci: koneksi
 * lama yang "leave"-nya telat tak bisa lagi menghapus koneksi baru bermilik
 * pengguna sama. Konsekuensinya, `state` bisa memuat BEBERAPA entri untuk satu
 * pengguna (tab ganda, atau sisa koneksi sesaat setelah reload). Karena itu
 * pengelompokan memakai `meta.userId`, BUKAN kunci state.
 *
 * Seluruh koneksi milik satu pengguna DIGABUNG:
 *  - KRO = gabungan (union) semua koneksi, tanpa duplikat (kunci = id), urutan
 *    kemunculan dipertahankan → tab menganggur / sisa koneksi tak menghapus KRO;
 *  - nama = nama non-kosong pertama yang ditemukan.
 *
 * Fallback: bila `meta.userId` tidak ada (klien versi lama yang masih memakai
 * kunci = userId), kunci state dipakai sebagai userId agar tetap kompatibel.
 */
export function mergePresenceState(
  state: Record<string, PresenceMeta[]>,
  meId: string,
): PresenceUser[] {
  const byUser = new Map<string, { name: string; kros: PresenceKro[]; seen: Set<string> }>();

  for (const [stateKey, metas] of Object.entries(state)) {
    for (const m of metas ?? []) {
      const uid = m?.userId || stateKey; // fallback klien lama: kunci = userId
      if (!uid) continue;
      let e = byUser.get(uid);
      if (!e) {
        e = { name: "", kros: [], seen: new Set() };
        byUser.set(uid, e);
      }
      if (!e.name && m?.name) e.name = m.name.trim();
      for (const k of m?.kros ?? []) {
        if (k && k.id && !e.seen.has(k.id)) {
          e.seen.add(k.id);
          e.kros.push(k);
        }
      }
    }
  }

  const list: PresenceUser[] = [...byUser.entries()].map(([userId, e]) => ({
    userId,
    name: e.name || "Pengguna",
    kros: e.kros,
    self: userId === meId,
  }));
  // Diri sendiri di atas, sisanya urut nama.
  list.sort((a, b) =>
    a.self === b.self ? a.name.localeCompare(b.name, "id") : a.self ? -1 : 1,
  );
  return list;
}

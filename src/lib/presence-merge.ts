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
  name?: string;
  kros?: PresenceKro[];
}

/**
 * Ubah hasil `channel.presenceState()` menjadi daftar pengguna untuk panel.
 *
 * Satu pengguna dapat memiliki BEBERAPA koneksi (tab ganda, atau sisa koneksi
 * sesaat setelah refresh/reconnect sebelum server memproses "leave"). Tiap
 * koneksi membawa meta sendiri. Mengambil "meta terakhir" saja KELIRU: tab yang
 * menganggur (kros=[]) bisa menimpa tab yang sedang mengerjakan KRO, sehingga
 * KRO pengguna itu hilang atau berkedip di panel.
 *
 * Karena itu seluruh meta pengguna DIGABUNG:
 *  - KRO = gabungan (union) semua koneksi, tanpa duplikat (kunci = id), urutan
 *    kemunculan dipertahankan;
 *  - nama = nama non-kosong pertama yang ditemukan.
 */
export function mergePresenceState(
  state: Record<string, PresenceMeta[]>,
  meId: string,
): PresenceUser[] {
  const list: PresenceUser[] = Object.entries(state).map(([userId, metas]) => {
    const seen = new Set<string>();
    const kros: PresenceKro[] = [];
    let name = "";
    for (const m of metas ?? []) {
      if (!name && m?.name) name = m.name.trim();
      for (const k of m?.kros ?? []) {
        if (k && k.id && !seen.has(k.id)) {
          seen.add(k.id);
          kros.push(k);
        }
      }
    }
    return { userId, name: name || "Pengguna", kros, self: userId === meId };
  });
  // Diri sendiri di atas, sisanya urut nama.
  list.sort((a, b) =>
    a.self === b.self ? a.name.localeCompare(b.name, "id") : a.self ? -1 : 1,
  );
  return list;
}

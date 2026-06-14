import { create } from 'zustand';
import type { GridRow } from '@/lib/tree';

interface PenganggaranState {
  selectedId: string | null;
  selectedRow: GridRow | null;
  clipboard: GridRow | null;            // untuk Copy/Paste subtree
  select: (row: GridRow | null) => void;
  copy: (row: GridRow) => void;
  clearClipboard: () => void;
}

export const usePenganggaran = create<PenganggaranState>((set) => ({
  selectedId: null,
  selectedRow: null,
  clipboard: null,
  select: (row) =>
    set((s) => (s.selectedId === row?.id
      ? { selectedId: null, selectedRow: null }   // klik ulang = batal pilih
      : { selectedId: row?.id ?? null, selectedRow: row })),
  copy: (row) => set({ clipboard: row }),
  clearClipboard: () => set({ clipboard: null }),
}));

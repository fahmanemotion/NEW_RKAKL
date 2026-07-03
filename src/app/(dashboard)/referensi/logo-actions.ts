'use server';
import { invalidateSatkerLogo } from '@/lib/satker-logo';

/**
 * Dipanggil dari pengelola Satker setelah logo diubah, agar cache logo (yang
 * dipakai di topnav lewat getSatkerLogo) langsung diperbarui — tidak menunggu
 * masa kedaluwarsa cache.
 */
export async function revalidateSatkerLogoAction(satkerId: string): Promise<void> {
  await invalidateSatkerLogo(satkerId);
}

import type { RoleName } from '@/lib/constants';
import {
  LayoutDashboard, FileSpreadsheet, ClipboardCheck, LineChart,
  Database, Users, FileText, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: RoleName[]; // peran yang boleh melihat
}

export const NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard, roles: ['Administrator', 'Operator', 'Reviewer', 'Pimpinan'] },
  { label: 'Penganggaran', href: '/penganggaran', icon: FileSpreadsheet, roles: ['Administrator', 'Operator'] },
  { label: 'Review',       href: '/review',       icon: ClipboardCheck,  roles: ['Administrator', 'Reviewer'] },
  { label: 'Monitoring',   href: '/monitoring',   icon: LineChart,       roles: ['Administrator', 'Pimpinan'] },
  { label: 'Referensi',    href: '/referensi',    icon: Database,        roles: ['Administrator'] },
  { label: 'Pengguna',     href: '/pengguna',     icon: Users,           roles: ['Administrator'] },
  { label: 'Laporan',      href: '/laporan',      icon: FileText,        roles: ['Administrator', 'Pimpinan'] },
];

export function navForRole(role: RoleName | null): NavItem[] {
  if (!role) return NAV.filter((n) => n.href === '/dashboard');
  return NAV.filter((n) => n.roles.includes(role));
}

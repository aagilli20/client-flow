import { BarChart3, LayoutDashboard, Share2, UserCheck, Users } from 'lucide-react';

export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Inicio', href: '/dashboard' },
  { icon: Users, label: 'Prospectos', href: '/prospects' },
  { icon: UserCheck, label: 'Equipo', href: '/onboarding' },
  { icon: Share2, label: 'Social', href: '/social' },
  { icon: BarChart3, label: 'Mes', href: '/month' },
] as const;
